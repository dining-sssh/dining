#!/usr/bin/env node
/**
 * import-old-deficit.js
 *
 * Reads deficit Excel files from "dining old data/" and generates SQL files
 * to insert `deficit_entries` rows into Supabase.
 *
 * Usage:
 *   node scripts/import-old-deficit.js [outDir]
 *
 * Files processed:
 *   dining old data/23-24_deficit.xlsx  → session 2023-2024
 *   dining old data/24-25_deficit.xlsx  → session 2024-2025
 *   dining old data/25-26_deficit.xlsx  → session 2025-2026
 *
 * Rules:
 *   - Each month with amount > 0 becomes one `deficit_entries` row
 *     with month_key = 'YYYY-MM'
 *   - Ramzan (if present) becomes a row with month_key = 'YYYY-ramzan'
 *     NOTE: month_key check in schema is '^\d{4}-(0[1-9]|1[0-2])$' so we
 *     need to add a column override or store it as a note; see below.
 *   - Only PENDING > 0 entries are written (already-paid deficits are skipped
 *     because the slip already accounts for them).
 *   - Actually we import ALL per-month amounts > 0 and mark them settled=false
 *     initially; then the existing payment_slips handle the "paid" part via
 *     settled_months on slips. The Munshi can mark them settled manually.
 *   - If student is not found in the students table the row is skipped
 *     (a warning is printed).
 *
 * Output:
 *   supabase/imports/deficit/01_deficit_2023-2024.sql
 *   supabase/imports/deficit/02_deficit_2024-2025.sql
 *   supabase/imports/deficit/03_deficit_2025-2026.sql
 *   REPORT.txt
 *
 * Run each file in Supabase SQL Editor (after students exist in the DB).
 * Files are idempotent: running twice does nothing (ON CONFLICT DO NOTHING).
 */

const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT   = path.resolve(__dirname, '..');
const outArg = process.argv[2];
const OUT    = path.resolve(ROOT, outArg || path.join('supabase', 'imports', 'deficit'));

fs.mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------ helpers */

const pad = (n) => String(n).padStart(2, '0');
const sq  = (v) => v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const gen = (prefix, enr, mk) =>
  `${prefix}-${enr.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${mk.replace(/[^0-9a-z]/gi, '')}`;

/** Parse a "Mon-YY" or "Mon-YYYY" column header → 'YYYY-MM' or null */
function parseMonthHeader(h) {
  if (!h) return null;
  const s = String(h).trim();
  // "Aug-23" / "Sep-24" / "Aug-25" etc.
  const m = /^([A-Za-z]{3})-(\d{2,4})$/.exec(s);
  if (!m) return null;
  const months = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
  const mo = months[m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()];
  if (!mo) return null;
  let yr = Number(m[2]);
  if (yr < 100) yr += 2000;
  return `${yr}-${pad(mo)}`;
}

/** Normalize house abbreviations from the Excel to DB codes */
const HOUSE_MAP = {
  'J.K.': 'JK', 'JK': 'JK',
  'A.K.': 'AK', 'AK': 'AK',
  'B.H.': 'BH', 'BH': 'BH',
  'M.B.': 'MB', 'MB': 'MB',
  'H.M.': 'HM', 'HM': 'HM',
  'K.H.': 'KH', 'KH': 'KH',
  'Q.H.': 'QH', 'QH': 'QH',
};

/* ------------------------------------------------------------------ config */

const FILES = [
  {
    file: 'dining old data/23-24_deficit.xlsx',
    session: '2023-2024',
    label: '23-24',
    // column layout: EN.ID, HOUSE, R.No., Column2, NAME, CLASS, RMRK, ...junk..., Aug-23 ... May-24, Jun-24, ramzan, Total, Paid, Pending
    enIdx: 0, houseIdx: 1, nameIdx: 4,
    // month columns are detected automatically from the header
  },
  {
    file: 'dining old data/24-25_deficit.xlsx',
    session: '2024-2025',
    label: '24-25',
    enIdx: 0, houseIdx: 1, nameIdx: 3,
  },
  {
    file: 'dining old data/25-26_deficit.xlsx',
    session: '2025-2026',
    label: '25-26',
    enIdx: 0, houseIdx: 1, nameIdx: 3,
  },
];

/* ------------------------------------------------------------------ process */

const report = [];
const written = [];

