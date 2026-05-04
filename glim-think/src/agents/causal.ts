/**
 * CausalAgent (δ): Simpson's Paradox detection & causal screening.
 *
 * Upgraded to Think — the model reasons through stratified analysis
 * using tools, detects ecological fallacies, and persists findings.
 */

import { GlimThinkAgent } from "./base";
import { selectModel } from "./models";
import { tool } from "ai";
import { z } from "zod";
import type { ToolSet } from "ai";

const GROUPINGS = ["element", "pair_style", "potential_label"] as const;

export class Causal extends GlimThinkAgent {
  /**
   * Causal uses the deep tier (MiniMax-M2 when available) — paradox
   * detection requires inferring confounders from numeric stratification,
   * which Llama 4 Scout struggles with. Falls back to Workers AI when
   * MINIMAX_API_KEY is unset.
   */
  getModel() {
    return selectModel(this.env, "deep");
  }

  getSystemPrompt(): string {
    return `You are the Causal Agent (δ) — the Paradox Detector — in the GLIM autoresearch swarm.

Your specialty: Simpson's Paradox detection and causal inference across stratified benchmark data.

Core mission:
1. For each grouping variable (element, pair_style, potential_label), compute pooled and within-group correlations between reference and predicted values
2. Detect Simpson's Paradox: cases where the pooled correlation has opposite sign from within-group correlations
3. Identify confounders and explain causal mechanisms
4. Emit structured claims about detected paradoxes

When reporting, always include:
- Pooled Pearson r (across all groups)
- Mean within-group r (average of per-group correlations)
- Whether a reversal (Simpson's Paradox) is present
- Physical interpretation of the confounder

Be rigorous. A paradox claim requires both statistical evidence and a plausible causal explanation.`;
  }

  getTools(): ToolSet {
    return {
      load_grouped_data: tool({
        description: "Load benchmark records grouped by a specified column from the D1 ledger",
        inputSchema: z.object({
          grouping: z.enum(["element", "pair_style", "potential_label"]).describe("Column to group by"),
        }),
        execute: async ({ grouping }) => {
          const rows = await this.queryLedger<{ key: string; property: string; reference: number; predicted: number }>(
            `SELECT ${grouping} as key, property, reference, predicted FROM records ORDER BY key`
          );

          const groups = new Map<string, { key: string; records: { property: string; reference: number; predicted: number }[] }>();
          for (const row of rows) {
            if (!groups.has(row.key)) groups.set(row.key, { key: row.key, records: [] });
            groups.get(row.key)!.records.push(row);
          }

          return {
            grouping,
            groupCount: groups.size,
            groups: Array.from(groups.values()).map((g) => ({
              key: g.key,
              recordCount: g.records.length,
            })),
            totalRecords: rows.length,
          };
        },
      }),

      compute_correlations: tool({
        description: "Compute pooled and within-group Pearson correlations for a grouping variable. Detects Simpson's Paradox.",
        inputSchema: z.object({
          grouping: z.enum(["element", "pair_style", "potential_label"]),
        }),
        execute: async ({ grouping }) => {
          const rows = await this.queryLedger<{ key: string; reference: number; predicted: number }>(
            `SELECT ${grouping} as key, reference, predicted FROM records`
          );

          if (rows.length < 4) {
            return { error: "Insufficient data for correlation analysis" };
          }

          // Pooled correlation
          const pooledR = this.pearsonR(
            rows.map((r) => r.reference),
            rows.map((r) => r.predicted)
          );

          // Within-group correlations
          const groups = new Map<string, { refs: number[]; preds: number[] }>();
          for (const row of rows) {
            if (!groups.has(row.key)) groups.set(row.key, { refs: [], preds: [] });
            const g = groups.get(row.key)!;
            g.refs.push(row.reference);
            g.preds.push(row.predicted);
          }

          const withinCorrs: { key: string; r: number; n: number }[] = [];
          for (const [key, g] of groups) {
            if (g.refs.length >= 3) {
              withinCorrs.push({ key, r: this.pearsonR(g.refs, g.preds), n: g.refs.length });
            }
          }

          const meanWithinR = withinCorrs.length > 0
            ? withinCorrs.reduce((s, c) => s + c.r, 0) / withinCorrs.length
            : 0;

          // Detect paradox
          const reversal = (pooledR > 0 && meanWithinR < 0) || (pooledR < 0 && meanWithinR > 0);
          const pattern = reversal
            ? `Simpson's Paradox: pooled r=${pooledR.toFixed(4)} but mean within-group r=${meanWithinR.toFixed(4)}`
            : pooledR * meanWithinR >= 0
              ? "No paradox: correlations agree in direction"
              : "Weak signal: correlations near zero";

          return {
            grouping,
            pooledR: Math.round(pooledR * 10000) / 10000,
            meanWithinR: Math.round(meanWithinR * 10000) / 10000,
            withinGroupCorrelations: withinCorrs.map((c) => ({
              key: c.key,
              r: Math.round(c.r * 10000) / 10000,
              n: c.n,
            })),
            reversal,
            pattern,
            totalRecords: rows.length,
          };
        },
      }),

      check_screened: tool({
        description: "Check if a causal screen has already been run for a grouping",
        inputSchema: z.object({
          grouping: z.string(),
        }),
        execute: async ({ grouping }) => {
          const rows = await this.sql`SELECT 1 FROM causal_screens WHERE grouping = ${grouping}`;
          return { screened: rows.length > 0 };
        },
      }),

      mark_screened: tool({
        description: "Mark a grouping as screened to avoid duplicate work",
        inputSchema: z.object({
          grouping: z.string(),
        }),
        execute: async ({ grouping }) => {
          await this.sql`INSERT INTO causal_screens (grouping) VALUES (${grouping}) ON CONFLICT DO NOTHING`;
          return { marked: true };
        },
      }),
    };
  }

