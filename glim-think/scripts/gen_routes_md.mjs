#!/usr/bin/env node
// Regenerate `docs/routes.md` from the live `/openapi.json`.
//
// Usage:
//   node scripts/gen_routes_md.mjs                                # uses prod
//   GLIM_API_URL=http://localhost:8787 node scripts/gen_routes_md.mjs

import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.GLIM_API_URL ?? "https://glim-think-v1.aw-ab5.workers.dev";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "docs", "routes.md");

const res = await fetch(`${baseUrl}/openapi.json`);
if (!res.ok) {
  console.error(`Failed to fetch ${baseUrl}/openapi.json: ${res.status}`);
  process.exit(1);
}
const spec = await res.json();

const methods = ["get", "post", "put", "patch", "delete", "options"];
const rows = [];
for (const [path, item] of Object.entries(spec.paths)) {
  for (const method of methods) {
    const op = item[method];
    if (!op) continue;
    const tag = op.tags?.[0] ?? "—";
    const status = op["x-status"] ?? "deployed";
    const summary = (op.summary ?? "").replace(/\|/g, "\\|");
    rows.push(`| ${method.toUpperCase()} | \`${path}\` | ${tag} | ${status} | ${summary} |`);
  }
}

const tags = (spec.tags ?? []).map((t) => `- **${t.name}** — ${t.description}`).join("\n");

const md = `# glim-think routes

Generated from \`/openapi.json\` (run \`node scripts/gen_routes_md.mjs\` to regenerate).

The single source of truth lives at \`src/openapi.ts\` and is served live at
[\`/openapi.json\`](${baseUrl}/openapi.json).

## Status legend

- **deployed** — currently live on \`glim-think-v1.aw-ab5.workers.dev\`
- **planned-unit-N** — owned by an in-flight sibling PR; route returns 404 until that PR merges

## Endpoints

| Method | Path | Tag | Status | Summary |
|---|---|---|---|---|
${rows.join("\n")}

## Tags

${tags}
`;

await writeFile(outPath, md, "utf8");
console.log(`Wrote ${outPath} (${rows.length} endpoints)`);
