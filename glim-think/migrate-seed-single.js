/**
 * Migrate seed records from local JSONL to Cloudflare D1 as a single file.
 */

import fs from "fs";
import readline from "readline";

const INPUT_PATH = process.argv[2] || "../atlas-distill/atlas-distill/discovery_ledger/records.jsonl";
const OUTPUT_PATH = "migrate-all.sql";

async function main() {
  const records = [];
  const fileStream = fs.createReadStream(INPUT_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {}
  }

  console.log(`Loaded ${records.length} records`);

  const lines = [
    "BEGIN TRANSACTION;",
  ];

  for (const r of records) {
    lines.push(
      `INSERT OR IGNORE INTO records (record_id, element, potential_id, potential_label, pair_style, property, reference, predicted, unit, provenance, agent_id, timestamp) VALUES ('${esc(r.record_id)}','${esc(r.element)}','${esc(r.potential_id)}','${esc(r.potential_label)}','${esc(r.pair_style)}','${esc(r.property)}',${num(r.reference)},${num(r.predicted)},'${esc(r.unit)}','${esc(JSON.stringify(r.provenance))}','${esc(r.agent_id)}','${esc(r.timestamp)}');`
    );
  }

  lines.push("COMMIT;");
  fs.writeFileSync(OUTPUT_PATH, lines.join("\n"));
  console.log(`Wrote ${OUTPUT_PATH} with ${records.length} inserts`);
}

function esc(str) {
  if (typeof str !== "string") return "";
  return str.replace(/'/g, "''").replace(/\0/g, "");
}

function num(v) {
  return typeof v === "number" ? v : "NULL";
}

main().catch(console.error);