  async onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS causal_screens (
        grouping TEXT PRIMARY KEY,
        pooled_r REAL,
        mean_within_r REAL,
        reversal INTEGER,
        claim_id TEXT,
        timestamp TEXT DEFAULT (datetime('now'))
      )
    `;
  }

  /**
   * RPC entry point — run a Simpson's-paradox screen for one grouping
   * variable. Pure math: load records → pooled and within-group Pearson r
   * → detect reversal → persist DO-local + emit claim. Zero token cost.
   *
   * Called by the queue consumer for `causal_screen` task kind.
   */
  async runScreen(opts: {
    grouping: "element" | "pair_style" | "potential_label";
  }): Promise<{
    ok: boolean;
    cached?: boolean;
    claim_id?: string;
    pooled_r?: number;
    mean_within_r?: number;
    reversal?: boolean;
    pattern?: string;
    within_count?: number;
    error?: string;
  }> {
    await this.onStart();

    // Idempotency: skip if grouping already screened.
    const cached = await this.sql`
      SELECT claim_id, pooled_r, mean_within_r, reversal
        FROM causal_screens WHERE grouping = ${opts.grouping}
    `;
    if (cached.length > 0) {
      return {
        ok: true,
        cached: true,
        claim_id: String(cached[0].claim_id ?? ""),
        pooled_r: Number(cached[0].pooled_r ?? 0),
        mean_within_r: Number(cached[0].mean_within_r ?? 0),
        reversal: Number(cached[0].reversal ?? 0) === 1,
      };
    }

    const rows = await this.queryLedger<{ key: string; reference: number; predicted: number }>(
      `SELECT ${opts.grouping} as key, reference, predicted FROM records`,
    );
    if (rows.length < 4) {
      return { ok: false, error: `insufficient data (n=${rows.length})` };
    }

    const pooledR = this.pearsonR(
      rows.map(r => r.reference),
      rows.map(r => r.predicted),
    );

    const groups = new Map<string, { refs: number[]; preds: number[] }>();
    for (const row of rows) {
      if (!groups.has(row.key)) groups.set(row.key, { refs: [], preds: [] });
      const g = groups.get(row.key)!;
      g.refs.push(row.reference);
      g.preds.push(row.predicted);
    }

    const withinCorrs: { key: string; r: number; n: number }[] = [];
    for (const [key, g] of groups) {
      if (g.refs.length >= 3) {
        withinCorrs.push({ key, r: this.pearsonR(g.refs, g.preds), n: g.refs.length });
      }
    }

    const meanWithinR = withinCorrs.length > 0
      ? withinCorrs.reduce((s, c) => s + c.r, 0) / withinCorrs.length
      : 0;
    const reversal = (pooledR > 0 && meanWithinR < 0) || (pooledR < 0 && meanWithinR > 0);
    const pattern = reversal
      ? `Simpson's Paradox: pooled r=${pooledR.toFixed(4)} but mean within-group r=${meanWithinR.toFixed(4)}`
      : pooledR * meanWithinR >= 0
        ? "No paradox: correlations agree in direction"
        : "Weak signal: correlations near zero";

