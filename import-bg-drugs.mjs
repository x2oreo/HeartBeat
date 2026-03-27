import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import XLSX from 'xlsx';

// ── Config ──────────────────────────────────────────────────────────

const envFile = readFileSync(new URL('.env', import.meta.url), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
});

const DATABASE_URL = envVars.DATABASE_URL || envVars.DIRECT_URL;
if (!DATABASE_URL) { console.error('No DATABASE_URL found in .env'); process.exit(1); }

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const NCPR_APPENDIX_1 = 'https://data.egov.bg/resource/download/eddb1a7f-9848-4f1f-950a-67d4d5ad5755/csv';
const NCPR_APPENDIX_2 = 'https://data.egov.bg/resource/download/238674e0-796c-41e0-88c0-65c08cef2319/csv';
const BDA_REGISTER = 'https://www.bda.bg/images/stories/documents/registers/Register_Lekarstva/IAL_Register_02_2026.xlsx';

const BATCH_SIZE = 500;
const MIN_RECORDS_THRESHOLD = 1000;

// ── Helpers ─────────────────────────────────────────────────────────

/** Parse a single CSV line, respecting quoted fields */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { fields.push(current); current = ''; }
    else { current += char; }
  }
  fields.push(current);
  return fields.map(f => f.trim());
}

/** Normalize BDA ATC codes: strip spaces, zero-pad numeric suffix */
function normalizeAtcCode(raw) {
  if (!raw) return null;
  const stripped = raw.replace(/\s+/g, '');
  if (!stripped) return null;
  const m = stripped.match(/^([A-Z]\d{2}[A-Z]{2})(\d{1,2})$/i);
  if (m) return m[1].toUpperCase() + m[2].padStart(2, '0');
  // Already standard 7-char format or unrecognizable — return as-is if plausible
  if (/^[A-Z]\d{2}[A-Z]{2}\d{2}$/i.test(stripped)) return stripped.toUpperCase();
  return stripped; // non-standard but keep it
}

// ── Download ────────────────────────────────────────────────────────

async function downloadWithRetry(url, label, opts = {}) {
  const { binary = false, timeout = 30_000, retries = 3 } = opts;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(timeout),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      if (binary) {
        const buf = Buffer.from(await resp.arrayBuffer());
        console.log(`  ${label}: done (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
        return buf;
      } else {
        const text = await resp.text();
        console.log(`  ${label}: done (${(text.length / 1024).toFixed(0)} KB)`);
        return text;
      }
    } catch (err) {
      if (attempt < retries) {
        console.log(`  ${label}: attempt ${attempt} failed (${err.message}), retrying...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      } else {
        console.error(`  ${label}: FAILED after ${retries} attempts — ${err.message}`);
        return null;
      }
    }
  }
}

// ── Parsers ─────────────────────────────────────────────────────────

/**
 * Parse NCPR Positive Drug List CSV.
 * @param {string} csvText  Raw CSV text (may have BOM)
 * @param {string} label    For logging
 * @param {number} statusCol  0-based column index for status field
 */
function parseNcprCsv(csvText, label, statusCol) {
  const text = csvText.replace(/^\uFEFF/, ''); // strip BOM
  const lines = text.split(/\r?\n/);

  // Skip header/title rows (first 8 lines)
  const dataLines = lines.slice(8);

  const drugs = [];
  let skippedHeaders = 0;
  let skippedInactive = 0;

  for (const line of dataLines) {
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    if (cols.length < 3) continue;

    const atcCode = (cols[0] || '').trim();
    const inn = (cols[1] || '').trim();
    const brandName = (cols[2] || '').trim();
    const status = (cols[statusCol] || '').trim();

    if (!inn || !brandName) continue;

    // Filter INN group header rows (brand = "ATC INN" or brand starts with ATC code)
    if (brandName === inn || brandName === atcCode || brandName.startsWith(atcCode + ' ')) {
      skippedHeaders++;
      continue;
    }

    // Only import active drugs
    if (status && status !== 'Активен') {
      skippedInactive++;
      continue;
    }

    drugs.push({ inn, brandName, atcCode: atcCode || null });
  }

  console.log(`  ${label}: ${drugs.length} active drugs (skipped ${skippedHeaders} headers, ${skippedInactive} inactive)`);
  return drugs;
}

