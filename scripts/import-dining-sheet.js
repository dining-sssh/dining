#!/usr/bin/env node
/**
 * Turns one session sheet of "Dining Data.xlsx" into SQL files for the Supabase SQL Editor.
 *
 *   node scripts/import-dining-sheet.js "Dining Data.xlsx" 2026-27
 *   node scripts/import-dining-sheet.js "Dining Data.xlsx" 2025-26 supabase/imports/2025-2026
 *
 * Layout of the sheet (the same for every session):
 *   row 1  : a date (1st of the month) above the "Eaten" column of every month block
 *   row 2  : headers
 *   row 3+ : one student per row, A..F = EN. ID, HOUSE, R.NO., NAME, COURSE, REMARK
 *   then for each month: one column per day (1 = ate, blank = did not eat, CLOSE / ssday = hall closed),
 *   Eaten, SLIP NO., SLIP DATE, PAID.
 *
 * What is written (run the files in this order in the SQL Editor, after supabase/schema.sql):
 *   01_students.sql          students (the e-mail of an existing student is never changed)
 *   02_closed_days.sql       days the whole hall was closed
 *   03_requests_NN.sql       approved off / on requests that reproduce the blank days
 *   04_slips_NN.sql          every payment (slip, online or adjustment)
 *   05_extensions_NN.sql     applied grace extensions where the sheet shows more than -3 days eaten
 * All ids are fixed, so running a file twice does nothing the second time.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const [, , fileArg, sheetArg, outArg] = process.argv;
if (!fileArg || !sheetArg) {
  console.error('Usage: node scripts/import-dining-sheet.js <file.xlsx> <sheet e.g. 2026-27> [outDir]');
  process.exit(1);
}
const m = /^(\d{4})-(\d{2}|\d{4})$/.exec(sheetArg.trim());
if (!m) {
  console.error('Sheet name must look like 2026-27');
  process.exit(1);
}
const startYear = Number(m[1]);
const SESSION = `${startYear}-${startYear + 1}`;
const CODE = `${String(startYear).slice(2)}${String(startYear + 1).slice(2)}`; // 2627
const outDir = path.resolve(ROOT, outArg || path.join('supabase', 'imports', SESSION));
const REASON = `From attendance sheet (${sheetArg})`;
const EXT_NOTE = 'Imported: ate beyond -3 in the sheet';
const CHUNK = 800;

/* ------------------------------ engine (same code as the app) ------------------------------ */
const engineSrc = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'diningEngine.ts'), 'utf8');
const engineJs = ts.transpileModule(engineSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }
}).outputText;
const engineModule = { exports: {} };
new Function('module', 'exports', 'require', engineJs)(engineModule, engineModule.exports, require);
const { simulateAccount, addDaysKey } = engineModule.exports;