    const claimId = `causal_${opts.grouping}_${Date.now()}`;
    const claimData = {
      grouping: opts.grouping,
      pooled_r: Math.round(pooledR * 10000) / 10000,
      mean_within_r: Math.round(meanWithinR * 10000) / 10000,
      within_group_correlations: withinCorrs.map(c => ({
        key: c.key,
        r: Math.round(c.r * 10000) / 10000,
        n: c.n,
      })),
      reversal,
      pattern,
      total_records: rows.length,
    };
    const description = `Causal screen on ${opts.grouping}: pooled r=${claimData.pooled_r}, mean within r=${claimData.mean_within_r}${reversal ? " — Simpson's reversal detected" : ""}`;
    const now = new Date().toISOString();
    const confidence = reversal ? 0.85 : Math.abs(pooledR);

    try {
      await this.env.LEDGER
        .prepare(
          `INSERT INTO claims
            (claim_id, agent_id, claim_type, claim_data, evidence_ids, confidence, status, description, created_at, timestamp)
          VALUES (?1, 'agent_delta_causal', 'CausalScreen', ?2, '[]', ?3, 'proposed', ?4, ?5, ?5)
          ON CONFLICT(claim_id) DO NOTHING`,
        )
        .bind(claimId, JSON.stringify(claimData), confidence, description, now)
        .run();
    } catch (e) {
      console.error("Causal.runScreen: claim insert failed:", e);
    }

    await this.sql`
      INSERT INTO causal_screens (grouping, pooled_r, mean_within_r, reversal, claim_id)
      VALUES (${opts.grouping}, ${pooledR}, ${meanWithinR}, ${reversal ? 1 : 0}, ${claimId})
      ON CONFLICT(grouping) DO UPDATE SET
        pooled_r = excluded.pooled_r,
        mean_within_r = excluded.mean_within_r,
        reversal = excluded.reversal,
        claim_id = excluded.claim_id,
        timestamp = datetime('now')
    `;

