#!/usr/bin/env node
/**
 * Merges the split SQL files in each supabase/imports/<session> folder into
 * ~350 KB batches (safe for the Supabase SQL Editor size limit) inside
 * supabase/imports/merged/.
 *
 * Usage:
 *   node scripts/merge-imports.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IMPORTS_DIR = path.join(ROOT, 'supabase', 'imports');
const OUT_DIR = path.join(IMPORTS_DIR, 'merged');
const MAX_BYTES = 350 * 1024; // 350 KB — safely under Supabase SQL Editor's query limit

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const old of fs.readdirSync(OUT_DIR)) {
  if (old.endsWith('.sql')) fs.unlinkSync(path.join(OUT_DIR, old));
}

const GROUPS = [
  { prefix: '01_2023-2024', dir: '2023-2024' },
  { prefix: '02_2024-2025', dir: '2024-2025' },
  { prefix: '03_2025-2026', dir: '2025-2026' },
  { prefix: '04_2026-2027', dir: '2026-2027' },
  { prefix: '05_deficit_all', dir: 'deficit' },
];

for (const { prefix, dir } of GROUPS) {
  const folder = path.join(IMPORTS_DIR, dir);
  if (!fs.existsSync(folder)) {
    console.log(`SKIP ${dir} (folder not found)`);
    continue;
  }
  const files = fs
    .readdirSync(folder)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (!files.length) {
    console.log(`SKIP ${dir} (no .sql files)`);
    continue;
  }

  const batches = [];
  let current = [];
  let currentSize = 0;

  for (const f of files) {
    const content = `-- >>> ${f}\n${fs.readFileSync(path.join(folder, f), 'utf8').trim()}\n`;
    const size = Buffer.byteLength(content, 'utf8');
    if (current.length > 0 && currentSize + size > MAX_BYTES) {
      batches.push(current);
      current = [];
      currentSize = 0;
    }
    current.push({ f, content });
    currentSize += size;
  }
  if (current.length) batches.push(current);

  batches.forEach((batch, idx) => {
    const partName =
      batches.length === 1
        ? `${prefix}.sql`
        : `${prefix}_part${String(idx + 1).padStart(2, '0')}of${String(batches.length).padStart(2, '0')}.sql`;
    const header = [
      `-- =============================================================================`,
      `-- Merged import for ${dir} (part ${idx + 1}/${batches.length}: ${batch.map((b) => b.f).join(', ')})`,
      `-- =============================================================================`,
      ``
    ].join('\n');
    const outPath = path.join(OUT_DIR, partName);
    fs.writeFileSync(outPath, header + batch.map((b) => b.content).join('\n'), 'utf8');
    const kb = Math.round(fs.statSync(outPath).size / 1024);
    console.log(`Wrote supabase/imports/merged/${partName} (${batch.length} files, ${kb} KB)`);
  });
}
