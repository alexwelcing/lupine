import ts from "typescript";
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node scripts/syntax-check.mjs <file.ts> [...]");
  process.exit(2);
}

let failed = false;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const diagnostic of sf.parseDiagnostics) {
    failed = true;
    const position = sf.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
    console.error(`${file}:${position.line + 1}:${position.character + 1} ${message}`);
  }
}

process.exit(failed ? 1 : 0);
