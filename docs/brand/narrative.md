# Lupine Science Brand Narrative

This is the canonical narrative layer for human readers, search engines, and
agentic systems. It keeps the public site, LUPI, the Library, publication
templates, and generated research notes pointed at the same story.

## Core Identity

Lupine Science is a public research program for the error geometry of
interatomic potentials.

Every atomistic simulation depends on a potential. Every potential is wrong,
but not randomly wrong. Lupine Science treats that structured wrongness as the
object of study: measure it, test it, publish it, correct it, and make the
claim lifecycle visible.

The first reader is a serious materials-science reader: a university PI,
national-lab lead, MLIP builder, research software collaborator, or lab director
who wants to know whether a model can be trusted outside the narrow conditions
where it looked accurate.

## Narrative Spine

1. Interatomic potentials fail in structured ways.
2. Those failures form geometry across models, elements, properties, and
   structure families.
3. Lupine Science studies that geometry as scientific evidence, not as a
   generic leaderboard.
4. LUPI makes the evidence inspectable in the browser.
5. The Lupine Library turns the work into durable human knowledge.
6. glim-think keeps the agentic research loop attached to claims, evidence,
   refutations, and broadcasts.

## Science Spine

Use this taxonomy when a surface needs to show the full scientific program:

| Layer | Question |
| --- | --- |
| Error geometry | Do prediction errors form stable low-dimensional structure? |
| Sloppy-model structure | Which stiff and sloppy directions explain model failure? |
| Cross-MLIP transfer | Do foundation MLIPs inherit, rotate, or escape the classical error geometry? |
| Causal and statistical validity | Which trends survive matched samples, bootstrap controls, and confounder checks? |
| Claim lifecycle | Which hypotheses are proposed, supported, refuted, corrected, or open? |
| Formal specification | Which claims can be moved toward proof obligations or theorem-shaped validation? |
| Agentic research loop | How do agents extend the evidence without losing provenance? |

## Surface Roles

| Surface | Role |
| --- | --- |
| Lupine Science | Research program and public start page |
| LUPI | Browser-native WebGPU viewer for atomistic evidence |
| Lupine Library | Mobile-first human knowledge surface |
| glim-think | Agentic research control plane and durable ledger |

## Voice

Use precise, evidence-forward language. The tone should feel calm, empirical,
and alive to self-correction. The strongest story is not "we are always right";
it is "we can find where we were wrong, preserve the correction, and make the
next run smarter."

Primary public surfaces should read as scientific orientation for materials
labs, university groups, national-lab teams, MLIP builders, and research
software collaborators. Investors and other observers should be able to watch
the evidence trail, claim lifecycle, and operating cadence without being
directly pitched on the surface.

Prefer:

- "error geometry"
- "field evidence"
- "science spine"
- "claim lifecycle"
- "supported, refuted, corrected, open"
- "human knowledge surface"
- "agentic research control plane"
- "inspectable evidence"
- "lab-facing research corpus"

Avoid:

- retired materials-science organization labels
- legacy Atlas-family viewer labels
- retired viewer domains
- "atom-logo" framing
- unsupported claims that the science is settled

## One-Sentence Forms

General:

> Lupine Science studies where interatomic potentials fail, why those failures
> have structure, and how that structure can guide correction.

Lab reader:

> Lupine Science is a lab-facing research corpus for atomistic model trust:
> error geometry, claim lifecycle, inspectable evidence, and correction targets.

Observer:

> Lupine Science is best evaluated by watching its evidence trail: Library
> updates, LUPI evidence routes, claim status changes, and public corrections.

For LUPI:

> LUPI is the browser-native viewer for inspecting atomistic evidence from
> Lupine Science.

For the Library:

> Lupine Library is the public research corpus: reports, evidence, status
> labels, refutations, and the working changelog.

For glim-think:

> glim-think is the agentic research control plane that keeps hypotheses,
> claims, evidence, broadcasts, and corrections attached to a durable ledger.

## Search and Agent Rules

All public sites should expose:

- `/llms.txt` for a short agent-readable guide.
- `/llms-full.txt` for the full narrative, citation, and crawling guide.
- `/brand.json` for structured brand metadata.
- `robots.txt` entries that allow those files.
- sitemap entries for those files.
- `<link rel="alternate" type="text/plain" href="/llms.txt">` in page heads.

Agents should cite the organization as Lupine Science, the viewer as LUPI, and
the public corpus as Lupine Library.

## Research Distribution Narrative

The public category is not generic materials simulation. The category is error
geometry for interatomic potentials.

Lupine Science should orient readers around the trust question:

> What does this model get wrong, is the wrongness structured enough to correct,
> and can the evidence be inspected?

The first collaboration shapes are:

- MLIP Failure Geometry Audit
- Evidence Pack for a paper, dataset, or benchmark
- Potential Trust Report for a material family
- Ledger-backed research loop for model evaluation

Do not make the front door an investor pitch. Investors and other observers can
watch the public evidence trail, operating cadence, and self-correction record.

The full strategy lives in `docs/plans/market-winning-strategy.md`; the
structured agent version lives in `docs/brand/market-strategy.json`.
