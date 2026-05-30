/**
 * ATLAS-Lean telemetry extension for the Phoenix / OpenInference pipeline.
 *
 * Per ATLAS_Lean_Integration_Review §9.2, spans that exercise formally-grounded
 * reasoning carry ATLAS provenance so Phoenix can attribute hypotheses to the
 * theorems (and the ATLAS/Mathlib revisions) that underwrite them. This module
 * supplies:
 *
 *   - an OpenInference span-kind helper (re-exporting the canonical enum so
 *     LLM / CHAIN / TOOL / RETRIEVER / EVALUATOR are a single source of truth),
 *   - the `AtlasTelemetryConfig` shape describing the build under test,
 *   - the `x-lupine-atlas-revision` / `x-lupine-mathlib-revision` /
 *     `x-lupine-theorem-count` OTLP export headers,
 *   - helpers that stamp `lupine.build.*`, `lupine.theorem.*`,
 *     `lupine.proof.status`, and `lupine.atlas.module` span attributes.
 *
 * Pure + side-effect-free except for the span-attribute setters (which mutate
 * the passed span only). It does not own the exporter — see phoenix.ts, which
 * merges these headers into the OTLP request.
 */

import type { Span } from "@opentelemetry/api";
import {
  SemanticConventions,
  OpenInferenceSpanKind,
} from "@arizeai/openinference-semantic-conventions";
import type { AtlasTheoremStatus } from "../atlas/theorems";

/**
 * Canonical OpenInference span kinds. Re-exported (not redefined) so glim-think
 * uses the same string values Phoenix classifies on. The subset the task
 * enumerates — LLM, CHAIN, TOOL, RETRIEVER, EVALUATOR — are all members; AGENT
 * (used by telemetry/rpc.ts), RERANKER, EMBEDDING, GUARDRAIL are also available.
 */
export { OpenInferenceSpanKind };
export type OpenInferenceSpanKindValue =
  (typeof OpenInferenceSpanKind)[keyof typeof OpenInferenceSpanKind];

/**
 * Set the OpenInference span kind on a span using the canonical convention key.
 * Phoenix routes/classifies spans by this attribute.
 */
export function setSpanKind(span: Span, kind: OpenInferenceSpanKindValue): void {
  span.setAttribute(SemanticConventions.OPENINFERENCE_SPAN_KIND, kind);
}

/** Rollup of a build's theorem inventory, summarized for export. */
export interface TheoremInventorySummary {
  readonly total_imported: number;
  readonly total_extended: number;
  /** Per-facet count of theorems the facet depends on. */
  readonly by_facet: Readonly<Record<string, number>>;
}

/**
 * The ATLAS build the running fleet is pinned to. Attached to OTLP exports so
 * every trace is attributable to an exact formal-foundations revision (§9.2).
 */
export interface AtlasTelemetryConfig {
  readonly atlas_revision: string;
  readonly mathlib_revision: string;
  readonly theorem_inventory_summary: TheoremInventorySummary;
}

/** OTLP export header names carrying ATLAS provenance (§9.2). */
export const ATLAS_REVISION_HEADER = "x-lupine-atlas-revision";
export const MATHLIB_REVISION_HEADER = "x-lupine-mathlib-revision";
export const THEOREM_COUNT_HEADER = "x-lupine-theorem-count";

/**
 * Build the ATLAS provenance export headers from a telemetry config. Pure:
 * returns a fresh header map. `x-lupine-theorem-count` is the total theorem
 * count (imported + extended). Returns `{}` when no config is supplied, so a
 * fleet without ATLAS provisioning exports unchanged.
 */
export function atlasExportHeaders(
  config: AtlasTelemetryConfig | undefined,
): Record<string, string> {
  if (!config) return {};
  const { total_imported, total_extended } = config.theorem_inventory_summary;
  return {
    [ATLAS_REVISION_HEADER]: config.atlas_revision,
    [MATHLIB_REVISION_HEADER]: config.mathlib_revision,
    [THEOREM_COUNT_HEADER]: String(total_imported + total_extended),
  };
}

