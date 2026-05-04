/**
 * Slideshow image batch — generates ~100 diverse MiniMax image-01
 * stills for the public /slideshow surface. Categorized prompts span
 * scientific paper figures, crystal structures, manifold geometry,
 * causal-inference visuals, architecture diagrams, lupine-brand
 * portraits, and cinematic abstract aesthetics.
 *
 * Concurrency-bounded (default 5 in flight) to respect the MiniMax
 * shared budget. Each call writes to R2 under `slideshow/{slug}.png`
 * and persists a row in `slideshow_images` with prompt + category +
 * status. The /research/slideshow.json endpoint serves the manifest.
 */
import type { Env } from "../types";
import { generateAndStoreImage } from "../agents/image";

export interface SlideshowPrompt {
  slug: string;
  category: string;
  palette: string;
  aspect: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  prompt: string;
}

// ─── 100 prompts across 10 categories ───
//
// Style guidelines:
//   - Scientific paper figures: matplotlib-aesthetic, white bg, thin axes,
//     no glow, no luminous effects. Used for the data-heavy categories.
//   - Cinematic abstract: dark navy, cyan/amber, dramatic lighting. Used
//     for the brand/aesthetic categories.
//   - Crystal-structure schematics: VESTA/ASE-style, white bg, atom CPK colors.
//   - Brand portraits: painterly ink-wash, monochrome accent, no text.