/**
 * Parse BDA/IAL National Register Excel.
 * @param {Buffer} buffer  Raw .xlsx file buffer
 */
function parseBdaExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const drugs = [];
  // Skip header row (row 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 13) continue;

    const brandRaw = String(row[2] || '').trim(); // Col C = trade name
    const inn = String(row[11] || '').trim();       // Col L = INN
    const atcRaw = String(row[12] || '').trim();    // Col M = ATC code

    if (!inn || !brandRaw) continue;

    // Extract brand name (part before first comma — strip dosage/form info)
    const brandName = brandRaw.split(',')[0].trim();
    if (!brandName) continue;

    const atcCode = normalizeAtcCode(atcRaw);
    drugs.push({ inn, brandName, atcCode });
  }

  console.log(`  BDA Register: ${drugs.length} drugs`);
  return drugs;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('[1/4] Downloading sources...');

  const [csv1, csv2, xlsxBuf] = await Promise.all([
    downloadWithRetry(NCPR_APPENDIX_1, 'NCPR Appendix 1'),
    downloadWithRetry(NCPR_APPENDIX_2, 'NCPR Appendix 2'),
    downloadWithRetry(BDA_REGISTER, 'BDA Register', { binary: true, timeout: 60_000 }),
  ]);

  const anySuccess = csv1 || csv2 || xlsxBuf;
  if (!anySuccess) {
    console.error('\nAll downloads failed. Aborting.');
    process.exit(1);
  }

  // ── Parse ───────────────────────────────────────────────────────

  console.log('\n[2/4] Parsing sources...');

  const allDrugs = [];

  if (csv1) {
    const drugs = parseNcprCsv(csv1, 'Appendix 1', 22);
    allDrugs.push(...drugs);
  }
  if (csv2) {
    const drugs = parseNcprCsv(csv2, 'Appendix 2', 19);
    allDrugs.push(...drugs);
  }
  if (xlsxBuf) {
    const drugs = parseBdaExcel(xlsxBuf);
    allDrugs.push(...drugs);
  }

  // ── Deduplicate ─────────────────────────────────────────────────

  console.log('\n[3/4] Deduplicating...');

  const map = new Map(); // key -> drug (prefer entry with ATC code)
  for (const drug of allDrugs) {
    const key = `${drug.inn.toLowerCase()}|${drug.brandName.toLowerCase()}`;
    const existing = map.get(key);
    if (!existing || (!existing.atcCode && drug.atcCode)) {
      map.set(key, drug);
    }
  }

  const unique = [...map.values()];
  console.log(`  Total parsed: ${allDrugs.length}, Unique: ${unique.length}`);

  if (unique.length < MIN_RECORDS_THRESHOLD) {
    console.error(`\nOnly ${unique.length} unique records — below safety threshold of ${MIN_RECORDS_THRESHOLD}. Aborting.`);
    process.exit(1);
  }

  // ── Database import ─────────────────────────────────────────────

  console.log('\n[4/4] Importing to database...');

  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE bg_drugs');
    console.log('  TRUNCATE bg_drugs');

    let inserted = 0;
    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const batch = unique.slice(i, i + BATCH_SIZE);
      const values = batch.map((_, j) => {
        const o = j * 4;
        return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4})`;
      }).join(',');
      const params = batch.flatMap(d => [randomUUID(), d.inn, d.brandName, d.atcCode]);

      await client.query(
        `INSERT INTO bg_drugs (id, inn, brand_name, atc_code) VALUES ${values}`,
        params,
      );
      inserted += batch.length;
      if (inserted % 2000 === 0 || inserted === unique.length) {
        console.log(`  Inserted ${inserted}/${unique.length}`);
      }
    }

    await client.query('COMMIT');

    const count = await client.query('SELECT COUNT(*) FROM bg_drugs');
    console.log(`\nDone! ${count.rows[0].count} rows in bg_drugs`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
