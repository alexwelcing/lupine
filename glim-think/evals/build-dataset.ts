/**
 * Build Phoenix datasets from glim-think benchmark data.
 *
 * Reads `nist_benchmark.csv` from the repo root and creates
 * structured datasets for experiments and evaluation.
 *
 * Usage:
 *   PHOENIX_API_KEY=xxx npx tsx build-dataset.ts
 */

import { config } from "dotenv";
config({ path: "../.env" });
import { createClient } from "@arizeai/phoenix-client";
import { createDataset, appendDatasetExamples } from "@arizeai/phoenix-client/datasets";
import * as fs from "fs";
import * as path from "path";

const PHOENIX_API_KEY = process.env.PHOENIX_API_KEY?.trim();
const PHOENIX_COLLECTOR_ENDPOINT = process.env.PHOENIX_COLLECTOR_ENDPOINT?.trim();

function getPhoenixHost(): string {
  if (PHOENIX_COLLECTOR_ENDPOINT) {
    return PHOENIX_COLLECTOR_ENDPOINT.replace(/\/v1\/traces\/?$/, "");
  }
  throw new Error("PHOENIX_COLLECTOR_ENDPOINT must be set");
}

function getClient() {
  if (!PHOENIX_API_KEY) throw new Error("PHOENIX_API_KEY not set");
  return createClient({
    options: {
      baseUrl: getPhoenixHost(),
      headers: {
        Authorization: `Bearer ${PHOENIX_API_KEY}`,
        "User-Agent": "glim-think-eval/1.0.0 (dataset-builder)",
      },
    },
  });
}

// ─── CSV Parser ───

interface BenchmarkRow {
  material: string;
  potential: string;
  property: string;
  reference: number;
  predicted: number;
  unit: string;
  nist_id: string;
  doi: string;
  pair_style: string;
}

function parseCSV(content: string): BenchmarkRow[] {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: BenchmarkRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    if (values.length < headers.length) continue;
    const row: any = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() ?? "";
    }
    rows.push({
      material: row.material,
      potential: row.potential,
      property: row.property,
      reference: parseFloat(row.reference),
      predicted: parseFloat(row.predicted),
      unit: row.unit,
      nist_id: row.nist_id,
      doi: row.doi,
      pair_style: row.pair_style,
    });
  }
  return rows;
}

function loadBenchmarkData(): BenchmarkRow[] {
  const csvPath = path.resolve("..", "..", "nist_benchmark.csv");
  if (!fs.existsSync(csvPath)) {
    throw new Error(`nist_benchmark.csv not found at ${csvPath}`);
  }
  const content = fs.readFileSync(csvPath, "utf-8");
  return parseCSV(content);
}

// ─── Dataset Builders ───

