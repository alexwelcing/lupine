import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for glim-think.
 *
 * We deliberately do NOT use `@cloudflare/vitest-pool-workers` — it spins up
 * workerd per test file and requires a stable Worker entry + miniflare
 * bindings. The load-bearing lanes we cover (feed serve, orchestrator
 * dispatch, queue sync, schema contract) all take an `env` parameter that
 * is trivially stubbable in plain node, so we stub D1/R2/KV/Queue bindings
 * at the call site and keep the runtime lightweight. Revisit only if a
 * test ever needs the real workerd runtime (DOs, Workers AI, real cron).
 *
 * `typecheck.enabled` runs `tsc --noEmit` on every test file and fails the
 * run on type errors — this is what makes the schema-contract test
 * (`src/literature/__tests__/schema_contract.test.ts`) catch field drift
 * in `ClaimRecord` / `VectorizeClaimMetadata` at test-run time, not only
 * at `pnpm lint` time.
 */
export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
    globals: false,
    testTimeout: 10_000,
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.test.json",
      include: ["src/**/__tests__/**/*.test.ts"],
    },
  },
});