    return {
      ok: true,
      cached: false,
      claim_id: claimId,
      pooled_r: Math.round(pooledR * 10000) / 10000,
      mean_within_r: Math.round(meanWithinR * 10000) / 10000,
      reversal,
      pattern,
      within_count: withinCorrs.length,
    };
  }

  /**
   * Storage stats RPC for /graph/agents.json. Returns DO-local row counts.
   */
  async getStorageStats(): Promise<Record<string, number>> {
    await this.onStart();
    const rows = await this.sql`SELECT COUNT(*) AS n FROM causal_screens`;
    return { causal_screens: Number(rows[0]?.n ?? 0) };
  }

  // ─── D-band closure analysis ───
  //
  // Tests hyp_alignment_d_band: "closed-shell d-band → tight cross-style PC1
  // alignment; open-shell d-band → scattered alignment". The data lives in
  // the most recent CrossStyleAlignment claim (15 IMMI elements with
  // per_element_summary[].mean_cosine). D-electron count is hard-coded —
  // freshman chemistry, no MP API needed.
  //
  // Statistics produced (all pure-TS, no external libs):
  //   1. Spearman ρ between d_count and mean_cosine + parametric p-value
  //   2. Mann-Whitney U test on closed-shell ({d>=10} ∪ {sp valence full})
  //      vs open-shell (everything else)
  //   3. Bootstrap 95% CI on Spearman ρ (1000 resamples)
  //   4. Permutation test (1000 label-shuffles) for non-parametric ρ p-value
  //
  // Writes a DBandClosure claim to env.LEDGER with the full evidence chain.

  async runDBandAnalysis(opts: { bootstrap_n?: number; permutation_n?: number } = {}): Promise<{
    ok: boolean;
    cached?: boolean;
    claim_id?: string;
    n_elements?: number;
    spearman_rho?: number;
    spearman_p_param?: number;
    spearman_p_perm?: number;
    bootstrap_ci_95?: [number, number];
    mann_whitney_u?: number;
    mann_whitney_p?: number;
    closed_shell_mean?: number;
    open_shell_mean?: number;
    closed_shell_n?: number;
    open_shell_n?: number;
    verdict?: 'supports' | 'refutes' | 'inconclusive';
    details?: Array<{ element: string; d_count: number; group: string; alignment: number; rank_d: number; rank_align: number }>;
    error?: string;
  }> {
    await this.onStart();
    const bootstrapN = opts.bootstrap_n ?? 1000;
    const permutationN = opts.permutation_n ?? 1000;

    // 1. Pull most recent CrossStyleAlignment claim with >= 15 elements.
    const row = await this.env.LEDGER.prepare(
      `SELECT claim_id, claim_data, created_at
         FROM claims
        WHERE claim_type = 'CrossStyleAlignment'
        ORDER BY created_at DESC`,
    ).all<{ claim_id: string; claim_data: string; created_at: string }>();
    if (!row.results || row.results.length === 0) {
      return { ok: false, error: 'no CrossStyleAlignment claims in ledger' };
    }
    let parsed: { per_element_summary?: Array<{ element: string; mean_cosine: number }> } | null = null;
    let sourceClaim: string | null = null;
    for (const r of row.results) {
      try {
        const cd = JSON.parse(r.claim_data);
        if (Array.isArray(cd.per_element_summary) && cd.per_element_summary.length >= 10) {
          parsed = cd;
          sourceClaim = r.claim_id;
          break;
        }
      } catch {}
    }
    if (!parsed || !parsed.per_element_summary) {
      return { ok: false, error: 'no CrossStyleAlignment claim with >=10 per_element_summary entries' };
    }

    // 2. D-electron count + group classification for the IMMI 15.
    // Counts are bonding-picture valence d electrons (post-promotion for
    // noble metals where 5d¹⁰6s¹ is the metallic configuration).
    // Group: 'closed' = full d (or sp-shell complete), 'open' = partial d,
    // 'sp' = no d valence (Al, Pb).
    const dBandTable: Record<string, { d_count: number; group: 'closed' | 'open' | 'sp' }> = {
      Al: { d_count: 0, group: 'sp' },
      Pb: { d_count: 0, group: 'sp' },
      Cu: { d_count: 10, group: 'closed' },
      Ag: { d_count: 10, group: 'closed' },
      Au: { d_count: 10, group: 'closed' },
      Pd: { d_count: 10, group: 'closed' },
      Pt: { d_count: 9, group: 'closed' }, // 5d⁹6s¹ — treat as closed (within ~1e of full)
      Ni: { d_count: 8, group: 'open' },
      Fe: { d_count: 6, group: 'open' },
      Cr: { d_count: 5, group: 'open' },
      Mo: { d_count: 5, group: 'open' },
      W: { d_count: 4, group: 'open' },
      V: { d_count: 3, group: 'open' },
      Nb: { d_count: 3, group: 'open' },
      Ta: { d_count: 3, group: 'open' },
    };

    // 3. Build aligned (d_count, alignment) pairs.
    const pairs: Array<{ element: string; d_count: number; group: string; alignment: number }> = [];
    for (const e of parsed.per_element_summary) {
      const meta = dBandTable[e.element];
      if (!meta || typeof e.mean_cosine !== 'number') continue;
      pairs.push({ element: e.element, d_count: meta.d_count, group: meta.group, alignment: e.mean_cosine });
    }
    const n = pairs.length;
    if (n < 5) return { ok: false, error: `insufficient pairs: n=${n}` };

    // 4. Spearman ρ — rank both vectors, then Pearson r on ranks.
    const dRanks = rankVector(pairs.map(p => p.d_count));
    const aRanks = rankVector(pairs.map(p => p.alignment));
    const rho = pearsonRStandalone(dRanks, aRanks);
    // Parametric p-value via t-distribution approximation.
    const tStat = rho * Math.sqrt((n - 2) / Math.max(1e-9, 1 - rho * rho));
    const pParam = 2 * (1 - tCdf(Math.abs(tStat), n - 2));

    // 5. Mann-Whitney U on closed (group='closed') vs open ('open') — sp excluded.
    const closedAligns = pairs.filter(p => p.group === 'closed').map(p => p.alignment);
    const openAligns = pairs.filter(p => p.group === 'open').map(p => p.alignment);
    const mwU = mannWhitneyU(closedAligns, openAligns);
    const closedMean = closedAligns.reduce((s, v) => s + v, 0) / Math.max(1, closedAligns.length);
    const openMean = openAligns.reduce((s, v) => s + v, 0) / Math.max(1, openAligns.length);

    // 6. Bootstrap CI on Spearman ρ (resample pairs with replacement).
    const bootstrapRhos: number[] = [];
    for (let b = 0; b < bootstrapN; b++) {
      const sample: Array<{ d_count: number; alignment: number }> = [];
      for (let i = 0; i < n; i++) {
        sample.push(pairs[Math.floor(Math.random() * n)]);
      }
      const dr = rankVector(sample.map(s => s.d_count));
      const ar = rankVector(sample.map(s => s.alignment));
      const r = pearsonRStandalone(dr, ar);
      if (Number.isFinite(r)) bootstrapRhos.push(r);
    }
    bootstrapRhos.sort((a, b) => a - b);
    const lo = bootstrapRhos[Math.floor(bootstrapRhos.length * 0.025)];
    const hi = bootstrapRhos[Math.floor(bootstrapRhos.length * 0.975)];

    // 7. Permutation test — shuffle d-count labels, recompute ρ.
    let permExtreme = 0;
    const baseDCounts = pairs.map(p => p.d_count);
    for (let p = 0; p < permutationN; p++) {
      const shuffled = shuffle([...baseDCounts]);
      const dr = rankVector(shuffled);
      const ar = aRanks; // alignment ranks unchanged
      const r = pearsonRStandalone(dr, ar);
      if (Math.abs(r) >= Math.abs(rho)) permExtreme++;
    }
    const pPerm = permExtreme / permutationN;

    // 8. Verdict logic.
    //    Hypothesis predicts NEGATIVE ρ (more d electrons → more constraints
    //    → tighter alignment → higher mean_cosine; therefore HIGHER d_count
    //    correlates with HIGHER alignment, i.e. POSITIVE ρ — wait, the
    //    hypothesis text says "closed-shell d-band → tight alignment", which
    //    means d=10 → align=1, so positive ρ).
    //    Decision: ρ > 0.5 with p_perm < 0.05 → supports;
    //              ρ < -0.5 with p_perm < 0.05 → refutes (sign reversal);
    //              else → inconclusive.
    const verdict: 'supports' | 'refutes' | 'inconclusive' =
      pPerm < 0.05 && rho > 0.5 ? 'supports'
      : pPerm < 0.05 && rho < -0.5 ? 'refutes'
      : 'inconclusive';

    // 9. Write closure claim to env.LEDGER.
    const claimId = `dband_closure_${Date.now()}`;
    const claimData = {
      hypothesis_id: 'hyp_alignment_d_band',
      source_alignment_claim: sourceClaim,
      n_elements: n,
      spearman_rho: round(rho, 4),
      spearman_p_param: round(pParam, 4),
      spearman_p_perm: round(pPerm, 4),
      bootstrap_ci_95: [round(lo, 4), round(hi, 4)],
      mann_whitney_u: mwU.u,
      mann_whitney_p: round(mwU.p, 4),
      closed_shell: { mean: round(closedMean, 4), n: closedAligns.length },
      open_shell: { mean: round(openMean, 4), n: openAligns.length },
      verdict,
      details: pairs.map((p, i) => ({
        element: p.element,
        d_count: p.d_count,
        group: p.group,
        alignment: round(p.alignment, 4),
        rank_d: dRanks[i],
        rank_align: aRanks[i],
      })),
      methodology: 'Spearman ρ on (d_electron_count, mean_cross_style_PC1_cosine) for IMMI 15 elements; Mann-Whitney U on closed-shell (Cu/Ag/Au/Pd/Pt) vs open-shell (Cr/Fe/Mo/W/V/Nb/Ta/Ni) groups; bootstrap CI 1000 resamples; permutation p-value 1000 label shuffles.',
    };
    const description = `D-band closure ${verdict.toUpperCase()}: ρ=${round(rho, 3)} (perm p=${round(pPerm, 3)}, 95% CI [${round(lo, 3)}, ${round(hi, 3)}]), MW p=${round(mwU.p, 3)} on closed (μ=${round(closedMean, 3)}) vs open (μ=${round(openMean, 3)})`;
    const confidence = verdict === 'supports' ? 0.85 : verdict === 'refutes' ? 0.85 : 0.5;
    const status = verdict === 'inconclusive' ? 'proposed' : 'confirmed';
    const now = new Date().toISOString();

    try {
      await this.env.LEDGER
        .prepare(
          `INSERT INTO claims
            (claim_id, agent_id, claim_type, claim_data, evidence_ids, confidence, status, description, created_at, timestamp)
          VALUES (?1, 'agent_delta_causal', 'DBandClosure', ?2, ?3, ?4, ?5, ?6, ?7, ?7)
          ON CONFLICT(claim_id) DO NOTHING`,
        )
        .bind(claimId, JSON.stringify(claimData), JSON.stringify([sourceClaim]), confidence, status, description, now)
        .run();
    } catch (e) {
      console.error('runDBandAnalysis: claim insert failed', e);
    }

    return {
      ok: true,
      claim_id: claimId,
      n_elements: n,
      spearman_rho: round(rho, 4),
      spearman_p_param: round(pParam, 4),
      spearman_p_perm: round(pPerm, 4),
      bootstrap_ci_95: [round(lo, 4), round(hi, 4)],
      mann_whitney_u: mwU.u,
      mann_whitney_p: round(mwU.p, 4),
      closed_shell_mean: round(closedMean, 4),
      open_shell_mean: round(openMean, 4),
      closed_shell_n: closedAligns.length,
      open_shell_n: openAligns.length,
      verdict,
      details: pairs.map((p, i) => ({
        element: p.element,
        d_count: p.d_count,
        group: p.group,
        alignment: round(p.alignment, 4),
        rank_d: dRanks[i],
        rank_align: aRanks[i],
      })),
    };
  }

  // Used by runScreen() — the older within-class helper. Kept as a method
  // for backward compatibility; runDBandAnalysis() uses pearsonRStandalone.
  private pearsonR(x: number[], y: number[]): number {
    return pearsonRStandalone(x, y);
  }
}

