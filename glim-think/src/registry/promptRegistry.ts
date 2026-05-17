/**
 * Prompt/criteria registry — the actuation substrate for the self-improving
 * eval loop.
 *
 * Agents read their system prompt through `getPrompt(agentClass)` instead of
 * hardcoding it. The active variant per agent is pointed to by active.json;
 * the variant text lives in src/registry/prompts/<Class>.<variant>.md and is
 * compiled into prompts.gen.ts (Worker bundles can't read .md at runtime).
 *
 * The Evolver (evals/evolver.ts) closes the loop: it writes a new
 * <Class>.<variant>.md, bumps active.json, and the CI deploy regenerates
 * prompts.gen.ts so the new prompt is live — confined to src/registry/ by the
 * Evolver's path allowlist, with the regression gate as backstop.
 *
 * Resolution order for getPrompt(cls):
 *   PROMPTS[`${cls}.${active[cls]}`]  →  PROMPTS[`${cls}.v1`]
 *   →  PROMPTS["GlimThinkAgent.v1"] (base default)  →  hard fallback string.
 */
import active from "./active.json";
import { PROMPTS } from "./prompts.gen";

const ACTIVE = active as Record<string, string>;

const BASE_KEY = "GlimThinkAgent";
const HARD_FALLBACK =
  "You are a research agent in the GLIM autoresearch swarm. You analyze " +
  "interatomic potentials, detect statistical anomalies, generate " +
  "hypotheses, and propose discriminative experiments. Be precise, " +
  "quantitative, and cite evidence.";

/**
 * Resolve the active system prompt for an agent class (e.g. "Theorist").
 * Agents not present in the registry (Manifold, Experiment) fall back to
 * the base default — identical to their prior inherited behavior.
 */
export function getPrompt(agentClass: string): string {
  const variant = ACTIVE[agentClass] ?? "v1";
  return (
    PROMPTS[`${agentClass}.${variant}`] ??
    PROMPTS[`${agentClass}.v1`] ??
    PROMPTS[`${BASE_KEY}.${ACTIVE[BASE_KEY] ?? "v1"}`] ??
    PROMPTS[`${BASE_KEY}.v1`] ??
    HARD_FALLBACK
  ).trim();
}

/** The active variant id for an agent (for telemetry / the Evolver). */
export function activeVariant(agentClass: string): string {
  return ACTIVE[agentClass] ?? "v1";
}
