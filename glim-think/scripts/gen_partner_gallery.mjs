#!/usr/bin/env node
/**
 * Run the partner-vertical image gallery for the dichotomy round.
 *
 * Generates seven image-01 stills, each tied to a partner-facing slice
 * of the element-intrinsic-vs-form-intrinsic alignment story, then
 * ingests each as a Claim of type 'PartnerVerticalIllustration' so
 * /feed/recent-claims surfaces them on /live with image_url set.
 */
const WORKER = process.env.WORKER_URL ?? "https://glim-think-v1.aw-ab5.workers.dev";

const GALLERY = [
  {
    slug: "dichotomy-periodic-table",
    title: "Element trust map: aligned vs disordered",
    description:
      "Periodic-table layout figure of the IMMI element-intrinsic alignment dichotomy. Au/Ag/Pt/Pb/Ta/Nb/Cr cells contain a tight diagonal scatter (high cross-style PC1 alignment); Al/W/Fe/Ni cells contain a diffuse cloud (low alignment). The visual deliverable for partners deciding which elements need MLIP investment vs classical EAM sufficiency.",
    prompt: [
      "Scientific journal figure: periodic-table-shaped grid of small inset scatter plots on a white background.",
      "Each cell is bordered with thin black lines and contains a miniature x-y scatter subplot with thin axes and faint gridlines.",
      "Eight cells (corresponding to Au, Ag, Pt, Pb, Ta, Nb, Cr) show ~30 filled circles tightly clustered along a y=x diagonal line, drawn in muted steel blue.",
      "Four cells (Al, W, Fe, Ni) show ~30 filled circles in a diffuse uncorrelated cloud, drawn in muted orange.",
      "Sans-serif element symbols at the top-left of each occupied cell. Empty cells are blank white.",
      "Matplotlib publication style, no glow, no shading, no luminous effects, no cinematic lighting. 16:9.",
    ].join(" "),
    aspect: "16:9",
  },
  {
    slug: "battery-cathode-risk",
    title: "Battery cathode risk: Ni/Fe/Co are open-d-shell",
    description:
      "Crystal-structure schematic of a layered Li-ion cathode (LiNiO2-type). Transition-metal sites are drawn with a dashed uncertainty radius indicating their position on the disordered side of the IMMI dichotomy — they need MLIP investment, not legacy EAM.",
    prompt: [
      "Scientific crystal-structure schematic in the style of VESTA or ASE rendering, on a white background.",
      "Side-view of a layered cathode (LiNiO2-type). Lithium atoms drawn as small filled gray circles between the layers.",
      "Transition-metal atoms (Ni, Fe, Co) drawn as larger filled blue circles, each surrounded by a thin dashed concentric circle indicating prediction-uncertainty radius.",
      "Oxygen atoms drawn as small open red circles. Thin black lines drawn between bonded atoms; octahedral coordination edges shown as thin solid lines.",
      "Crystallographic axis arrows (a, b, c) in the lower-left corner with sans-serif tick labels.",
      "Publication-quality technical drawing, no glow, no atmospheric effects, no perspective lighting. 16:9.",
    ].join(" "),
    aspect: "16:9",
  },
  {
    slug: "aerospace-refractory-mixed",
    title: "Aerospace refractories: Ta/Nb stable, W/Mo wobble",
    description:
      "Polycrystalline microstructure heatmap showing prediction-error magnitude per grain. Ta/Nb grains shaded low-error; W/Mo grains shaded high-error. Aerospace partners running CFD-coupled MD on superalloys need to see this asymmetric trust profile.",
    prompt: [
      "Scientific figure: top-down 2D Voronoi tessellation polycrystalline microstructure on a white background.",
      "Approximately 25 irregular polygonal grains with thin black grain boundaries, no gradients, no shading.",
      "Each grain is uniformly filled with a flat color from a sequential viridis colormap encoding prediction-error magnitude.",
      "Roughly half the grains are dark blue (low error, Ta/Nb-like); the other half are yellow-green (high error, W/Mo-like).",
      "A thin vertical colorbar on the right with sans-serif numerical tick labels (no other text).",
      "A short scale bar in the lower-left corner. Matplotlib publication style, no glow, no atmospheric effects. 16:9.",
    ].join(" "),
    aspect: "16:9",
  },
  {
    slug: "semiconductor-bonding-safe",
    title: "Semiconductor interconnects: closed-shell safe deployment",
    description:
      "Side-view schematic of a gold wire-bond between two silicon die regions, with a tight prediction-vs-truth scatter inset. Au/Ag/Cu/Pt are the closed-shell aligned group — semiconductor partners can keep using legacy EAM with confidence.",
    prompt: [
      "Scientific figure: side-view 2D engineering schematic of a gold wire bond connecting two silicon die regions, on a white background.",
      "Two horizontal silicon die blocks at the bottom drawn with thin black borders and a hatched fill pattern indicating crystalline structure.",
      "A smooth curved wire arches between them, drawn as a single solid steel-blue line with thin error-band envelope around it.",
      "Inset scatter plot in the upper-right corner showing a tight diagonal cluster of small filled circles along y=x, with thin black axes and tick marks (no axis numbers).",
      "Coordinate axis arrows (x, z) in the lower-left corner. Sans-serif technical drawing style.",
      "Publication-quality engineering schematic, no glow, no rim lighting, no atmospheric effects. 16:9.",
    ].join(" "),
    aspect: "16:9",
  },
  {
    slug: "d-band-mechanism",
    title: "Mechanism: d-band fullness governs alignment",
    description:
      "Density-of-states (DOS) plot overlaying two d-band shapes: closed-shell narrow peak (constrained parameterization, tight alignment) vs open-shell broad distribution (unconstrained, scattered alignment). The proposed physical mechanism for hyp_alignment_d_band.",
    prompt: [
      "Scientific publication figure: density-of-states (DOS) plot on a white background.",
      "Single panel with thin black axes, faint gridlines, and sans-serif tick numbers on both axes.",
      "X-axis labeled with Greek-letter style 'E - E_F (eV)' running roughly -6 to +4. Y-axis labeled 'DOS (states/eV)'.",
      "Two filled curves overlaid in the same panel: one is a tall narrow Gaussian-shape peak filled steel blue at 50% opacity with a solid dark blue outline; the other is a broad shallow distribution filled orange at 50% opacity with a solid dark orange outline.",
      "Vertical black dashed line at E_F = 0. Small legend box in the upper-right with two short colored line samples and minimal sans-serif labels.",
      "Matplotlib publication style, no glow, no shading, no luminous effects. 16:9.",
    ].join(" "),
    aspect: "16:9",
  },
  {
    slug: "simpsons-trap",
    title: "The Simpson's trap of one-number benchmarking",
    description:
      "Two-panel scatter plot: left panel shows pooled data with no apparent correlation (r=0.05 across all pair_styles); right panel shows the same data colored by pair_style and resolved into 12 tight diagonal lines (within-style r>0.9). The visual case for stratified benchmarking.",
    prompt: [
      "Scientific publication figure: two side-by-side scatter plot panels labeled (a) and (b) in the upper-left of each panel.",
      "White background, thin black axes with tick marks and faint gridlines on both panels. Sans-serif numeric tick labels. Both panels share x-axis 'reference' and y-axis 'predicted'.",
      "Left panel (a): approximately 500 small filled circles, all uniform medium-gray, scattered as an uncorrelated cloud filling the plot area. A horizontal best-fit line drawn near the middle indicating near-zero slope.",
      "Right panel (b): the same 500 points re-colored into 12 distinct categorical groups using a colorbrewer Set3 or Tab10 palette; each color forms a tight diagonal cluster along its own y=x-style line, with thin matching-colored regression lines drawn through each cluster.",
      "Small legend box in the right panel with 12 short colored line samples (no readable text, just colors).",
      "Matplotlib publication-quality figure, no glow, no luminous effects. 16:9.",
    ].join(" "),
    aspect: "16:9",
  },
  {
    slug: "partner-trust-matrix",
    title: "Partner trust matrix: the deliverable",
    description:
      "Heatmap: rows = partner verticals (battery, aerospace, semiconductor); columns = element classes (closed-shell, refractory-ordered, open-d-shell, refractory-disordered); cells colored by recommended-action (green = legacy EAM safe, yellow = caution + validate, red = MLIP required).",
    prompt: [
      "Scientific publication figure: 3-row × 4-column heatmap on a white background.",
      "Each cell is a flat-colored rectangle separated by thin white grid lines, with a thin black border around the full matrix.",
      "Cell colors drawn from a sequential RdYlGn colorbrewer palette: green for low risk, yellow for medium, red for high risk. Cell colors vary independently per cell — not a smooth gradient.",
      "Sans-serif row tick labels along the left side and column tick labels along the bottom (short minimal text, blank if illegible).",
      "Vertical colorbar on the right with sans-serif numerical tick labels indicating the risk scale.",
      "Matplotlib seaborn.heatmap publication style, no glow, no atmospheric effects, no luminous shading. 16:9.",
    ].join(" "),
    aspect: "16:9",
  },
];

