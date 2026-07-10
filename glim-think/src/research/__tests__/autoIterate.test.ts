/**
 * Target-selection tests for the in-worker auto-iterate cron.
 *
 * pickAutoIterateTarget is pure, so every selection rule is testable
 * without D1/LLM fakes:
 *   1. Refuted/confirmed hypotheses are never picked.
 *   2. Momentum scoring ranks by high_rel*10 + insights + confidence*5.
 *   3. Among the top 3, the least-saturated (fewest hi-rel) wins.
 *   4. Ties break toward the lower insight_count.
 *   5. Full saturation (all >= 5 hi-rel) falls back to lowest confidence.
 *   6. Empty/settled portfolios return null.
 */
import { describe, it, expect } from "vitest";
import { pickAutoIterateTarget } from "../autoIterate";
import type { LeanStatusEntry } from "../insights";

function entry(over: Partial<LeanStatusEntry> & { hypothesis_id: string }): LeanStatusEntry {
  return {
    hypothesis_title: over.hypothesis_id,
    status: "testing",
    confidence: null,
    insight_count: 0,
    high_relevance_count: 0,
    recent_claim_id: null,
    ...over,
  };
}

describe("pickAutoIterateTarget", () => {
  it("returns null when the portfolio is empty or fully settled", () => {
    expect(pickAutoIterateTarget([])).toBeNull();
    expect(
      pickAutoIterateTarget([
        entry({ hypothesis_id: "h1", status: "refuted", high_relevance_count: 4 }),
        entry({ hypothesis_id: "h2", status: "confirmed", high_relevance_count: 4 }),
      ]),
    ).toBeNull();
  });

  it("never picks refuted or confirmed hypotheses even at high momentum", () => {
    const pick = pickAutoIterateTarget([
      entry({ hypothesis_id: "settled", status: "refuted", high_relevance_count: 4, insight_count: 40, confidence: 0.9 }),
      entry({ hypothesis_id: "live", status: "proposed", insight_count: 1 }),
    ]);
    expect(pick?.hypothesis_id).toBe("live");
  });

  it("deepens the least-saturated hypothesis among the top 3 by momentum", () => {
    const pick = pickAutoIterateTarget([
      entry({ hypothesis_id: "leader", high_relevance_count: 4, insight_count: 20, confidence: 0.8 }),
      entry({ hypothesis_id: "runner-up", high_relevance_count: 3, insight_count: 15, confidence: 0.7 }),
      entry({ hypothesis_id: "third", high_relevance_count: 2, insight_count: 10, confidence: 0.6 }),
      entry({ hypothesis_id: "laggard", high_relevance_count: 0, insight_count: 1, confidence: null }),
    ]);
    // "laggard" is outside the top 3; "third" has the fewest hi-rel inside it.
    expect(pick?.hypothesis_id).toBe("third");
  });

  it("breaks hi-rel ties toward the lower insight_count", () => {
    const pick = pickAutoIterateTarget([
      entry({ hypothesis_id: "wide", high_relevance_count: 2, insight_count: 30 }),
      entry({ hypothesis_id: "narrow", high_relevance_count: 2, insight_count: 5 }),
    ]);
    expect(pick?.hypothesis_id).toBe("narrow");
  });

  it("falls back to lowest confidence when everything is saturated", () => {
    const pick = pickAutoIterateTarget([
      entry({ hypothesis_id: "sure", high_relevance_count: 6, confidence: 0.9 }),
      entry({ hypothesis_id: "shaky", high_relevance_count: 5, confidence: 0.4 }),
      entry({ hypothesis_id: "mid", high_relevance_count: 7, confidence: 0.6 }),
    ]);
    expect(pick?.hypothesis_id).toBe("shaky");
    expect(pick?.reason).toContain("saturated");
  });

  it("treats null confidence as zero in momentum scoring", () => {
    // Identical except confidence: null must not outrank 0.1.
    const pick = pickAutoIterateTarget([
      entry({ hypothesis_id: "no-conf", high_relevance_count: 1, insight_count: 8, confidence: null }),
      entry({ hypothesis_id: "low-conf", high_relevance_count: 1, insight_count: 8, confidence: 0.1 }),
    ]);
    // Both land in the top 3 with equal hi-rel and insights; the sort is
    // stable so the first entry wins — the point is no NaN/throw on null.
    expect(pick).not.toBeNull();
    expect(Number.isFinite(pick!.score)).toBe(true);
  });
});