interface DatasetExample {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/** Build a structured benchmark dataset for potential accuracy experiments. */
function buildBenchmarkDataset(rows: BenchmarkRow[]): DatasetExample[] {
  return rows.map((row) => {
    const errorPct = ((row.predicted - row.reference) / Math.abs(row.reference)) * 100;
    return {
      input: {
        element: row.material,
        potential: row.potential,
        pair_style: row.pair_style,
        property: row.property,
        unit: row.unit,
      },
      output: {
        reference_value: row.reference,
        predicted_value: row.predicted,
        error_percent: Math.round(errorPct * 1000) / 1000,
        nist_id: row.nist_id,
        doi: row.doi,
      },
      metadata: {
        source: "nist_benchmark",
        dataset_type: "potential_accuracy",
      },
    };
  });
}

/** Build a research-QA dataset for agent evaluation. */
function buildResearchQADataset(rows: BenchmarkRow[]): DatasetExample[] {
  const examples: DatasetExample[] = [];

  // Group by (element, potential) to create compound questions
  const byPotential = new Map<string, BenchmarkRow[]>();
  for (const row of rows) {
    const key = `${row.material}|${row.potential}`;
    if (!byPotential.has(key)) byPotential.set(key, []);
    byPotential.get(key)!.push(row);
  }

  // Individual property questions
  for (const row of rows) {
    const errorPct = ((row.predicted - row.reference) / Math.abs(row.reference)) * 100;
    examples.push({
      input: {
        question: `What ${row.property} value does the ${row.potential} ${row.pair_style} potential predict for ${row.material}, and how does it compare to the reference value?`,
        context: `Element: ${row.material}, Potential: ${row.potential}, Property: ${row.property}, Pair style: ${row.pair_style}`,
      },
      output: {
        answer: `The ${row.potential} potential predicts ${row.property} = ${row.predicted} ${row.unit} for ${row.material}, compared to the reference value of ${row.reference} ${row.unit} (${errorPct > 0 ? "+" : ""}${errorPct.toFixed(2)}% error).`,
        reference_value: row.reference,
        predicted_value: row.predicted,
        error_percent: Math.round(errorPct * 1000) / 1000,
        unit: row.unit,
      },
      metadata: {
        source: "nist_benchmark",
        dataset_type: "research_qa",
        question_type: "single_property",
        nist_id: row.nist_id,
      },
    });
  }

  // Aggregate potential quality questions
  for (const [key, group] of byPotential) {
    const [element, potential] = key.split("|");
    const pairStyle = group[0].pair_style;
    const avgError =
      group.reduce((s, r) => s + Math.abs(((r.predicted - r.reference) / Math.abs(r.reference)) * 100), 0) /
      group.length;

    examples.push({
      input: {
        question: `Evaluate the overall accuracy of the ${potential} ${pairStyle} potential for ${element} across all tested properties.`,
        context: `Element: ${element}, Potential: ${potential}, Properties tested: ${group.map((r) => r.property).join(", ")}`,
      },
      output: {
        answer: `The ${potential} potential for ${element} has an average absolute error of ${avgError.toFixed(2)}% across ${group.length} properties (${group.map((r) => `${r.property}: ${((r.predicted - r.reference) / Math.abs(r.reference) * 100).toFixed(1)}%`).join(", ")}).`,
        properties_tested: group.length,
        average_absolute_error_pct: Math.round(avgError * 100) / 100,
        property_errors: group.map((r) => ({
          property: r.property,
          error_pct: Math.round(((r.predicted - r.reference) / Math.abs(r.reference)) * 100 * 1000) / 1000,
        })),
      },
      metadata: {
        source: "nist_benchmark",
        dataset_type: "research_qa",
        question_type: "aggregate_evaluation",
        nist_id: group[0].nist_id,
      },
    });
  }

  return examples;
}

/** Build a discriminative-experiment dataset for Experiment agent evaluation. */
function buildExperimentDataset(rows: BenchmarkRow[]): DatasetExample[] {
  const examples: DatasetExample[] = [];

  // Find pairs of potentials for the same element+property to create discriminative examples
  const byElementProperty = new Map<string, BenchmarkRow[]>();
  for (const row of rows) {
    const key = `${row.material}|${row.property}`;
    if (!byElementProperty.has(key)) byElementProperty.set(key, []);
    byElementProperty.get(key)!.push(row);
  }

  for (const [key, group] of byElementProperty) {
    if (group.length < 2) continue;
    const [element, property] = key.split("|");

    // Sort by error magnitude
    const sorted = [...group].sort(
      (a, b) =>
        Math.abs((a.predicted - a.reference) / a.reference) -
        Math.abs((b.predicted - b.reference) / b.reference)
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    examples.push({
      input: {
        question: `Design a discriminative experiment to determine whether the ${best.potential} or ${worst.potential} potential better predicts ${property} for ${element}.`,
        context: `Element: ${element}, Property: ${property}, Best candidate: ${best.potential} (${((best.predicted - best.reference) / best.reference * 100).toFixed(1)}% error), Worst candidate: ${worst.potential} (${((worst.predicted - worst.reference) / worst.reference * 100).toFixed(1)}% error)`,
      },
      output: {
        answer: `A ${property} calculation for ${element} using both potentials would discriminate between them. The ${best.potential} potential predicts ${best.predicted} ${best.unit} (reference: ${best.reference}), while ${worst.potential} predicts ${worst.predicted} ${worst.unit}. The expected discriminative power is ${Math.abs(((worst.predicted - worst.reference) / worst.reference * 100) - ((best.predicted - best.reference) / best.reference * 100)).toFixed(1)} percentage points of error difference.`,
        recommended_experiment: `${property} calculation`,
        best_potential: best.potential,
        worst_potential: worst.potential,
        discriminative_power_pct: Math.round(
          Math.abs(
            ((worst.predicted - worst.reference) / worst.reference * 100) -
            ((best.predicted - best.reference) / best.reference * 100)
          ) * 1000
        ) / 1000,
      },
      metadata: {
        source: "nist_benchmark",
        dataset_type: "experiment_design",
        element,
        property,
      },
    });
  }

  return examples;
}

// ─── Upload / Save ───

async function uploadDataset(name: string, examples: DatasetExample[]) {
  const client = getClient();
  console.log(`[dataset] Creating "${name}" with ${examples.length} examples...`);

  const dataset = await createDataset({
    client,
    name,
    description: `GLIM benchmark dataset generated from NIST IPR data. ${examples.length} examples.`,
  });

  console.log(`[dataset] Created dataset ID: ${dataset.id}`);

  // Upload in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < examples.length; i += BATCH_SIZE) {
    const batch = examples.slice(i, i + BATCH_SIZE);
    await appendDatasetExamples({
      client,
      datasetId: dataset.id,
      examples: batch.map((ex) => ({
        input: ex.input,
        output: ex.output,
        metadata: ex.metadata,
      })),
    });
    console.log(`[dataset] Uploaded batch ${i / BATCH_SIZE + 1} (${batch.length} examples)`);
  }

  console.log(`[dataset] "${name}" upload complete.`);
  return dataset;
}

function saveDatasetLocal(name: string, examples: DatasetExample[]) {
  const outDir = path.resolve(process.cwd(), "__datasets__");
  const outPath = path.join(outDir, `${name}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ name, count: examples.length, examples }, null, 2));
  console.log(`[dataset] Saved "${name}" locally: ${outPath} (${examples.length} examples)`);
}

// ─── Main ───

async function main() {
  console.log("[dataset] Loading benchmark data...");
  const rows = loadBenchmarkData();
  console.log(`[dataset] Loaded ${rows.length} benchmark rows`);

  const datasets = [
    { name: "glim-benchmark", builder: buildBenchmarkDataset },
    { name: "glim-research-qa", builder: buildResearchQADataset },
    { name: "glim-experiment-design", builder: buildExperimentDataset },
  ];

  for (const { name, builder } of datasets) {
    const examples = builder(rows);
    saveDatasetLocal(name, examples);

    if (PHOENIX_API_KEY) {
      try {
        await uploadDataset(name, examples);
      } catch (e) {
        console.warn(`[dataset] Upload failed for "${name}": ${(e as Error).message}`);
      }
    }
  }

  console.log("[dataset] All datasets built.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
