import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for glim-think.
 *
 * `typecheck.enabled` runs `tsc --noEmit` on every test file and fails the run
 * on type errors. This is what makes the schema-contract test
 * (`src/literature/__tests__/schema_contract.test.ts`) catch field drift in
 * `ClaimRecord` / `VectorizeClaimMetadata` at test-run time, not only at
 * `pnpm lint` time.
 */
export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.test.json",
      include: ["src/**/__tests__/**/*.test.ts"],
    },
  },
});
