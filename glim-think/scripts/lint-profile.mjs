import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const profiles = [
  ["fast", ["node", "scripts/typecheck-core.mjs"]],
  ["app", ["tsc", "-p", "tsconfig.app.json", "--noEmit", "--pretty", "false", "--extendedDiagnostics"]],
  ["tests", ["vitest", "run", "--typecheck", "src/research/__tests__/mlipCampaign.test.ts", "src/research/__tests__/sync.test.ts"]],
  ["syntax-server", ["node", "scripts/syntax-check.mjs", "src/server.ts"]],
];

const results = [];
for (const [name, command] of profiles) {
  const started = performance.now();
  const child = spawnSync(command[0], command.slice(1), {
    cwd: process.cwd(),
    shell: process.platform === "win32",
    encoding: "utf8",
    timeout: 120_000,
  });
  const durationMs = Math.round(performance.now() - started);
  results.push({
    name,
    command: command.join(" "),
    status: child.status,
    signal: child.signal,
    duration_ms: durationMs,
    timed_out: child.error?.code === "ETIMEDOUT",
    stdout_tail: (child.stdout ?? "").slice(-2000),
    stderr_tail: (child.stderr ?? "").slice(-2000),
  });
  if (child.status !== 0 || child.error) {
    if (name === "fast") {
      break;
    }
  }
}

const out = "target/lint-profile.json";
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2));
console.log(out);
for (const result of results) {
  console.log(`${result.name}: ${result.duration_ms}ms status=${result.status} timeout=${result.timed_out}`);
}

const failed = results.some((result) => result.name === "fast" && (result.status !== 0 || result.timed_out));
process.exit(failed ? 1 : 0);