FILES.forEach(({ file, session, label, enIdx, houseIdx, nameIdx }) => {
  const filePath = path.resolve(ROOT, file);
  if (!fs.existsSync(filePath)) {
    report.push(`SKIP: ${file} not found`);
    return;
  }

  const wb   = XLSX.readFile(filePath);
  const ws   = wb.Sheets['Sheet1'] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const header = rows[0] || [];

  // Detect month columns
  const monthCols = []; // { idx, monthKey }
  let ramzanIdx = -1;
  let totalIdx  = -1;
  let paidIdx   = -1;
  let pendingIdx = -1;

  header.forEach((h, i) => {
    const hs = String(h || '').trim().toLowerCase();
    if (hs.includes('ramzan')) { ramzanIdx = i; return; }
    if (hs.includes('total'))  { totalIdx  = i; return; }
    if (hs === 'paid')         { paidIdx   = i; return; }
    if (hs.includes('pending')){ pendingIdx = i; return; }
    const mk = parseMonthHeader(h);
    if (mk) monthCols.push({ idx: i, monthKey: mk });
  });

  report.push(`\n=== ${label} (${session}) ===`);
  report.push(`  File: ${file}`);
  report.push(`  Month columns: ${monthCols.map(m => m.monthKey).join(', ')}`);
  report.push(`  Ramzan col: ${ramzanIdx >= 0 ? `idx ${ramzanIdx}` : 'none'}`);

  const dataRows = rows.slice(1).filter(r => {
    const en = String(r[enIdx] || '').trim().toUpperCase();
    return en && en !== 'EN. ID' && en !== 'EN.ID';
  });

  report.push(`  Total students: ${dataRows.length}`);

  // Build deficit_entries rows
  const entries = []; // { enr, monthKey, amount, note }
  let skipped = 0;
  let noDeficit = 0;

  dataRows.forEach(row => {
    const enr  = String(row[enIdx] || '').trim().toUpperCase();
    const name = String(row[nameIdx] || '').trim();
    if (!enr) return;

    const pending = Number(row[pendingIdx] || 0);
    const totalDeficit = Number(row[totalIdx] || 0);
    const totalPaid    = Number(row[paidIdx]   || 0);

    // If fully paid (or no pending deficit), skip.
    if ((totalPaid >= totalDeficit - 0.5 && totalDeficit > 0) || pending <= 0.5) {
      noDeficit++;
      return;
    }

    // Collect all positive month charges in chronological order, then Ramzan last.
    const rawItems = [];
    monthCols.forEach(({ idx, monthKey }) => {
      const amt = Number(row[idx] || 0);
      if (amt > 0.5) {
        rawItems.push({ monthKey, amount: amt, note: `Imported from ${label} sheet`, isRamzan: false });
      }
    });

    if (ramzanIdx >= 0) {
      const amt = Number(row[ramzanIdx] || 0);
      if (amt > 0.5) {
        const ramzanMonthKey = session === '2023-2024' ? '2024-03' :
                               session === '2024-2025' ? '2025-03' :
                               session === '2025-2026' ? '2026-03' : null;
        if (ramzanMonthKey) {
          rawItems.push({
            monthKey: ramzanMonthKey,
            amount: amt,
            note: `Ramzan deficit – imported from ${label} sheet`,
            isRamzan: true
          });
        }
      }
    }

    // Subtract totalPaid FIFO (oldest month first) so only unpaid pending amounts are inserted.
    let remainingPaid = Math.max(0, totalPaid);
    rawItems.forEach((item) => {
      if (remainingPaid >= item.amount - 0.5) {
        remainingPaid = Math.max(0, remainingPaid - item.amount);
        return; // fully paid
      }
      const unpaid = Math.round((item.amount - remainingPaid) * 100) / 100;
      const note = remainingPaid > 0.5
        ? `${item.note} (partial, ₹${Math.round(remainingPaid)} paid)`
        : item.note;
      remainingPaid = 0;
      if (unpaid > 0.5) {
        entries.push({ enr, monthKey: item.monthKey, amount: Math.round(unpaid), note });
      }
    });
  });

  report.push(`  Fully paid (skipped): ${noDeficit}`);
  report.push(`  Deficit entries generated: ${entries.length}`);

  if (entries.length === 0) {
    report.push(`  No pending entries – no SQL file written.`);
    return;
  }

  // ---- Generate SQL ----
  // We group entries into chunks of 500 to avoid SQL size limits
  const CHUNK = 500;
  const sqlFiles = [];
  for (let i = 0; i < entries.length; i += CHUNK) {
    const slice = entries.slice(i, i + CHUNK);
    const fileNum = sqlFiles.length + 1;
    const fname = `deficit_${session}_${String(fileNum).padStart(2,'0')}.sql`;

    const sql = [
      `-- Deficit entries from ${label} sheet (${session})`,
      `-- Part ${fileNum}: rows ${i + 1}–${Math.min(i + CHUNK, entries.length)}`,
      `-- Run after students are imported. Safe to run twice (ON CONFLICT DO NOTHING).`,
      ``,
      `insert into public.deficit_entries (id, student_id, enrollment_no, month_key, amount, note)`,
      `select`,
      `  v.id,`,
      `  s.id,`,
      `  s.enrollment_no,`,
      `  v.month_key,`,
      `  v.amount::numeric,`,
      `  v.note`,
      `from (values`,
      slice.map(e => {
        const id = gen('DE', e.enr, e.monthKey + (e.note?.includes('Ramzan') ? '-ramzan' : ''));
        return `  (${sq(id)}, ${sq(e.enr.toUpperCase())}, ${sq(e.monthKey)}, ${e.amount}, ${sq(e.note)})`;
      }).join(',\n'),
      `) as v(id, enr, month_key, amount, note)`,
      `join public.students s on upper(s.enrollment_no) = upper(v.enr)`,
      `on conflict (id) do nothing;`,
      ``
    ].join('\n');

    const outPath = path.join(OUT, fname);
    fs.writeFileSync(outPath, sql, 'utf8');
    sqlFiles.push(fname);
    written.push(fname);
  }

  report.push(`  SQL files: ${sqlFiles.join(', ')}`);
});

// Write report
const reportText = [
  '=== Deficit Import Report ===',
  `Generated: ${new Date().toISOString()}`,
  `Output dir: ${OUT}`,
  '',
  ...report,
  '',
  `All files written: ${written.join(', ')}`,
  '',
  'HOW TO USE:',
  '1. Run supabase/schema.sql first (if not done already).',
  '2. Import students (run supabase/imports/*/01_students.sql files).',
  '3. Run each deficit_*.sql file in Supabase SQL Editor in order.',
  '4. The deficit_entries rows will appear in each student account.',
  '   The app engine uses them as "carried deficit" from old registers.',
].join('\n');

fs.writeFileSync(path.join(OUT, 'REPORT.txt'), reportText, 'utf8');
console.log(reportText);
console.log(`\nFiles written to: ${OUT}`);