async function generateOne(item) {
  const storageKey = `claim-images/${item.slug}-${Date.now()}.png`;
  const url = new URL(`${WORKER}/admin/test-image`);
  url.searchParams.set("prompt", item.prompt);
  // /admin/test-image picks its own storageKey, so we instead call image generation
  // through a custom flow: post to /admin/test-image with prompt, capture r2_key.
  const res = await fetch(url, { method: "POST" });
  const json = await res.json();
  if (!json.ok) {
    return { ok: false, slug: item.slug, error: json.error };
  }
  return {
    ok: true,
    slug: item.slug,
    title: item.title,
    description: item.description,
    r2_key: json.r2_key,
    r2_url: json.r2_url,
    latency_ms: json.latency_ms,
  };
}

async function ingestClaim(generated, claimNonce) {
  const claim = {
    claim_id: `partner_illustration_${generated.slug}_${claimNonce}`,
    agent_id: "theorist+minimax-image-01",
    claim_type: "PartnerVerticalIllustration",
    description: `${generated.title} — ${generated.description}`,
    confidence: 0.85,
    claim_data: {
      slug: generated.slug,
      title: generated.title,
      narrative: generated.description,
      image_key: generated.r2_key,
      r2_url: generated.r2_url,
      generated_by: "minimax-image-01",
      generation_latency_ms: generated.latency_ms,
    },
    evidence_ids: [],
    status: "proposed",
  };
  const res = await fetch(`${WORKER}/claims/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claims: [claim] }),
  });
  return res.json();
}

async function main() {
  const nonce = Date.now();
  const results = await Promise.all(GALLERY.map((g) => generateOne(g)));
  const ok = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);
  console.log(JSON.stringify({ generated: ok.length, failed: fail.length, fail }, null, 2));

  const ingested = [];
  for (const g of ok) {
    const r = await ingestClaim(g, nonce);
    ingested.push({ slug: g.slug, r2_url: g.r2_url, ingest: r });
  }
  console.log(JSON.stringify({ ingested }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
