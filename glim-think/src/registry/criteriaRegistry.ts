/**
 * Criteria registry — Layer-3 actuation substrate of the locked
 * hypothesis-loop architecture.
 *
 * Experiment-design criteria are now declarative DATA living under the
 * Evolver's `src/registry/` path allowlist — autonomously tunable,
 * regression-gated, and auto-reverting — instead of being hardcoded in
 * `src/agents/experiment.ts`. The Evolver may rewrite
 * `criteria/experiment-design.json` (new weights / keywords / thresholds);
 * the regression gate is the backstop and bad variants auto-revert.
 *
 * Mirrors the promptRegistry pattern: `import x from "./*.json"` with
 * resolveJsonModule, no new deps, no side effects on import. Defaults below
 * are the CURRENT hardcoded values, verbatim — behavior is identical by
 * default and stays correct even if the JSON is malformed (per-field
 * defensive fallback, no `any`).
 */
import experimentDesignJson from "./criteria/experiment-design.json";

export interface ExperimentDesignCriteria {
  version: string;
  weights: Record<string, number>;
  discriminative_property_min_length: number;
  discriminative_property_keywords: string[];
}

/**
 * Hardcoded fallback — byte-for-byte the prior inline values from
 * `validateExperimentDesign` (experiment.ts). Used per-field when the
 * imported JSON is missing/malformed so default behavior never changes.
 */
const FALLBACK: ExperimentDesignCriteria = {
  version: "v1",
  weights: {
    element_valid: 0.2,
    structure_matches_element: 0.2,
    pair_style_nonempty: 0.15,
    discriminative_property_nonempty: 0.15,
    discriminative_property_specific: 0.15,
    lammps_type_known: 0.15,
  },
  discriminative_property_min_length: 5,
  discriminative_property_keywords: [
    "energy",
    "constant",
    "fault",
    "surface",
    "vacancy",
    "modulus",
    "stacking",
  ],
};

// JSON import is typed structurally by resolveJsonModule; narrow to a
// partial view so each field can be validated independently.
const RAW = experimentDesignJson as Partial<ExperimentDesignCriteria>;

function isStringRecordOfNumbers(v: unknown): v is Record<string, number> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  return Object.values(v as Record<string, unknown>).every(
    (n) => typeof n === "number" && Number.isFinite(n),
  );
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}

/**
 * Return the active experiment-design criteria, typed. Each field is
 * validated against the strict shape; any field that is missing or the
 * wrong type falls back to the hardcoded default for THAT field only.
 */
export function getExperimentDesignCriteria(): ExperimentDesignCriteria {
  return {
    version: typeof RAW.version === "string" ? RAW.version : FALLBACK.version,
    weights: isStringRecordOfNumbers(RAW.weights)
      ? RAW.weights
      : FALLBACK.weights,
    discriminative_property_min_length:
      typeof RAW.discriminative_property_min_length === "number" &&
      Number.isFinite(RAW.discriminative_property_min_length)
        ? RAW.discriminative_property_min_length
        : FALLBACK.discriminative_property_min_length,
    discriminative_property_keywords: isStringArray(
      RAW.discriminative_property_keywords,
    )
      ? RAW.discriminative_property_keywords
      : FALLBACK.discriminative_property_keywords,
  };
}

/**
 * Build the discriminative-property keyword matcher from the active
 * criteria. Replaces the inline literal in experiment.ts:
 *   /\b(energy|constant|fault|surface|vacancy|modulus|stacking)\b/i
 * Case-insensitive, word-boundary anchored, identical by default.
 */
export function discriminativePropertyPattern(): RegExp {
  const { discriminative_property_keywords } = getExperimentDesignCriteria();
  return new RegExp(
    "\\b(" + discriminative_property_keywords.join("|") + ")\\b",
    "i",
  );
}
