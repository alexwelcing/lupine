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
      "Periodic-table-shaped illustration of the IMMI element-intrinsic alignment dichotomy. Au/Ag/Pt/Pb/Ta/Nb/Cr glow tightly aligned (cyan ribbons), Al/W/Fe/Ni shown as scattered open clouds (amber dispersion). The visual deliverable for partners deciding which elements need MLIP investment vs classical EAM sufficiency.",
    prompt: [
      "Abstract scientific data visualization arranged in a warped periodic-table grid against a dark navy background.",
      "Cyanotype monochrome with cyan and pale-blue accents for ordered elements,",
      "amber and warm-gold accents for disordered elements.",
      "Eight cells with tight glowing ribbons (closed-shell aligned: gold, silver, platinum, lead, tantalum, niobium, chromium).",
      "Four cells with diffuse scattered point clouds (open-d-shell disordered: aluminum, tungsten, iron, nickel).",
      "Sharp visual contrast between order and dispersion. Geometric precision, no text, no human figures, no labels.",
      "16:9 cinematic, scientific paper aesthetic.",
    ].join(" "),
    aspect: "16:9",
  },
  {
    slug: "battery-cathode-risk",
    title: "Battery cathode risk: Ni/Fe/Co are open-d-shell",
    description:
      "Li-ion cathode lattice rendered with the transition-metal sites flickering as uncertain probability clouds. The exact elements (Ni, Fe, Co) that dominate next-gen battery chemistry sit on the disordered side of the IMMI dichotomy — they need MLIP investment, not legacy EAM.",
    prompt: [
      "Cinematic abstract visualization of a layered Li-ion cathode crystal lattice in a vacuum chamber.",
      "Lithium sites between layers shown as small steady cyan beads.",
      "Transition-metal sites (the heavy atoms) shown as flickering, uncertain probability clouds in warm amber and dim red — visualizing prediction uncertainty.",
      "Octahedral coordination geometry visible. Subtle glow of statistical uncertainty around the heavy atoms.",
      "Dark navy background, cyanotype palette with amber accents.",
      "No text, no labels, scientific paper aesthetic, 16:9.",
    ].join(" "),
    aspect: "16:9",
  },
  {
    slug: "aerospace-refractory-mixed",
    title: "Aerospace refractories: Ta/Nb stable, W/Mo wobble",
    description:
      "Turbine-blade-like polycrystalline microstructure where some refractory grains glow stable cyan (Ta, Nb) and adjacent grains in W/Mo flicker with prediction error. Aerospace partners running CFD-coupled MD on superalloys need to know the asymmetric trust profile across refractories.",
    prompt: [
      "Abstract polycrystalline microstructure resembling a cross-section of a high-temperature turbine alloy.",
      "Some grains glow with stable, tightly bounded cyan light (refractory ordered group).",
      "Adjacent grains flicker with chaotic warm amber and red interference patterns (refractory disordered group).",
      "Sharp grain boundaries delineate the regions. Subtle thermal gradient suggested through color temperature.",
      "Dark navy background, cyanotype with amber, scientific cinematic aesthetic.",
      "No text, no labels, 16:9.",
    ].join(" "),
    aspect: "16:9",
  },
  {
    slug: "semiconductor-bonding-safe",
    title: "Semiconductor interconnects: closed-shell safe deployment",
    description:
      "Gold wire-bond rendered as a tightly aligned cyan ribbon connecting two silicon die regions. Au/Ag/Cu/Pt are the closed-shell aligned group — semiconductor partners can keep using legacy EAM with confidence. The 'safe' deployment recommendation.",
    prompt: [
      "Abstract render of a gold wire bond arching between two silicon die regions on a chip.",
      "The wire is rendered as a single tightly-aligned ribbon of cyan light, geometric and clean.",
      "Silicon die surfaces shown as deep navy with subtle crystalline highlights.",
      "Background suggests a clean-room precision context. The cyan ribbon is the visual metaphor for tight prediction-vs-truth alignment.",
      "Cyanotype monochrome with cyan accents, no amber dispersion (this is the safe class).",
      "No text, no labels, scientific cinematic aesthetic, 16:9.",
    ].join(" "),
    aspect: "16:9",
  },
  {
    slug: "d-band-mechanism",
    title: "Mechanism: d-band fullness governs alignment",
    description:
      "Density-of-states diagram showing two contrasting d-band shapes — closed-shell narrow peak (constrained parameterization, tight alignment) vs open-shell broad smear (unconstrained, scattered alignment). The proposed physical mechanism for hyp_alignment_d_band.",
    prompt: [
      "Abstract scientific data visualization of two contrasting electronic density-of-states curves.",
      "Left curve: a narrow, sharp, tightly-bounded peak in cyan (closed-shell d-band, constrained parameterization).",
      "Right curve: a broad, smeared, fuzzy distribution in warm amber (open-shell d-band, unconstrained parameterization).",
      "Energy axis horizontal, density axis vertical, Fermi level marked as a vertical line.",
      "Dark navy background, cyanotype with amber accents, geometric precision.",
      "No text labels on curves, no human figures, scientific paper aesthetic, 16:9.",
    ].join(" "),
    aspect: "16:9",
  },
  {
    slug: "simpsons-trap",
    title: "The Simpson's trap of one-number benchmarking",
    description:
      "Two-panel reveal: left panel shows an apparently random scatter (pooled r=0.05 across all pair_styles); right panel shows the same data resolved into 12 clean diagonal lines (within-style r>0.9). The visual case for stratified benchmarking, the IMMI thesis distilled into one frame.",
    prompt: [
      "Two-panel scientific data visualization split horizontally.",
      "Left panel: a chaotic random scatter of small luminous points against dark navy — visually suggesting zero correlation, dispersed dim cyan dots.",
      "Right panel: the same point cloud resolved into approximately twelve clean parallel diagonal stripes, each a different glowing color (cyan, amber, violet, gold, teal), each stripe tightly correlated.",
      "Dramatic contrast between the two panels. Sharp visual reveal — same data, different stratification.",
      "Dark navy background, multi-hue accents, scientific paper aesthetic, no text, no labels, 16:9.",
    ].join(" "),
    aspect: "16:9",
  },
  {
    slug: "partner-trust-matrix",
    title: "Partner trust matrix: the deliverable",
    description:
      "Grid: rows = partner verticals (battery, aerospace, semiconductor); columns = element classes (closed-shell, refractory-ordered, open-d-shell, refractory-disordered); cells colored by recommended-action (cyan = legacy EAM safe, amber = caution + validate, red = MLIP required). The procurement-grade artifact distilled from the round.",
    prompt: [
      "Abstract rendering of a 3-by-4 grid matrix on a dark navy background.",
      "Each cell glows a distinct color: some cells radiate steady cyan light (safe), others flicker amber (caution), a few pulse with deep red (high risk).",
      "The grid is geometric and architectural, suggesting a procurement decision matrix.",
      "Subtle hexagonal lattice pattern in the background hints at materials science.",
      "Cyanotype palette with amber and crimson accents for risk gradients.",
      "No text, no labels, no human figures, scientific cinematic aesthetic, 16:9.",
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