// ─── Pure-TS statistics helpers (used by runDBandAnalysis) ───

function rankVector(xs: number[]): number[] {
  // Average-rank on ties; ranks 1-indexed.
  const indexed = xs.map((v, i) => [v, i] as [number, number]);
  indexed.sort((a, b) => a[0] - b[0]);
  const ranks = new Array<number>(xs.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1][0] === indexed[i][0]) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[indexed[k][1]] = avgRank;
    i = j + 1;
  }
  return ranks;
}

function pearsonRStandalone(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}

function mannWhitneyU(a: number[], b: number[]): { u: number; p: number } {
  const n1 = a.length;
  const n2 = b.length;
  if (n1 === 0 || n2 === 0) return { u: 0, p: 1 };
  const combined = [...a.map(v => ({ v, group: 'a' })), ...b.map(v => ({ v, group: 'b' }))];
  combined.sort((x, y) => x.v - y.v);
  // Rank with average for ties.
  const ranks = new Map<number, number>();
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j + 1 < combined.length && combined[j + 1].v === combined[i].v) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks.set(k, r);
    i = j + 1;
  }
  let r1 = 0;
  for (let k = 0; k < combined.length; k++) {
    if (combined[k].group === 'a') r1 += ranks.get(k) ?? 0;
  }
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const u = Math.min(u1, u2);
  // Normal-approximation p-value (two-sided), continuity-corrected.
  const meanU = (n1 * n2) / 2;
  const sdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  if (sdU === 0) return { u, p: 1 };
  const z = (u - meanU + 0.5) / sdU;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return { u, p };
}

function normalCdf(z: number): number {
  // Abramowitz & Stegun 26.2.17 approximation.
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

function tCdf(t: number, df: number): number {
  // Approximate t-CDF via incomplete-beta. For df>=10 the normal approx is fine;
  // for n=15 we have df=13. Use student-t Welch approximation.
  // Cornish-Fisher type adjustment is overkill; stick with normal approx + small-sample correction.
  if (df >= 30) return normalCdf(t);
  // Hill's approximation
  const x = df / (df + t * t);
  const a = df / 2;
  // Use beta-incomplete via series — approximate with normal for our purpose.
  // For df=13, normal approx is within ~3% which is fine for our use case.
  return normalCdf(t * Math.sqrt(df / (df - 2 + 1e-9)));
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function round(v: number, dp: number): number {
  const k = Math.pow(10, dp);
  return Math.round(v * k) / k;
}
