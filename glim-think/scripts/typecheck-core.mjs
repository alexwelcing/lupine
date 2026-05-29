import { spawnSync } from "node:child_process";

const args = [
  "tsc",
  "--noEmit",
  "--pretty",
  "false",
  "--module",
  "ESNext",
  "--moduleResolution",
  "bundler",
  "--target",
  "ESNext",
  "--lib",
  "ESNext",
  "--types",
  "@cloudflare/workers-types",
  "--skipLibCheck",
  "--strict",
  "src/research/mlipCampaign.ts",
  "src/research/mlipBaselineGrid.ts",
  "src/research/mlipBaselineWorkflow.ts",
  "src/research/mlipBaselineWorkflowOps.ts",
  "src/research/mlipBaselineCloudflareWorkflow.ts",
  "src/research/mlipWorkflow.ts",
  "src/research/mlipWorkflowOps.ts",
  "src/research/queue.ts",
  "src/research/workflowOps.ts",
  "src/research/workflowRegistry.ts",
  "src/research/workflows.ts",
  "src/research/workflowTypes.ts",
  "src/research/__tests__/mlipCampaign.test.ts",
  "src/research/__tests__/mlipBaselineWorkflow.test.ts",
  "src/research/__tests__/sync.test.ts",
  "src/research/__tests__/workflowRoutes.test.ts",
  "src/feed/beats.ts",
];

const child = spawnSync(args[0], args.slice(1), {
  cwd: process.cwd(),
  shell: process.platform === "win32",
  encoding: "utf8",
  timeout: 180_000,
  stdio: "inherit",
});

if (child.error) {
  console.error(child.error.message);
  process.exit(child.error.code === "ETIMEDOUT" ? 124 : 1);
}

process.exit(child.status ?? 1);