/* ------------------------------------- helpers ------------------------------------- */
const pad = (n) => String(n).padStart(2, '0');
const serialToKey = (serial) => {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const daysInMonth = (y, mo) => new Date(Date.UTC(y, mo, 0)).getUTCDate();
const sq = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const MONTH_NAME = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOUSES = { JK: 'JK', AK: 'AK', BH: 'BH', MB: 'MB', HM: 'HM', KH: 'KH', QH: 'QH' };
const warnings = [];
const warn = (msg) => warnings.push(msg);

function parseDateText(text) {
  const t = String(text).trim();
  const x = /^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/.exec(t);
  if (!x) return null;
  let [, d, mo, y] = x.map(Number);
  if (y < 100) y += 2000;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** Date of a slip from the sheet: a serial, text like "27/10/2026 28.10.26" (earliest date wins), or just a day number. */
function readSlipDate(v, b, label) {
  const first = `${b.ym}-01`;
  if (typeof v === 'number' && v > 40000) return serialToKey(v);
  const raw = v === undefined || v === null ? '' : String(v).trim();
  const found = (raw.match(/\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}/g) || []).map(parseDateText).filter(Boolean).sort();
  if (found.length) return found[0];
  const day = /^\d{1,2}/.exec(raw);
  if (day && Number(day[0]) >= 1 && Number(day[0]) <= b.n) {
    warn(`${label} ${b.ym}: slip date "${raw}" read as day ${Number(day[0])} of the month`);
    return `${b.ym}-${pad(Number(day[0]))}`;
  }
  warn(`${label} ${b.ym}: slip date missing or unreadable ("${raw}"), used ${first}`);
  return first;
}
/**
 * In the sheet the house codes were replaced inside names too ("KHAN" became "K.H.AN", "AHMAD" became "AH.M.AD").
 * Remove those dots again. Only a house pair that touches a letter is repaired.
 */
const PAIR = 'J\\.K|A\\.K|B\\.H|M\\.B|H\\.M|K\\.H|Q\\.H';
const BROKEN_NAME = new RegExp(`(?:(?<=[A-Z])(?:${PAIR})\\.?|(?:${PAIR})\\.?(?=[A-Z]))`, 'g');
const repairName = (name) => name.replace(BROKEN_NAME, (x) => x.replace(/\./g, ''));
const repairedNames = [];
/* -------------------------------------- read -------------------------------------- */
const wb = XLSX.readFile(path.resolve(fileArg));
const ws = wb.Sheets[sheetArg];
if (!ws) {
  console.error(`Sheet "${sheetArg}" not found. Sheets: ${wb.SheetNames.join(', ')}`);
  process.exit(1);
}
const range = XLSX.utils.decode_range(ws['!ref']);
const cell = (r, c) => {
  const a = ws[XLSX.utils.encode_cell({ r, c })];
  return a ? a.v : undefined;
};
const text = (v) => (v === undefined || v === null ? '' : String(v).trim());

// Month blocks: a date in row 1 marks the "Eaten" column.
const blocks = [];
for (let c = 6; c <= range.e.c; c++) {
  const v = cell(0, c);
  if (typeof v === 'number' && v > 40000) {
    const key = serialToKey(v);
    const y = Number(key.slice(0, 4));
    const mo = Number(key.slice(5, 7));
    const n = daysInMonth(y, mo);
    blocks.push({ y, mo, n, ym: key.slice(0, 7), day1: c - n, eaten: c, slip: c + 1, date: c + 2, paid: c + 3 });
  }
}
if (!blocks.length) {
  console.error('No month blocks found (row 1 needs a date above each "Eaten" column).');
  process.exit(1);
}
console.log(`Sheet ${sheetArg}: ${blocks.map((b) => b.ym).join(', ')}`);

const students = [];
const seen = new Set();
const closedDays = new Map(); // date -> reason
const outliers = [];
for (let r = 2; r <= range.e.r; r++) {
  const enr = text(cell(r, 0)).toUpperCase();
  if (!enr || !text(cell(r, 3))) continue; // totals row or blank row
  if (seen.has(enr)) {
    warn(`Row ${r + 1}: ${enr} appears twice, the later row is skipped`);
    continue;
  }
  seen.add(enr);
  const houseRaw = text(cell(r, 1)).replace(/[^A-Za-z]/g, '').toUpperCase();
  if (!HOUSES[houseRaw]) warn(`Row ${r + 1}: unknown house "${text(cell(r, 1))}" for ${enr}`);
  const st = {
    row: r + 1,
    enr,
    house: HOUSES[houseRaw] || houseRaw,
    room: text(cell(r, 2)),
    name: repairName(text(cell(r, 3)).replace(/\s+/g, ' ')),
    course: text(cell(r, 4)).replace(/\.+$/, ''),
    remarks: [],
    ate: new Set(),
    marked: new Set(), // days with CLOSE / ssday in this student's own row
    sheetMonthCount: new Map(),
    sheetEatenTotals: new Map(),
    slips: []
  };
  if (st.name !== text(cell(r, 3)).replace(/\s+/g, ' ')) repairedNames.push(`Row ${r + 1}: ${text(cell(r, 3))} -> ${st.name}`);
  const remark = text(cell(r, 5));
  if (remark) st.remarks.push(remark);

  for (const b of blocks) {
    let count = 0;
    for (let i = 0; i < b.n; i++) {
      const v = cell(r, b.day1 + i);
      if (v === undefined || v === null || text(v) === '') continue;
      const day = `${b.ym}-${pad(i + 1)}`;
      if (typeof v === 'number') {
        if (v === 0) continue;
        if (v !== 1) warn(`Row ${r + 1} ${enr} ${day}: value ${v} treated as 1`);
        st.ate.add(day);
        count++;
        continue;
      }
      const s = text(v);
      if (/^close/i.test(s)) {
        closedDays.set(day, closedDays.get(day) || 'Hall closed');
        st.marked.add(day);
      } else if (/^ssday/i.test(s)) {
        closedDays.set(day, 'Sir Syed Day');
        st.marked.add(day);
      } else if (/^1$/.test(s)) {
        st.ate.add(day);
        count++;
      } else {
        warn(`Row ${r + 1} ${enr} ${day}: unknown value "${s}" ignored`);
      }
    }
    st.sheetMonthCount.set(b.ym, count);
    const total = cell(r, b.eaten);
    if (typeof total === 'number') st.sheetEatenTotals.set(b.ym, total);

    // payment of this month
    const slipText = text(cell(r, b.slip)).replace(/\s+/g, ' ');
    const dateCell = cell(r, b.date);
    const paidRaw = cell(r, b.paid);
    const paidNum = typeof paidRaw === 'number' ? paidRaw : Number(text(paidRaw).replace(/[^\d.\-]/g, '')) || 0;
    const paid = Math.round(paidNum * 100) / 100; // saved to the paisa, like the database column
    if (paid === 0 && !slipText) continue;
    if (paid <= 0) {
      // nothing was paid (or money was moved to another student): keep it as a remark
      const amount = paid < 0 ? ` (Rs ${paid})` : '';
      st.remarks.push(`${MONTH_NAME[b.mo]} ${b.y}: ${slipText}${amount}`);
      if (paid < 0) warn(`Row ${r + 1} ${enr} ${b.ym}: negative amount ${paid} ("${slipText}") kept as a remark only`);
      continue;
    }
    const paidOn = readSlipDate(dateCell, b, `Row ${r + 1} ${enr}`);
    const tag = `${enr}-${b.ym.replace('-', '')}`;
    const numbers = (slipText.match(/\d+\/[\d.]+/g) || []).map((n) => n.replace(/\s+/g, ''));
    const hasWords = /[A-Za-z]/.test(slipText);
    let mode = 'slip';
    let slipNo;
    let note = null;
    if (!slipText) {
      mode = 'adjustment';
      slipNo = `ADJ-${tag}`;
      note = 'No slip number in sheet';
    } else if (/^\d+$/.test(slipText)) {
      slipNo = slipText;
    } else if (numbers.length && !hasWords) {
      slipNo = numbers.join(' + ');
      if (numbers.length > 1) {
        note = `Sheet shows ${numbers.length} slips with one total amount: ${slipText}`;
        warn(`Row ${r + 1} ${enr} ${b.ym}: ${numbers.length} slips in one cell ("${slipText}", Rs ${paid}), saved as one payment`);
      }
    } else if (/online/i.test(slipText)) {
      mode = 'online';
      slipNo = numbers.length ? numbers.join(' + ') : `ONL-${tag}`;
      note = slipText;
    } else {
      mode = 'adjustment';
      slipNo = numbers.length ? numbers.join(' + ') : `ADJ-${tag}`;
      note = slipText;
    }
    if (st.slips.some((q) => q.slip_no === slipNo)) slipNo = `${slipNo}-${b.ym.replace('-', '')}`;
    st.slips.push({ id: `slip-${CODE}-${tag}`, slip_no: slipNo, mode, note, amount: paid, paid_on: paidOn, ym: b.ym });
  }
  students.push(st);
}
console.log(`Students read: ${students.length}, hall-closed days: ${[...closedDays.keys()].sort().join(', ') || 'none'}`);

/* ------------------------------ attendance -> requests ------------------------------ */
let dataEnd = '';
students.forEach((s) => s.ate.forEach((d) => (dataEnd = d > dataEnd ? d : dataEnd)));
if (!dataEnd) {
  console.error('No attendance found in the sheet.');
  process.exit(1);
}
const noDataStart = addDaysKey(dataEnd, 1);
console.log(`Attendance ends on ${dataEnd}`);

for (const s of students) {
  s.requests = [];
  const first = [...s.ate, ...s.marked].sort()[0];
  if (!s.ate.size) {
    s.dining_from = noDataStart;
    continue;
  }
  s.dining_from = first;
  let isOff = false;
  for (let d = first; d <= dataEnd; d = addDaysKey(d, 1)) {
    if (closedDays.has(d)) continue; // hall closed for everyone: says nothing about this student
    const ate = s.ate.has(d);
    if (!ate && !isOff) {
      isOff = true;
      s.requests.push({ id: `req-${CODE}-${s.enr}-${d}-off`, kind: 'off', start_date: d });
    } else if (ate && isOff) {
      isOff = false;
      s.requests.push({ id: `req-${CODE}-${s.enr}-${d}-on`, kind: 'on', start_date: d });
    }
  }
}

/* ---------------------------- simulate and add extensions ---------------------------- */
const asRequests = (s) =>
  s.requests.map((q) => ({
    id: q.id,
    student_id: s.enr,
    enrollment_no: s.enr,
    student_name: s.name,
    kind: q.kind,
    start_date: q.start_date,
    reason: REASON,
    status: 'approved',
    created_at: `${q.start_date}T00:00:00Z`
  }));
const asSlips = (s) =>
  s.slips.map((p) => ({
    id: p.id,
    student_id: s.enr,
    enrollment_no: s.enr,
    book_no: '1',
    slip_no: p.slip_no,
    amount: p.amount,
    paid_on: p.paid_on,
    mode: p.mode
  }));
const run = (s) =>
  simulateAccount({
    student: { dining_from: s.dining_from },
    requests: asRequests(s),
    slips: asSlips(s),
    extensions: (s.extensions || []).map((e, i) => ({
      id: e.id,
      student_id: s.enr,
      enrollment_no: s.enr,
      student_name: s.name,
      extra_days: e.extra_days,
      status: 'applied',
      applied_at: e.applied_at,
      created_at: `${e.applied_at}T00:00:00Z`
    })),
    entries: [],
    closedDates: closedDays.keys(),
    todayKey: dataEnd
  });
const firstMismatch = (s, state) => {
  for (const d of [...s.ate].sort()) {
    const info = state.days.get(d);
    if (!info) continue;
    if (info.kind === 'stopped') return { d, why: 'stopped' };
    if (info.kind === 'closed') return { d, why: 'closed' };
    if (info.kind !== 'eaten' && info.kind !== 'deficit') return { d, why: info.kind };
  }
  return null;
};

let stoppedStudents = 0;
let extensionRows = 0;
const eatenOnClosed = [];
for (const s of students) {
  s.extensions = [];
  const skip = new Set();
  for (let guard = 0; guard < 400; guard++) {
    const state = run(s);
    const mm = [...s.ate]
      .sort()
      .map((d) => ({ d, info: state.days.get(d) }))
      .find((x) => x.info && !['eaten', 'deficit'].includes(x.info.kind) && !skip.has(x.d));
    if (!mm) break;
    if (mm.info.kind !== 'stopped') {
      skip.add(mm.d);
      if (mm.info.kind === 'closed') eatenOnClosed.push(`${s.enr} ${mm.d}`);
      else warn(`${s.enr} ${mm.d}: sheet says ate but the engine says ${mm.info.kind}`);
      continue;
    }
    const last = s.extensions[s.extensions.length - 1];
    const slipBetween = last && s.slips.some((p) => p.paid_on > last.applied_at && p.paid_on <= mm.d);
    if (last && !slipBetween && last.extra_days < 30) last.extra_days += 1;
    else s.extensions.push({ id: `ext-${CODE}-${s.enr}-${s.extensions.length + 1}`, applied_at: mm.d, extra_days: 1 });
  }
  if (s.extensions.length) {
    stoppedStudents++;
    extensionRows += s.extensions.length;
  }
}

/* ---------------------------------- verification ---------------------------------- */
const mismatches = [];
const totalMismatches = [];
let verifiedStudents = 0;
for (const s of students) {
  const state = run(s);
  let bad = false;
  for (const b of blocks) {
    const mo = state.months.get(b.ym);
    const got = mo ? mo.eatenDays : 0;
    const want = s.sheetMonthCount.get(b.ym) || 0;
    // only compare days up to the end of the data
    if (got !== want) {
      bad = true;
      mismatches.push(`${s.enr} ${b.ym}: sheet ${want} days, app ${got}`);
    }
    const t = s.sheetEatenTotals.get(b.ym);
    if (t !== undefined && t !== want) totalMismatches.push(`${s.enr} (row ${s.row}) ${b.ym}: Eaten column says ${t}, days marked = ${want}`);
  }
  if (!bad) verifiedStudents++;
}

/* ------------------------------------- write SQL ------------------------------------- */
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) if (/^0\d_.*\.sql$/.test(f)) fs.unlinkSync(path.join(outDir, f));
const written = [];
const write = (name, body) => {
  fs.writeFileSync(path.join(outDir, name), body, 'utf8');
  written.push(name);
};
const head = (what) => `-- ${what}\n-- Generated by scripts/import-dining-sheet.js from sheet ${sheetArg}. Safe to run twice.\n\n`;
function chunked(prefix, rows, build) {
  if (!rows.length) return;
  const parts = Math.ceil(rows.length / CHUNK);
  for (let i = 0; i < parts; i++) {
    const slice = rows.slice(i * CHUNK, (i + 1) * CHUNK);
    const name = parts === 1 ? `${prefix}.sql` : `${prefix}_${pad(i + 1)}of${pad(parts)}.sql`;
    write(name, build(slice));
  }
}

