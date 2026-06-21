// Lupine Science seed deck — content, transcribed verbatim from
// fundraise/lupine-science-deck.md (v2). Facts only; nothing invented.

export type Block =
  | { kind: 'lead'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'quote'; text: string };

export type Slide = {
  no: string; // "01"
  kicker?: string; // eyebrow
  headline: string; // the assertion (rendered big; supports **bold**)
  blocks: Block[];
  footnote?: string;
  kind?: 'cover' | 'content';
};

export const CONFIDENTIAL = 'Lupine Science — Confidential · stealth until raise';

export const slides: Slide[] = [
  {
    no: '01',
    kind: 'cover',
    kicker: 'Lupine Science',
    headline: 'The trust layer for the age of **AI-designed matter**.',
    blocks: [
      {
        kind: 'lead',
        text: "For a decade we taught AI to master language. Now it's learning to build the physical world — on simulations that are wrong. **We mapped the wrongness.**",
      },
      {
        kind: 'para',
        text: 'Raising ~$20M to put materials intelligence in every major compute site and lab on earth.',
      },
    ],
    footnote: 'Alexander Welcing, Founder · lupine.science',
  },
  {
    no: '02',
    kicker: "The change we're in the middle of",
    headline: 'AI is leaving the screen and entering matter.',
    blocks: [
      { kind: 'lead', text: 'For ten years, AI mastered the digital world — language, images, code. That era is maturing.' },
      {
        kind: 'para',
        text: 'The next one has already begun: **foundation models now predict how atoms behave** (MACE, CHGNet, Orb — all in the last two years). AI is crossing from *bits to atoms*, and the largest economy on earth — everything physical — is coming online for it.',
      },
      {
        kind: 'para',
        text: 'This is the obvious, irreversible shift we are living through. **Energy, climate, computing, materials — all about to be reprogrammed by AI.**',
      },
    ],
  },
  {
    no: '03',
    kicker: 'The catch nobody has solved',
    headline: 'AI is about to design matter — on predictions that are wrong.',
    blocks: [
      {
        kind: 'para',
        text: 'Every battery, alloy, and chip starts with an *interatomic potential.* There are ~900 for metals alone, and **every one is wrong in some structured way.** The new foundation models inherit the same flaw.',
      },
      {
        kind: 'para',
        text: "As capital and effort pour into AI-for-matter, the bottleneck is no longer *generating* predictions. It's **trusting** them. Today, “which predictions are real” is still a craft judgment.",
      },
      { kind: 'lead', text: 'The question no one asked: is that error random — or does it have a shape?' },
    ],
  },
  {
    no: '04',
    kicker: 'The insight + the proof — this is the traction',
    headline: 'The wrongness has a shape. We mapped it — and **machine-checked the map**.',
    blocks: [
      {
        kind: 'bullet',
        text: 'Errors across **~900 classical potentials + 3 foundation MLIPs × 15 elements** collapse onto a low-dimensional manifold — a *hyper-ribbon* (participation ratio **1.05–2.05**).',
      },
      {
        kind: 'bullet',
        text: '**14/15 elements** preserve the geometry classical → MLIP; all MLIPs are wrong in the **same direction** (cos θ > 0.8) → **one calibration layer corrects them all at once.**',
      },
      {
        kind: 'bullet',
        text: 'Formalized in **Lean 4 with zero gaps.** And we **publish our refutations** — 3 self-refuted hypotheses. The discipline *is* the credibility.',
      },
      { kind: 'bullet', text: '679 commits · 46 public research articles · live production engine (atlas-distill, Rust).' },
      { kind: 'quote', text: 'Pre-revenue by choice. In this field, **proof we can do what no one else can is the traction.**' },
    ],
  },
  {
    no: '05',
    kicker: "Why it's everything",
    headline: 'In the age of AI-designed matter, whoever owns *trust* owns the layer it all rests on.',
    blocks: [
      {
        kind: 'para',
        text: "Every platform shift throws off a verification layer that becomes essential infrastructure. For AI-and-matter, that layer **doesn't exist yet** — and we're the only ones who mapped it.",
      },
      {
        kind: 'para',
        text: 'Materials are upstream of everything: construction ($13–16T; cement = 8% of global CO₂), semiconductors ($1T+ by 2030), batteries ($180B+), critical minerals ($670B by 2032). A **$4–6T** economy about to be rebuilt on simulation that *has to be trustworthy.*',
      },
      { kind: 'lead', text: 'Make matter trustworthy, and every frontier moves faster. **The mission and the magnitude — one sentence.**' },
    ],
  },
  {
    no: '06',
    kind: 'content',
    kicker: 'Why me',
    headline: 'I am the bridge the industry is crossing.',
    blocks: [
      {
        kind: 'bullet',
        text: '**Atoms (2010):** materials-science research assistant; presented on interatomic potentials at the **TMS annual conference — at 17.** The problem was clear; the tools to solve it didn’t exist.',
      },
      {
        kind: 'bullet',
        text: '**Bits (the 15 years since):** became an operator and AI/ML builder — shipping real products and developer tooling, **presenting at Google Cloud on NLP systems (2018).**',
      },
      {
        kind: 'bullet',
        text: '**Atoms again (now):** I bring AI back to matter at the exact moment the world makes the same crossing. **My biography is the inflection** — the rare double background this moment demands.',
      },
    ],
  },
  {
    no: '07',
    kicker: 'What we’re building',
    headline: 'The trust layer for matter — and the engine that discovers what’s next.',
    blocks: [
      { kind: 'bullet', text: '**The correction layer.** Provable, per-element calibration on the manifold; named failure modes flagged automatically; failed ribbons gated out.' },
      { kind: 'bullet', text: '**The discovery engine.** The corrected signal lets us discover and validate **novel materials** — battery, construction, computing — and license the IP.' },
      { kind: 'bullet', text: 'A **profitable floor** (licensing + services) funds the **moonshot ceiling** (materials-IP discovery). *You’re funding discovery, not runway.*' },
    ],
  },
  {
    no: '08',
    kicker: 'The moat',
    headline: 'An edge that compounds instead of decaying.',
    blocks: [
      { kind: 'bullet', text: '**Domain-science edge** refreshes with every discovery — unlike speed, alt-data, or statistical edges that get competed away. This one *deepens.*' },
      { kind: 'bullet', text: '**Provable.** No one hand-waves around a machine-checked proof.' },
      { kind: 'bullet', text: '**Compounding flywheel:** more manifold coverage → more discoveries → more compute → wider coverage.' },
      { kind: 'bullet', text: '~200 people on earth can read this work. Replicate-time for a funded competitor is **12–24 months** — and the frontier moves with every commit.' },
    ],
  },
  {
    no: '09',
    kind: 'content',
    kicker: 'The team',
    headline: 'Proved it, shipped it — and knows how to build the team around it.',
    blocks: [
      { kind: 'bullet', text: '**Alexander Welcing — Founder.** The rare atoms + bits background. Proved the thesis and built the engine, solo.' },
      { kind: 'bullet', text: '**A builder of people.** Leads, inspires, and recruits — **builds talent density from a deep personal network** (Texas Academy of Mathematics & Science cohort; led it). He recruits people smarter than him and gets them to run through walls.' },
      { kind: 'bullet', text: '**CFO — joining at close.** Marquee operator; the financial and commercial backbone.' },
      { kind: 'bullet', text: 'This round **builds the founding team** around a proven core.' },
    ],
  },
  {
    no: '10',
    kicker: 'The vision',
    headline: 'Step one of a real-world Replicator.',
    blocks: [
      { kind: 'para', text: 'The arc: **trustworthy prediction** (here, now) → **generative matter** → **closed-loop synthesis** → **programmable matter.** Lupine is the validation substrate the entire stack depends on.' },
      { kind: 'lead', text: "If this compounds, we don't just correct simulations — **we discover the materials that build the next century.**" },
    ],
  },
  {
    no: '11',
    kicker: 'The ask',
    headline: 'Raising ~$20M to put materials intelligence in every major lab on earth — in 12 months.',
    blocks: [
      { kind: 'bullet', text: '**Use of funds:** deliver our work to **all major supercompute sites and university + industry research labs globally within 12 months**; build the founding team; expand the manifold.' },
      { kind: 'bullet', text: 'The floor is **profitable** — capital funds **discovery, not runway.**' },
      { kind: 'bullet', text: '**3-year horizon:** a breakthrough result that justifies a significant step-up at the next round.' },
      { kind: 'quote', text: 'Valuation anchored on the inflection + the moat, set through a competitive process — discussed live.' },
    ],
  },
  {
    no: '12',
    kicker: 'Appendix',
    headline: 'The depth beneath the deck.',
    blocks: [
      { kind: 'bullet', text: '**The science, in depth** — the cross-MLIP cosine table, per-element transfer, the Lean formalization, the canary pipeline.' },
      { kind: 'bullet', text: '**Lupine Capital Management** — a *separate* fund built to trade on Lupine’s **public** research. Living proof the signal is real and valuable; walled-off capital; not part of this raise.' },
    ],
  },
];