/**
 * Parse an {@link AtlasTelemetryConfig} from the Worker environment. The fleet
 * publishes its pinned revisions + inventory rollup as JSON in
 * `ATLAS_TELEMETRY_CONFIG` (or the discrete `ATLAS_REVISION` / `MATHLIB_REVISION`
 * vars). Returns undefined (never throws) when unset/malformed so export
 * degrades cleanly to no ATLAS headers.
 */
export function resolveAtlasTelemetryConfig(env: {
  ATLAS_TELEMETRY_CONFIG?: string;
  ATLAS_REVISION?: string;
  MATHLIB_REVISION?: string;
}): AtlasTelemetryConfig | undefined {
  const raw = env.ATLAS_TELEMETRY_CONFIG?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<AtlasTelemetryConfig>;
      if (parsed.atlas_revision && parsed.mathlib_revision) {
        const summary = parsed.theorem_inventory_summary;
        return {
          atlas_revision: parsed.atlas_revision,
          mathlib_revision: parsed.mathlib_revision,
          theorem_inventory_summary: {
            total_imported: summary?.total_imported ?? 0,
            total_extended: summary?.total_extended ?? 0,
            by_facet: summary?.by_facet ?? {},
          },
        };
      }
    } catch {
      // fall through to discrete vars
    }
  }
  const atlas = env.ATLAS_REVISION?.trim();
  const mathlib = env.MATHLIB_REVISION?.trim();
  if (atlas && mathlib) {
    return {
      atlas_revision: atlas,
      mathlib_revision: mathlib,
      theorem_inventory_summary: { total_imported: 0, total_extended: 0, by_facet: {} },
    };
  }
  return undefined;
}

// ─── Span attribute helpers ───

/** Namespaced ATLAS span-attribute keys (§9.2). */
export const AtlasSpanAttr = {
  BUILD_ATLAS_REVISION: "lupine.build.atlas_revision",
  BUILD_MATHLIB_REVISION: "lupine.build.mathlib_revision",
  BUILD_THEOREM_COUNT: "lupine.build.theorem_count",
  THEOREM_NAME: "lupine.theorem.name",
  THEOREM_MODULE: "lupine.theorem.module",
  THEOREM_REVISION: "lupine.theorem.revision",
  PROOF_STATUS: "lupine.proof.status",
  ATLAS_MODULE: "lupine.atlas.module",
} as const;

/**
 * Stamp the build-under-test attributes (`lupine.build.*`) onto a span from an
 * {@link AtlasTelemetryConfig}. No-op when config is undefined.
 */
export function setBuildAttributes(span: Span, config: AtlasTelemetryConfig | undefined): void {
  if (!config) return;
  const { total_imported, total_extended } = config.theorem_inventory_summary;
  span.setAttribute(AtlasSpanAttr.BUILD_ATLAS_REVISION, config.atlas_revision);
  span.setAttribute(AtlasSpanAttr.BUILD_MATHLIB_REVISION, config.mathlib_revision);
  span.setAttribute(AtlasSpanAttr.BUILD_THEOREM_COUNT, total_imported + total_extended);
}

/**
 * Stamp the per-theorem attributes (`lupine.theorem.*`, `lupine.proof.status`,
 * `lupine.atlas.module`) onto a span when a hypothesis/claim is grounded by a
 * specific ATLAS theorem.
 */
export function setTheoremAttributes(
  span: Span,
  theorem: {
    readonly theorem: string;
    readonly module: string;
    readonly revision: string;
    readonly status: AtlasTheoremStatus;
  },
): void {
  span.setAttribute(AtlasSpanAttr.THEOREM_NAME, theorem.theorem);
  span.setAttribute(AtlasSpanAttr.THEOREM_MODULE, theorem.module);
  span.setAttribute(AtlasSpanAttr.THEOREM_REVISION, theorem.revision);
  span.setAttribute(AtlasSpanAttr.PROOF_STATUS, theorem.status);
  span.setAttribute(AtlasSpanAttr.ATLAS_MODULE, theorem.module);
}