// 1. students
write(
  '01_students.sql',
  head(`Students of session ${SESSION} (${students.length} rows). E-mail of an existing student is kept.`) +
    `insert into public.students (enrollment_no, name, house, room_no, course, email, remarks, session, status, dining_from)\nvalues\n` +
    students
      .map(
        (s) =>
          `  (${sq(s.enr)}, ${sq(s.name)}, ${sq(s.house)}, ${sq(s.room || '-')}, ${sq(s.course || '-')}, ${sq(
            s.enr.toLowerCase() + '@myamu.ac.in'
          )}, ${sq(s.remarks.join(' | ') || null)}, ${sq(SESSION)}, 'active', ${sq(s.dining_from)})`
      )
      .join(',\n') +
    `\non conflict (enrollment_no) do update set\n  name = excluded.name, house = excluded.house, room_no = excluded.room_no,\n  course = excluded.course, remarks = excluded.remarks, session = excluded.session,\n  dining_from = excluded.dining_from;\n`
);

// 2. closed days
if (closedDays.size) {
  write(
    '02_closed_days.sql',
    head('Days the whole hall was closed') +
      `insert into public.hall_closed_days (day, reason) values\n` +
      [...closedDays.entries()]
        .sort()
        .map(([d, why]) => `  (${sq(d)}, ${sq(why)})`)
        .join(',\n') +
      `\non conflict (day) do update set reason = excluded.reason;\n`
  );
}