export const SLIDESHOW_PROMPTS: SlideshowPrompt[] = [
  // ─── 1. IMMI element portraits (10) — closed-shell vs open-shell mix ───
  { slug: "el-au", category: "elements", palette: "gold-amber", aspect: "1:1",
    prompt: "Stylized scientific portrait of the element Gold (Au): face-centered cubic crystal lattice rendered as a translucent gold-amber gradient, atomic orbital lobes (5d10 6s1) drawn as overlapping ellipses behind the lattice, periodic-table cell label 'Au 79' in the lower-left, dark navy background, painterly oil texture, no other text." },
  { slug: "el-cu", category: "elements", palette: "copper", aspect: "1:1",
    prompt: "Stylized scientific portrait of Copper (Cu): FCC crystal with octahedral coordination, copper-orange metallic sheen, electron cloud halo, periodic-table cell 'Cu 29' overlay, deep brown background, technical illustration aesthetic." },
  { slug: "el-fe", category: "elements", palette: "iron-rust", aspect: "1:1",
    prompt: "Stylized portrait of Iron (Fe): body-centered cubic crystal with magnetic domain swirls in the background, iron-grey to rust gradient, ferromagnetic field lines, atomic symbol 'Fe 26' bottom-left, dark background, mineral-photography aesthetic." },
  { slug: "el-ni", category: "elements", palette: "nickel-silver", aspect: "1:1",
    prompt: "Stylized portrait of Nickel (Ni): FCC lattice in cool silver, ferromagnetic Curie-temperature visualization (faint warming gradient), atomic symbol 'Ni 28', dark teal background, scientific-illustration style." },
  { slug: "el-pt", category: "elements", palette: "platinum", aspect: "1:1",
    prompt: "Stylized portrait of Platinum (Pt): FCC structure, brilliant cool platinum sheen, catalytic-surface adsorbate atoms hovering above, 'Pt 78' label, near-black background with subtle iridescence, jewelry-photography lighting." },
  { slug: "el-ag", category: "elements", palette: "silver", aspect: "1:1",
    prompt: "Stylized portrait of Silver (Ag): FCC crystal, mirror-bright surface with diffuse blue-white reflections, slight tarnish edges, 'Ag 47' label, dark slate background, photographic studio lighting." },
  { slug: "el-al", category: "elements", palette: "aluminum-blue", aspect: "1:1",
    prompt: "Stylized portrait of Aluminum (Al): FCC structure rendered as floating cuboctahedra in cool gradient blues and silvers, sp-metal valence cloud (no d), 'Al 13' label, dark background, technical illustration." },
  { slug: "el-pb", category: "elements", palette: "lead-grey", aspect: "1:1",
    prompt: "Stylized portrait of Lead (Pb): FCC crystal in dense matte grey with subtle blue undertone, weight-symbolic compositional anchor, 'Pb 82' label, near-black background, somber industrial aesthetic." },
  { slug: "el-w", category: "elements", palette: "tungsten-orange", aspect: "1:1",
    prompt: "Stylized portrait of Tungsten (W): BCC crystal at incandescent temperature, rich orange-white glow, refractory-metal aesthetic, 'W 74' label, deep red-black background, dramatic forge lighting." },
  { slug: "el-cr", category: "elements", palette: "chromium-cool", aspect: "1:1",
    prompt: "Stylized portrait of Chromium (Cr): BCC crystal in cool mirror-bright chrome, prismatic spectral edges, 'Cr 24' label, dark background with subtle rainbow caustic, automotive-photography aesthetic." },

  // ─── 2. Crystal structures (10) — scientific schematics, varied views ───
  { slug: "xtal-fcc-iso", category: "crystal", palette: "muted-cool", aspect: "1:1",
    prompt: "Scientific crystal-structure schematic of a face-centered cubic (FCC) unit cell, isometric view, atoms drawn as filled spheres at corners and face centers connected by thin black bond lines, white background, crystallographic axes a/b/c labeled with sans-serif arrows in lower-left, technical-drawing aesthetic, no luminous effects." },
  { slug: "xtal-bcc-iso", category: "crystal", palette: "muted-cool", aspect: "1:1",
    prompt: "Scientific schematic of a body-centered cubic (BCC) unit cell, isometric view, corner and body-center atoms as filled cool-blue spheres, thin black bond lines, white background, axis arrows, sans-serif labels, VESTA-style technical drawing." },
  { slug: "xtal-hcp-side", category: "crystal", palette: "muted-warm", aspect: "4:3",
    prompt: "Scientific schematic of a hexagonal close-packed (HCP) unit cell, side view showing ABAB stacking, atoms as warm-grey spheres with thin coordination lines, white background, sans-serif axis labels, publication-figure aesthetic." },
  { slug: "xtal-fcc-octa", category: "crystal", palette: "blue-violet", aspect: "1:1",
    prompt: "Crystal-structure schematic emphasizing octahedral interstitial sites in an FCC lattice: cool-blue host atoms, violet octahedral cages with translucent faces, white background, technical-drawing style, sans-serif axis arrows." },
  { slug: "xtal-bcc-tetra", category: "crystal", palette: "amber", aspect: "1:1",
    prompt: "BCC crystal schematic emphasizing tetrahedral interstitial sites: warm-grey host atoms, amber tetrahedral interstices with thin edge wireframes, white background, sans-serif crystallographic-axis arrows, publication-figure style." },
  { slug: "xtal-supercell", category: "crystal", palette: "monochrome", aspect: "16:9",
    prompt: "Scientific schematic of a 4x4x4 supercell of FCC atoms, monochrome charcoal-and-white render, perspective view showing periodic boundary repetition fading at edges, thin grid overlay, sans-serif axis arrows, technical-illustration aesthetic." },
  { slug: "xtal-fcc-bcc-pair", category: "crystal", palette: "two-tone", aspect: "16:9",
    prompt: "Side-by-side scientific comparison schematic: FCC unit cell on the left (cool blue), BCC unit cell on the right (warm orange), white background, panel labels (a) and (b) in sans-serif upper-left, both at the same scale, axis arrows at base, publication-figure style." },
  { slug: "xtal-stacking-fault", category: "crystal", palette: "amber-cool", aspect: "16:9",
    prompt: "Scientific schematic of a stacking fault in an FCC crystal: ABCABC packing layers shown in alternating cool-blue and amber, fault plane highlighted with a dashed line, side-view, white background, sans-serif layer labels, technical-paper aesthetic." },
  { slug: "xtal-vacancy", category: "crystal", palette: "muted", aspect: "1:1",
    prompt: "Crystal schematic showing a single vacancy defect in an FCC lattice: missing atom location marked with a dashed circle, neighboring atoms drawn slightly displaced toward the vacancy, white background, thin grey bond lines, sans-serif label 'V_a', technical drawing." },
  { slug: "xtal-dislocation", category: "crystal", palette: "two-tone", aspect: "16:9",
    prompt: "Edge-dislocation schematic: cross-section of a crystal lattice with one half-plane of atoms terminating mid-crystal, dislocation line marked with a 'T' symbol, Burgers vector arrow drawn beside, white background, thin black bond lines, sans-serif labels, materials-science textbook aesthetic." },

  // ─── 3. Manifold geometry (10) — eigenvalue spectra, hyper-ribbons, PCA ───
  { slug: "mani-eig-decay", category: "manifold", palette: "matplotlib", aspect: "16:9",
    prompt: "Scientific publication figure: log-scale eigenvalue spectrum bar chart, x-axis 'eigenvalue index' 1 to 10, y-axis 'log(λ)' showing exponential decay, bars filled steel blue with thin black borders, faint gridlines, sans-serif axis labels and tick numbers, white background, no glow, matplotlib-aesthetic." },
  { slug: "mani-pr-hist", category: "manifold", palette: "matplotlib", aspect: "16:9",
    prompt: "Histogram of participation ratio (PR) values across 559 interatomic potentials, x-axis 'PR' from 1.0 to 3.0, y-axis 'count', bars in steel blue, vertical dashed line at PR=2.0 marking hyper-ribbon threshold, sans-serif labels, white background, publication-quality matplotlib figure, no glow." },
  { slug: "mani-2d-embed", category: "manifold", palette: "viridis", aspect: "16:9",
    prompt: "2D PCA projection scatter plot of 559 potential error vectors, points colored by pair_style family (viridis colormap, ~12 categories visible), thin black axes, sans-serif labels 'PC1' and 'PC2', faint gridlines, small legend in upper-right, white background, matplotlib publication figure." },
  { slug: "mani-ribbon-3d", category: "manifold", palette: "blue-amber", aspect: "16:9",
    prompt: "3D scientific scatter plot rendered in matplotlib mplot3d style: ~500 small filled spheres lying on a thin elongated 2D ribbon embedded in 3D space, color-graded steel-blue to amber along the principal axis, white background, sans-serif axis labels x/y/z, publication-figure aesthetic, no glow, no luminous effects." },
  { slug: "mani-bootstrap", category: "manifold", palette: "matplotlib", aspect: "16:9",
    prompt: "Bootstrap confidence-interval forest plot: y-axis lists 12 pair_style families, x-axis 'PR with 95% CI' from 0.5 to 3.0, each row shows a small filled circle (point estimate) with horizontal whiskers (CI), sans-serif labels, white background, vertical dashed reference line at PR=2.0, matplotlib publication figure." },
  { slug: "mani-fisher", category: "manifold", palette: "viridis", aspect: "1:1",
    prompt: "Heatmap of a Fisher information matrix in viridis colormap, log-scale eigenvalues spanning 8 orders of magnitude visible as the diagonal-ish structure, thin grid, sans-serif row/col tick labels, colorbar on the right, white background, scientific publication figure." },
  { slug: "mani-r2-fit", category: "manifold", palette: "matplotlib", aspect: "16:9",
    prompt: "Scientific scatter plot with linear fit: x-axis 'eigenvalue index', y-axis 'log(λ)', ~6 small filled circles, dashed best-fit line in red, R² annotation 'R² = 0.94' in upper-right, sans-serif axis labels, white background, faint gridlines, publication-figure aesthetic." },
  { slug: "mani-procrustes", category: "manifold", palette: "two-tone", aspect: "16:9",
    prompt: "Procrustes alignment diagram: two overlapping 2D scatter clouds, original in cool steel blue and aligned in warm amber, transformation arrows drawn between matched points, thin black axes, sans-serif labels, white background, scientific-publication aesthetic." },
  { slug: "mani-spectrum-grid", category: "manifold", palette: "viridis", aspect: "16:9",
    prompt: "Grid of 12 small log-eigenvalue-spectrum subplots arranged 3x4, each subplot shows a different pair_style family's spectrum with a steel-blue line and faint markers, sans-serif family labels above each subplot, white background, faint gridlines, matplotlib publication aesthetic." },
  { slug: "mani-saddle", category: "manifold", palette: "matplotlib", aspect: "16:9",
    prompt: "3D surface plot of a saddle-shaped loss landscape in matplotlib mplot3d style, viridis colormap, thin contour lines projected on the floor, sans-serif axis labels x/y/loss, white background, publication-figure rendering of an optimization geometry." },

  // ─── 4. Causal / Simpson's paradox (10) ───
  { slug: "causal-pooled-vs-within", category: "causal", palette: "two-tone", aspect: "16:9",
    prompt: "Two-panel scientific figure: left panel shows pooled scatter (~500 small grey circles) with a downward best-fit line annotated r=-0.58, right panel shows the same data colored by group (~12 colors) each with its own upward fit line annotated r=+0.83, sans-serif axis labels and panel labels (a) and (b), white background, matplotlib publication aesthetic." },
  { slug: "causal-attenuation", category: "causal", palette: "matplotlib", aspect: "16:9",
    prompt: "Bar chart comparing pooled correlation (single tall blue bar at r=0.05) vs mean within-group correlation (tall amber bar at r=0.81), x-axis category labels 'pooled' / 'within-group', y-axis 'Pearson r', sans-serif labels, white background, publication-figure aesthetic." },
  { slug: "causal-dag", category: "causal", palette: "monochrome", aspect: "16:9",
    prompt: "Causal directed-acyclic-graph (DAG) diagram: three nodes labeled 'P' (potential), 'CS' (crystal structure), 'ERR' (prediction error), arrows P→ERR and CS→P, CS→ERR, back-door path highlighted with a dashed grey arrow, white background, sans-serif node labels, publication-figure style." },
  { slug: "causal-stratified", category: "causal", palette: "set3", aspect: "16:9",
    prompt: "Forest plot of within-group correlations stratified by 12 pair_style families, y-axis lists family names, x-axis 'r' from -1 to +1, each row shows a small filled circle with whiskers, vertical dashed line at r=0, sans-serif labels, white background, matplotlib publication aesthetic." },
  { slug: "causal-confounder", category: "causal", palette: "two-tone", aspect: "16:9",
    prompt: "Scientific schematic of a confounded relationship: two main variables connected by a dashed bidirectional arrow, a third 'confounder' variable above with arrows pointing to both, all variables drawn as labeled circles, white background, sans-serif labels, publication-figure causal-inference aesthetic." },
  { slug: "causal-reversal", category: "causal", palette: "two-tone", aspect: "16:9",
    prompt: "Schematic Simpson's-paradox illustration: three small clusters of data points each with their own positive-slope best-fit line, but the overall pooled best-fit line drawn through all points has a negative slope, sans-serif axis labels, white background, matplotlib publication-figure aesthetic." },
  { slug: "causal-sample-size", category: "causal", palette: "matplotlib", aspect: "16:9",
    prompt: "Scientific scatter plot showing alignment vs sample size: x-axis 'n_pairs' from 1 to 30, y-axis 'mean cross-style cosine' from 0 to 1, ~15 small filled circles labeled by element symbol, downward-trending best-fit line annotated 'ρ=-0.66, p=0.023', sans-serif labels, white background, matplotlib publication figure." },
  { slug: "causal-funnel", category: "causal", palette: "matplotlib", aspect: "16:9",
    prompt: "Funnel plot for meta-analysis bias detection: x-axis 'effect size', y-axis 'standard error' inverted (smaller errors at top), small filled circles forming a triangular funnel shape, dashed pseudo-confidence-interval lines, sans-serif labels, white background, publication-figure statistical aesthetic." },
  { slug: "causal-meta-forest", category: "causal", palette: "matplotlib", aspect: "16:9",
    prompt: "Meta-analysis forest plot: y-axis lists 8 study labels, x-axis 'effect size with 95% CI', each row shows a filled square (point estimate scaled by inverse variance) with horizontal whiskers, summary diamond at the bottom, sans-serif labels, white background, publication-figure aesthetic." },
  { slug: "causal-do-calculus", category: "causal", palette: "monochrome", aspect: "16:9",
    prompt: "Schematic visualization of Pearl's do-calculus intervention: a directed graph with one node circled in red showing the intervention, incoming edges to that node deleted (drawn faded), other edges remain solid, sans-serif math labels 'P(Y | do(X)) = ...' below, white background, publication-figure causal-inference aesthetic." },

  // ─── 5. Architecture (10) — Cloudflare worker, agents, data flow ───
  { slug: "arch-worker-overview", category: "architecture", palette: "navy-cyan", aspect: "16:9",
    prompt: "Technical architecture diagram of a Cloudflare Worker: central labeled rectangle 'glim-think-v1' with rounded corners, satellite labeled boxes for D1, R2, KV, Queue, AI, connected by thin labeled arrows, dark navy background, cyan accent color for the worker, white text for labels, sans-serif typography, vector-illustration style." },
  { slug: "arch-do-topology", category: "architecture", palette: "navy-violet", aspect: "16:9",
    prompt: "Cloudflare Durable Objects topology diagram: 9 labeled boxes (Orchestrator, Manifold, Causal, Theorist, Experiment, FleetOrchestrator, Dashboard, ExtensionManager, Literaturist) arranged in a circular layout, central worker hub connected to each, dark navy background, violet accent, sans-serif labels, vector-illustration aesthetic." },
  { slug: "arch-data-flow", category: "architecture", palette: "navy-cyan", aspect: "16:9",
    prompt: "Data flow diagram: cron trigger on the left → worker handler → D1 table writes (3 labeled cylinders) → R2 blob writes (2 labeled buckets) → external API calls (3 labeled service icons), all connected by labeled arrows, dark navy background, cyan accent, sans-serif typography." },
  { slug: "arch-queue", category: "architecture", palette: "navy-magenta", aspect: "16:9",
    prompt: "Queue-based dispatch diagram: producer endpoint → labeled queue cylinder → consumer worker, multiple parallel consumer arrows drawn with stagger, retry/DLQ branch shown below, dark navy background, magenta accent for the queue, sans-serif labels, vector-architecture aesthetic." },
  { slug: "arch-agent-swarm", category: "architecture", palette: "navy-multi", aspect: "16:9",
    prompt: "Swarm topology diagram: central orchestrator agent surrounded by 4 specialist agents (Manifold, Causal, Theorist, Experiment) connected by thin labeled message-passing arrows, each agent labeled with its specialty in sans-serif text, dark navy background, distinct accent color per agent, vector-illustration aesthetic." },
  { slug: "arch-ledger", category: "architecture", palette: "navy-amber", aspect: "16:9",
    prompt: "D1 ledger schema diagram: 6 connected tables (hypotheses, claims, insights, papers, hits, vignettes) drawn as labeled rectangles with foreign-key arrows between them, primary keys highlighted, dark navy background, amber accent for relationships, sans-serif column labels, ER-diagram aesthetic." },
  { slug: "arch-cron-cycle", category: "architecture", palette: "navy-green", aspect: "1:1",
    prompt: "Circular cron-trigger diagram: 5 wedges of a circle each labeled with a cron schedule (*/5, hourly, 0 6, 0 7, 0 9 MON), inner ring shows handlers, outer ring shows D1 tables written, dark navy background, green accent, sans-serif labels, vector-clock aesthetic." },
  { slug: "arch-rate-limit", category: "architecture", palette: "navy-orange", aspect: "16:9",
    prompt: "Rate-limit state-machine diagram: three states (healthy, throttled, backoff) connected by transition arrows labeled with conditions (200 OK, 429, retry-after), KV-storage cylinder underneath storing per-source notBefore values, dark navy background, orange accent for the throttled state, sans-serif labels." },
  { slug: "arch-graph-overview", category: "architecture", palette: "navy-multi", aspect: "16:9",
    prompt: "Overview diagram of a knowledge graph: ~30 small node circles connected by edges of varying thickness, node colors representing 5 types (hypothesis, claim, insight, paper, hit), force-directed layout, dark navy background, white text labels for major nodes, sans-serif typography, network-visualization aesthetic." },
  { slug: "arch-deploy-pipeline", category: "architecture", palette: "navy-cyan", aspect: "16:9",
    prompt: "CI/CD pipeline diagram: git commit → GitHub Actions workflow → wrangler deploy → Cloudflare edge (drawn as a globe icon), each step a labeled rectangle connected by directed arrows, status indicators (green checkmarks) on completed steps, dark navy background, cyan accent, sans-serif labels." },

  // ─── 6. D-band / electronic structure (10) ───
  { slug: "dband-dos", category: "electronic", palette: "matplotlib", aspect: "16:9",
    prompt: "Density-of-states (DOS) plot: x-axis 'E - E_F (eV)' from -8 to +4, y-axis 'DOS (states/eV)', two filled curves overlaid: narrow tall steel-blue Gaussian peak labeled 'closed-shell d-band' and broad shallow amber distribution labeled 'open-shell d-band', vertical dashed line at E_F=0, legend upper-right, sans-serif axis labels, white background, matplotlib publication figure." },
  { slug: "dband-band-structure", category: "electronic", palette: "matplotlib", aspect: "16:9",
    prompt: "Electronic band-structure plot for a transition metal: x-axis labeled with high-symmetry k-path points (Γ, X, M, Γ), y-axis 'energy (eV)' from -10 to +5, multiple curving lines (steel blue), horizontal dashed line at E_F=0, sans-serif axis labels, white background, condensed-matter physics publication aesthetic." },
  { slug: "dband-fermi-surface", category: "electronic", palette: "viridis", aspect: "1:1",
    prompt: "3D Fermi surface rendering: complex curved isosurface in viridis colormap, semi-transparent, oriented in a Brillouin-zone Wigner-Seitz cube, sans-serif axis labels k_x/k_y/k_z, white background, condensed-matter physics paper-figure aesthetic." },
  { slug: "dband-orbitals", category: "electronic", palette: "two-tone", aspect: "1:1",
    prompt: "Schematic of d-orbital lobes (d_xy, d_yz, d_xz, d_x²-y², d_z²) arranged in a 2x3 grid with sans-serif labels, each orbital drawn as colored lobes (alternating positive blue / negative red phases) on a thin xyz axis frame, white background, chemistry-textbook aesthetic." },
  { slug: "dband-electron-cloud", category: "electronic", palette: "blue-violet", aspect: "1:1",
    prompt: "Stylized rendering of a d-electron probability cloud around a transition-metal nucleus: cloud-like blue-violet density with subtle nodal surfaces, central bright dot for the nucleus, dark background, slight depth-of-field effect, scientific-illustration aesthetic, no text." },
  { slug: "dband-cohesive-energy", category: "electronic", palette: "matplotlib", aspect: "16:9",
    prompt: "Friedel-model cohesive-energy parabola: x-axis 'd-band filling (0 to 10)', y-axis 'cohesive energy (eV)', smooth downward parabola peaking near filling=5, scattered small filled circles for actual transition metals labeled by element (Cr, Mo, W, Fe, Ru, Os, etc.), sans-serif labels, white background, matplotlib publication figure." },
  { slug: "dband-hammer-norskov", category: "electronic", palette: "matplotlib", aspect: "16:9",
    prompt: "Hammer-Nørskov d-band-center scatter plot: x-axis 'd-band center (eV vs E_F)' from -4 to 0, y-axis 'CO adsorption energy (eV)' from -2 to 0, ~10 small filled circles labeled by transition metal (Cu, Pd, Pt, Au, Ni, Ag, Rh, Ir), linear best-fit line annotated with slope and R², sans-serif labels, white background, surface-science publication figure." },
  { slug: "dband-pdos", category: "electronic", palette: "matplotlib", aspect: "16:9",
    prompt: "Projected DOS (pDOS) plot decomposed by orbital: x-axis 'E - E_F (eV)', y-axis 'DOS', three filled curves at 50% opacity (s in green, p in red, d in blue), legend upper-right, vertical dashed line at E_F=0, sans-serif labels, white background, matplotlib publication figure." },
  { slug: "dband-charge-transfer", category: "electronic", palette: "two-tone", aspect: "16:9",
    prompt: "Charge-transfer schematic between two metal atoms: left atom blue with surplus electron cloud, right atom red with deficit, bond region in white showing depleted and accumulated charge in lobed regions, sans-serif element labels, white background, computational-chemistry publication aesthetic." },
  { slug: "dband-spin-density", category: "electronic", palette: "two-tone", aspect: "1:1",
    prompt: "Spin-density isosurface visualization for a ferromagnetic metal (e.g. Fe BCC unit cell): up-spin density in blue, down-spin in red, both as semi-transparent isosurfaces around atom centers, white background, sans-serif axis labels, condensed-matter publication aesthetic." },

  // ─── 7. Lupine brand / wolf-materials fusion (10) ───
  { slug: "lupine-wolf-crystal", category: "brand", palette: "ink-wash", aspect: "16:9",
    prompt: "Painterly ink-wash illustration: stylized wolf silhouette in profile, body composed of a translucent FCC crystal lattice fading to brushstroke, monochrome charcoal with subtle indigo highlights, dramatic composition, no text, no logo, gallery-art aesthetic." },
  { slug: "lupine-wolf-howl", category: "brand", palette: "navy-silver", aspect: "9:16",
    prompt: "Vertical banner illustration: wolf howling at a moon that is composed of a periodic-table grid in soft silver, dark navy sky with sparse small star points, painterly oil-texture rendering, no text, evocative materials-science-meets-mythology aesthetic." },
  { slug: "lupine-pack", category: "brand", palette: "ink-wash", aspect: "16:9",
    prompt: "Three stylized wolves in a dynamic running pose, each wolf's coat composed of a different crystal-lattice texture (FCC, BCC, HCP visible), monochrome charcoal painterly ink-wash, dark blue background gradient, no text, atmospheric editorial aesthetic." },
  { slug: "lupine-mountain", category: "brand", palette: "indigo", aspect: "16:9",
    prompt: "Lone wolf silhouette on a mountain ridge at twilight, the mountain itself composed of fractal-style crystalline facets, deep indigo and silver palette, painterly oil-on-canvas texture, no text, contemplative editorial-illustration aesthetic." },
  { slug: "lupine-eye", category: "brand", palette: "amber", aspect: "1:1",
    prompt: "Extreme close-up of a single wolf eye, the iris pattern composed of an interatomic-potential error scatter plot — small dots forming a hyper-ribbon along the radial direction, surrounding fur in painterly grey strokes, dark amber accents, no text, fine-art editorial aesthetic." },
  { slug: "lupine-flower", category: "brand", palette: "violet-green", aspect: "1:1",
    prompt: "Stylized rendering of a lupine flower spike (the actual purple plant), each individual flower of the spike replaced by a tiny crystal-unit-cell shape (FCC, BCC, HCP variations), painterly botanical-illustration aesthetic, soft violet and forest-green palette, no text." },
  { slug: "lupine-paw-print", category: "brand", palette: "muted", aspect: "1:1",
    prompt: "Stylized wolf paw print pressed into snow, the imprint texture composed of a faint crystalline lattice pattern visible in the snow grain, monochrome cool palette, painterly editorial aesthetic, no text." },
  { slug: "lupine-aurora", category: "brand", palette: "aurora", aspect: "16:9",
    prompt: "Wolf silhouette in a snow-covered tundra under aurora borealis, the aurora's wave pattern subtly forming the curve of a hyper-ribbon manifold, deep blue-green-violet aurora palette, painterly editorial-poster aesthetic, no text." },
  { slug: "lupine-portrait", category: "brand", palette: "monochrome", aspect: "1:1",
    prompt: "Hyperrealistic wolf head portrait in three-quarter view, fur rendered with fine crosshatched ink lines, eyes catching a single specular highlight, monochrome charcoal-and-paper aesthetic, no text, fine-art illustration aesthetic." },
  { slug: "lupine-banner", category: "brand", palette: "navy-gold", aspect: "21:9",
    prompt: "Wide cinematic banner: stylized lupine (wolf) skull rendered in soft gold leaf inlay against deep navy background, surrounded by orbiting small atomic-structure motifs as constellations, no text, museum-banner aesthetic." },

  // ─── 8. Glim / light / glimmer abstract (10) ───
  { slug: "glim-photon", category: "abstract", palette: "spectral", aspect: "1:1",
    prompt: "Abstract macro photograph of a single light-particle event: a glowing point source emitting concentric ripples in a fluid prism, spectral rainbow palette, deep dark background, painterly long-exposure aesthetic, no text." },
  { slug: "glim-shimmer", category: "abstract", palette: "iridescent", aspect: "16:9",
    prompt: "Iridescent shimmering surface texture, fine grain pattern with subtle prismatic color shifts, abstract macro photograph, soft focus edges, dreamy aesthetic, no text, suitable as a banner background." },
  { slug: "glim-aurora", category: "abstract", palette: "aurora", aspect: "16:9",
    prompt: "Abstract aurora-borealis-like flowing light ribbons across a starless deep navy sky, ribbons in green-violet-cyan, painterly digital-art aesthetic, dreamy atmospheric, no text, large-scale poster composition." },
  { slug: "glim-fiberoptic", category: "abstract", palette: "neon", aspect: "16:9",
    prompt: "Macro photograph of bundled fiber-optic strands carrying neon-colored light points along their length, dark background, sharp focus on the bundle cross-section, painterly cinematic aesthetic, no text." },
  { slug: "glim-bioluminescence", category: "abstract", palette: "cool-blue", aspect: "16:9",
    prompt: "Abstract bioluminescent jellyfish-like organism rendered in cool electric blue, swirling tentacles trailing photon-dot trails, deep ocean dark background, painterly nature-photography aesthetic, no text." },
  { slug: "glim-prism", category: "abstract", palette: "spectral", aspect: "1:1",
    prompt: "Crystal prism splitting white light into a spectrum, sharp geometric edges of the prism in dark grey, spectral rays in vivid rainbow gradient against a black background, classic physics-textbook-meets-art-photography composition, no text." },
  { slug: "glim-stardust", category: "abstract", palette: "cosmic", aspect: "16:9",
    prompt: "Abstract cosmic stardust cloud, fine particles glowing in deep purples and pinks against an inky black field, soft motion blur suggesting flow, painterly digital-art aesthetic, no text, suitable as cinematic background." },
  { slug: "glim-glass-bead", category: "abstract", palette: "iridescent", aspect: "1:1",
    prompt: "Macro photograph of a single iridescent glass bead, internal refractive caustics visible inside, surrounding subtle bokeh of more beads out of focus, dark velvet background, fine-art product-photography aesthetic, no text." },
  { slug: "glim-spectrum-stripe", category: "abstract", palette: "spectral", aspect: "16:9",
    prompt: "Long horizontal smooth gradient stripe transitioning through the visible spectrum, fine dust-particle texture overlay, deep black border framing, painterly editorial aesthetic, no text, banner-poster composition." },
  { slug: "glim-firefly-field", category: "abstract", palette: "warm", aspect: "16:9",
    prompt: "A field of fireflies glowing at twilight, hundreds of small warm-yellow points drifting in an amber-blue gradient sky, soft focus, painterly long-exposure photographic aesthetic, no text, evocative nature scene." },

  // ─── 9. Cinematic abstract science (10) ───
  { slug: "cine-supercollider", category: "cinematic", palette: "industrial", aspect: "16:9",
    prompt: "Cinematic wide-angle render of a particle-accelerator tunnel interior, metallic blue-grey machinery curving away, soft volumetric lighting, no text, no human figures, scientific industrial atmosphere, photorealistic." },
  { slug: "cine-cleanroom", category: "cinematic", palette: "sterile-cool", aspect: "16:9",
    prompt: "Cinematic shot of a semiconductor cleanroom: rows of metallic chambers, soft fluorescent overhead lighting, faint reflection on polished floor, sterile cool palette, no human figures, no text, photorealistic atmospheric aesthetic." },
  { slug: "cine-microscope", category: "cinematic", palette: "warm-instrument", aspect: "16:9",
    prompt: "Cinematic close-up of a vintage brass-and-glass scientific microscope on a wooden bench, soft warm lamp light, faint dust particles in the beam, painterly photographic aesthetic, no text." },
  { slug: "cine-dataviz-dome", category: "cinematic", palette: "navy-cyan", aspect: "16:9",
    prompt: "Cinematic render of an immersive data-visualization dome: a single observer silhouette looks up at a floating 3D scatter plot of glowing cyan points forming a manifold structure, dark navy ceiling, painterly digital-art aesthetic, no text." },
  { slug: "cine-cryostat", category: "cinematic", palette: "cool-vapor", aspect: "16:9",
    prompt: "Cinematic close-up of a liquid-helium cryostat with vapor curling up, instrumentation cables in soft focus background, cool blue-cyan palette, no human figures, no text, atmospheric scientific photography aesthetic." },
  { slug: "cine-mossbauer", category: "cinematic", palette: "warm-glass", aspect: "16:9",
    prompt: "Cinematic warm-toned shot of a Mössbauer spectrometer experiment: glowing radioactive source housing, photomultiplier detector, sample holder with iron-bearing crystal, soft amber-warm lighting, no text, photographic aesthetic." },
  { slug: "cine-lammps-screen", category: "cinematic", palette: "amber-monitor", aspect: "16:9",
    prompt: "Cinematic shot of a LAMMPS simulation visualization on a CRT-style monitor: amber atomic-coordinate dots scrolling, terminal text out of focus on the side, dark room background, painterly retro-computing photographic aesthetic, no readable text." },
  { slug: "cine-vacuum-chamber", category: "cinematic", palette: "industrial", aspect: "16:9",
    prompt: "Cinematic ultrahigh-vacuum chamber interior view through a viewport: stainless-steel ports radiating outward, sample-stage manipulator at center, soft cool industrial lighting, no text, photographic aesthetic." },
  { slug: "cine-beamline", category: "cinematic", palette: "cool-cyan", aspect: "16:9",
    prompt: "Cinematic shot down a synchrotron beamline corridor: massive blue magnets receding into the distance, fluorescent overhead lights, polished floor reflections, sterile cool atmospheric palette, no text, no human figures, photorealistic." },
  { slug: "cine-globe-data", category: "cinematic", palette: "navy-cyan", aspect: "16:9",
    prompt: "Cinematic render of a transparent glass globe floating in space, latitude-longitude grid overlaid with thin glowing arc-paths connecting research locations, deep navy starfield background, painterly digital-art aesthetic, no text labels." },

  // ─── 10. Research process / lab notebook (10) ───
  { slug: "lab-notebook-open", category: "process", palette: "warm-paper", aspect: "16:9",
    prompt: "Cinematic top-down photograph of an open lab notebook on a wooden bench: handwritten equations in blue ink across the page (illegible / decorative), small sketches of crystal structures in the margins, soft warm desk lamp light, fountain pen lying beside, painterly photographic aesthetic, no readable text." },
  { slug: "lab-whiteboard", category: "process", palette: "neutral", aspect: "16:9",
    prompt: "Cinematic shot of a research-lab whiteboard covered in equations and small diagrams (decorative / illegible), faint chalk-eraser smudges, fluorescent overhead lighting, painterly photographic aesthetic, no readable text." },
  { slug: "lab-coffee-equations", category: "process", palette: "warm", aspect: "16:9",
    prompt: "Cinematic close-up of a ceramic coffee mug on a desk next to a stack of printed scientific papers, equations and diagrams visible on the top page (decorative / illegible), warm morning light from a window, painterly photographic aesthetic, no readable text." },
  { slug: "lab-server-rack", category: "process", palette: "cool-led", aspect: "16:9",
    prompt: "Cinematic shot of a server rack in a small research lab: blinking blue and green LEDs on the front face, neatly bundled cables, faint fan-blower light streaks in long-exposure, dark room with cool palette, no human figures, no text." },
  { slug: "lab-3d-printer", category: "process", palette: "warm-plastic", aspect: "16:9",
    prompt: "Cinematic close-up of a 3D printer mid-print extruding warm-yellow filament into a partially built crystal-lattice scaffold model, soft motion blur on the print head, dark workshop background, painterly photographic aesthetic." },
  { slug: "lab-glove-box", category: "process", palette: "yellow-glove", aspect: "16:9",
    prompt: "Cinematic shot of an inert-atmosphere glovebox interior: yellow rubber gloves protruding inward, sample vials and instruments inside, soft overhead lighting, dark control panel below, painterly photographic aesthetic, no human figures visible." },
  { slug: "lab-flowchart", category: "process", palette: "neutral", aspect: "16:9",
    prompt: "Stylized illustration of a research workflow flowchart: 6 connected boxes labeled hypothesize → design → simulate → measure → analyze → conclude (sans-serif text), arrows between boxes, light grey background, editorial-info-graphic aesthetic." },
  { slug: "lab-experiment-bench", category: "process", palette: "warm", aspect: "16:9",
    prompt: "Cinematic top-down shot of a tidy experimental bench: small instruments, a sample puck, neatly coiled cables, a notebook, all on a polished wood surface, soft warm overhead light, painterly editorial-photograph aesthetic, no readable text." },
  { slug: "lab-meeting-room", category: "process", palette: "neutral-warm", aspect: "16:9",
    prompt: "Cinematic shot of an empty research-lab meeting room: a long table, a wall-mounted screen showing a faint scatter plot graphic (decorative / illegible), windows with soft midday light, painterly editorial-photograph aesthetic, no people, no readable text." },
  { slug: "lab-publication-stack", category: "process", palette: "warm-paper", aspect: "16:9",
    prompt: "Cinematic close-up of a stack of bound scientific journal volumes on a wooden shelf, spines visible with decorative title bars (illegible), soft warm library lighting, painterly photographic aesthetic, no readable text." },
];

