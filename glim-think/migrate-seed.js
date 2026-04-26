/**
 * Migrate seed records from local JSONL to Cloudflare D1.
 *
 * Usage: node migrate-seed.js <path-to-records.jsonl>
 */

import fs from "fs";
import readline from "readline";

const BATCH_SIZE = 50;
const INPUT_PATH = process.argv[2] || "../atlas-distill/atlas-distill/discovery_ledger/records.jsonl";

async function main() {
  const records = [];
  const fileStream = fs.createReadStream(INPUT_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      records.push(r);
    } catch {
      // skip malformed
    }
  }

  console.log(`Loaded ${records.length} records from ${INPUT_PATH}`);

  // Build SQL batches
  const batches = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const values = chunk
      .map(
        (r) =>
          `('${escape(r.record_id)}','${escape(r.element)}','${escape(r.potential_id)}','${escape(
            r.potential_label
          )}','${escape(r.pair_style)}','${escape(r.property)}',${r.reference},${r.predicted},'${escape(
            r.unit
          )}','${escape(JSON.stringify(r.provenance))}','${escape(r.agent_id)}','${escape(r.timestamp)}')`
      )
      .join(",");

    const sql = `INSERT OR IGNORE INTO records (record_id, element, potential_id, potential_label, pair_style, property, reference, predicted, unit, provenance, agent_id, timestamp) VALUES ${values};`;
    batches.push(sql);
  }

  // Write batches to files for wrangler execution
  for (let i = 0; i < batches.length; i++) {
    const filename = `migrate-batch-${String(i).padStart(4, "0")}.sql`;
    fs.writeFileSync(filename, batches[i]);
    console.log(`Wrote ${filename} (${chunkSize(i, records.length)} records)`);
  }

  console.log(`\nRun the following to migrate all batches:`);
  console.log(`for f in migrate-batch-*.sql; do npx wrangler d1 execute glim-ledger --remote --file=\$f; done`);
}

function escape(str) {
  if (typeof str !== "string") return "";
  return str.replace(/'/g, "''").replace(/\0/g, "");
}

function chunkSize(index, total) {
  const start = index * BATCH_SIZE;
  return Math.min(BATCH_SIZE, total - start);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