// 3. requests
const allRequests = [];
students.forEach((s) => s.requests.forEach((q) => allRequests.push({ s, q })));
chunked('03_requests', allRequests, (slice) =>
  head(`Approved off / on requests (${slice.length} rows in this file)`) +
  `insert into public.rebate_requests (id, student_id, enrollment_no, student_name, kind, start_date, reason, status, reviewed_at)\n` +
  `select v.id, s.id, s.enrollment_no, s.name, v.kind, v.start_date::date, ${sq(REASON)}, 'approved', now()\n` +
  `from (values\n` +
  slice.map(({ s, q }) => `  (${sq(q.id)}, ${sq(s.enr)}, ${sq(q.kind)}, ${sq(q.start_date)})`).join(',\n') +
  `\n) as v(id, enr, kind, start_date)\njoin public.students s on s.enrollment_no = v.enr\non conflict (id) do nothing;\n`
);

// 4. slips
const allSlips = [];
students.forEach((s) => s.slips.forEach((p) => allSlips.push({ s, p })));
chunked('04_slips', allSlips, (slice) =>
  head(`Payments (${slice.length} rows in this file)`) +
  `insert into public.payment_slips (id, student_id, enrollment_no, book_no, slip_no, amount, paid_on, mode, note, cashier)\n` +
  `select v.id, s.id, s.enrollment_no, '1', v.slip_no, v.amount::numeric, v.paid_on::date, v.mode, v.note, null\n` +
  `from (values\n` +
  slice
    .map(({ s, p }) => `  (${sq(p.id)}, ${sq(s.enr)}, ${sq(p.slip_no)}, ${p.amount}, ${sq(p.paid_on)}, ${sq(p.mode)}, ${sq(p.note)})`)
    .join(',\n') +
  `\n) as v(id, enr, slip_no, amount, paid_on, mode, note)\njoin public.students s on s.enrollment_no = v.enr\non conflict (id) do nothing;\n`
);