// ─── DDL + persistence ───

const TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS slideshow_images (
    slug TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    palette TEXT,
    aspect TEXT,
    prompt TEXT NOT NULL,
    r2_key TEXT,
    r2_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    latency_ms INTEGER,
    created_at TEXT NOT NULL,
    completed_at TEXT
  )
`;

const STATUS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_slideshow_status
    ON slideshow_images(status, category)
`;

let schemaReady = false;
async function ensureSchema(env: Env): Promise<void> {
  if (schemaReady) return;
  await env.LEDGER.prepare(TABLE_DDL).run();
  await env.LEDGER.prepare(STATUS_INDEX).run();
  schemaReady = true;
}

/**
 * Run the batch with bounded concurrency. Returns when all prompts have
 * been attempted (success or fail). Designed to be invoked under
 * ctx.waitUntil so the request handler can return immediately.
 */
export async function runSlideshowBatch(
  env: Env,
  prompts: SlideshowPrompt[],
  options: { concurrency?: number; force_redo?: boolean } = {},
): Promise<{ total: number; success: number; failed: number; skipped: number }> {
  await ensureSchema(env);
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, 8));
  const force = Boolean(options.force_redo);
  const now = new Date().toISOString();

  // Pre-insert pending rows for all prompts (idempotent).
  for (const p of prompts) {
    await env.LEDGER
      .prepare(
        `INSERT INTO slideshow_images
           (slug, category, palette, aspect, prompt, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6)
         ON CONFLICT(slug) DO ${force ? "UPDATE SET status = 'pending', error = NULL" : "NOTHING"}`,
      )
      .bind(p.slug, p.category, p.palette, p.aspect, p.prompt, now)
      .run();
  }

  let success = 0, failed = 0, skipped = 0;

  // Filter to only those that need work (status='pending' or force).
  const work: SlideshowPrompt[] = [];
  for (const p of prompts) {
    const row = await env.LEDGER
      .prepare(`SELECT status FROM slideshow_images WHERE slug = ?1`)
      .bind(p.slug)
      .first<{ status: string }>();
    if (force || !row || row.status === "pending" || row.status === "failed") {
      work.push(p);
    } else {
      skipped++;
    }
  }

  // Worker queue with bounded parallelism.
  let cursor = 0;
  async function workerLoop(): Promise<void> {
    while (cursor < work.length) {
      const myIdx = cursor++;
      const p = work[myIdx];
      const start = Date.now();
      const storageKey = `slideshow/${p.slug}.png`;
      try {
        const result = await generateAndStoreImage(env, {
          prompt: p.prompt,
          storageKey,
          aspect_ratio: p.aspect,
          prompt_optimizer: true,
        });
        const ts = new Date().toISOString();
        if (result.ok && result.r2_key) {
          await env.LEDGER
            .prepare(
              `UPDATE slideshow_images
                  SET r2_key = ?1, r2_url = ?2, status = 'complete',
                      latency_ms = ?3, completed_at = ?4
                WHERE slug = ?5`,
            )
            .bind(result.r2_key, result.r2_url ?? null, Date.now() - start, ts, p.slug)
            .run();
          success++;
        } else {
          await env.LEDGER
            .prepare(
              `UPDATE slideshow_images
                  SET status = 'failed', error = ?1, latency_ms = ?2,
                      completed_at = ?3
                WHERE slug = ?4`,
            )
            .bind((result.error ?? "unknown").slice(0, 300), Date.now() - start, ts, p.slug)
            .run();
          failed++;
        }
      } catch (e) {
        await env.LEDGER
          .prepare(
            `UPDATE slideshow_images
                SET status = 'failed', error = ?1, latency_ms = ?2,
                    completed_at = ?3
              WHERE slug = ?4`,
          )
          .bind(String(e).slice(0, 300), Date.now() - start, new Date().toISOString(), p.slug)
          .run();
        failed++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => workerLoop());
  await Promise.all(workers);

  return { total: prompts.length, success, failed, skipped };
}

export interface SlideshowManifestEntry {
  slug: string;
  category: string;
  palette: string;
  aspect: string;
  prompt: string;
  r2_url: string | null;
  status: string;
  latency_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export async function listSlideshowImages(env: Env): Promise<SlideshowManifestEntry[]> {
  await ensureSchema(env);
  const rows = await env.LEDGER
    .prepare(
      `SELECT slug, category, palette, aspect, prompt, r2_url,
              status, latency_ms, created_at, completed_at
         FROM slideshow_images
        ORDER BY category ASC, slug ASC`,
    )
    .all<SlideshowManifestEntry>()
    .catch(() => ({ results: [] as SlideshowManifestEntry[] }));
  return rows.results ?? [];
}
