import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

// ── Load env ────────────────────────────────────────────────────────

const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) envVars[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
});

const DATABASE_URL = envVars.DATABASE_URL || envVars.DIRECT_URL;
if (!DATABASE_URL) { console.error('No DATABASE_URL found in .env'); process.exit(1); }

// ── Seed bg_drugs ───────────────────────────────────────────────────

async function seedBgDrugs(client) {
  const raw = readFileSync(new URL('bg-drugs-seed.json', import.meta.url), 'utf8');
  const drugs = JSON.parse(raw);

  const existing = await client.query('SELECT COUNT(*)::int AS n FROM bg_drugs');
  if (existing.rows[0].n > 0) {
    console.log(`  bg_drugs: already has ${existing.rows[0].n} rows — skipping (use --force to overwrite)`);
    return;
  }

  await client.query('TRUNCATE bg_drugs');

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < drugs.length; i += BATCH) {
    const batch = drugs.slice(i, i + BATCH);
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
  }

  console.log(`  bg_drugs: seeded ${inserted} rows`);
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const force = process.argv.includes('--force');

  console.log('Seeding database...\n');

  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (force) {
      // --force: wipe and re-seed even if data exists
      await client.query('TRUNCATE bg_drugs');
      console.log('  --force: truncated bg_drugs');
    }

    await seedBgDrugs(client);

    await client.query('COMMIT');
    console.log('\nDone!');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