// 5. extensions
const allExt = [];
students.forEach((s) => s.extensions.forEach((e) => allExt.push({ s, e })));
chunked('05_extensions', allExt, (slice) =>
  head(`Applied grace extensions (${slice.length} rows in this file)`) +
  `insert into public.grace_extensions (id, student_id, enrollment_no, student_name, extra_days, note, status, approved_by, applied_at)\n` +
  `select v.id, s.id, s.enrollment_no, s.name, v.extra_days, ${sq(EXT_NOTE)}, 'applied', 'Imported', v.applied_at::date\n` +
  `from (values\n` +
  slice.map(({ s, e }) => `  (${sq(e.id)}, ${sq(s.enr)}, ${e.extra_days}, ${sq(e.applied_at)})`).join(',\n') +
  `\n) as v(id, enr, extra_days, applied_at)\njoin public.students s on s.enrollment_no = v.enr\non conflict (id) do nothing;\n`
);

/* -------------------------------------- report -------------------------------------- */
const modeCount = allSlips.reduce((a, { p }) => ((a[p.mode] = (a[p.mode] || 0) + 1), a), {});
const dupSlip = new Map();
allSlips.forEach(({ p }) => dupSlip.set(p.slip_no, (dupSlip.get(p.slip_no) || 0) + 1));
const duplicates = [...dupSlip.entries()].filter(([, n]) => n > 1);
const report = [
  `Session ${SESSION}`,
  `Students: ${students.length} (without attendance: ${students.filter((s) => !s.ate.size).length})`,
  `Hall closed days: ${[...closedDays.entries()].sort().map(([d, w]) => `${d} ${w}`).join('; ') || 'none'}`,
  `Attendance ends: ${dataEnd}`,
  `Requests: ${allRequests.length}`,
  `Payments: ${allSlips.length} ${JSON.stringify(modeCount)}, total Rs ${allSlips.reduce((a, { p }) => a + p.amount, 0)}`,
  `Slip numbers used more than once: ${duplicates.length}`,
  `Students needing grace extensions: ${stoppedStudents} (${extensionRows} rows)`,
  `Students whose monthly eaten days match the sheet exactly: ${verifiedStudents} / ${students.length}`,
  `Eaten on a hall-closed day (counted as closed): ${eatenOnClosed.length}`,
  '',
  `Month mismatches (sheet days vs app): ${mismatches.length}`,
  ...mismatches.map((x) => '  ' + x),
  '',
  `Sheet "Eaten" column differs from the marked days: ${totalMismatches.length}`,
  ...totalMismatches.map((x) => '  ' + x),
  '',
  `Names repaired (house-code dots removed): ${repairedNames.length}`,
  ...repairedNames.map((x) => '  ' + x),
  '',
  `Warnings: ${warnings.length}`,
  ...warnings.map((x) => '  ' + x),
  '',
  `Eaten on closed day:`,
  ...eatenOnClosed.map((x) => '  ' + x),
  '',
  `Files: ${written.join(', ')}`
].join('\n');
fs.writeFileSync(path.join(outDir, 'REPORT.txt'), report, 'utf8');
console.log(report.split('\n').slice(0, 12).join('\n'));
console.log(`\nFull report: ${path.join(outDir, 'REPORT.txt')}\nFiles written to ${outDir}`);
