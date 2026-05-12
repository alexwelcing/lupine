import { defineConfig } from "vitest/config";

/**
 * Minimal vitest config for critical-path unit tests.
 *
 * We deliberately do NOT use `@cloudflare/vitest-pool-workers` here.
 * That pool spins up workerd per test file and requires a stable
 * Worker entry + miniflare bindings. The three load-bearing lanes
 * we cover (feed serve, orchestrator dispatch, queue sync) all take
 * an `env` parameter that is trivially stubbable in plain node — so
 * we stub the D1 / R2 / KV / Queue bindings at the call site and
 * keep the test runtime lightweight. If we ever need to test code
 * that depends on the workerd runtime (DOs, Workers AI, real cron
 * dispatch), this is the file to revisit.
 */
export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
    globals: false,
    testTimeout: 10_000,
  },
});
