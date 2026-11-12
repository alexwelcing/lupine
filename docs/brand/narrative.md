# Lupine Science Brand Narrative

This is the canonical narrative layer for human readers, search engines, and
agentic systems. It keeps the public site, LUPI, the Library, publication
templates, and generated research notes pointed at the same story.

## Core Identity

Lupine Science measures where machine-learned models of atoms go wrong,
against published references and pass/fail gates set in advance, and publishes
every verdict, failures included.

Lupine Science is an early-stage, founder-led research company. We
independently measure the errors of machine-learned interatomic potentials
(MLIPs), test corrections against preregistered gates, record any amendment
made after results are seen, and publish the verdict: pass, fail or abstain.
Correction is a research question here, not a product: it has held only in
narrow, stated cases. Nothing we have published is peer-reviewed yet.

The first reader is a serious materials-science reader: a university PI,
national-lab lead, MLIP builder, research software collaborator, or lab director
who wants to know whether a model can be trusted outside the narrow conditions
where it looked accurate.

## Narrative Spine

1. Interatomic potentials are necessary and wrong in ways worth measuring.
2. A pooled MLIP error can hide where a model fails; we stratify (functional,
   pair_style, element) before trusting a leaderboard number. Whether errors
   share structure across models, elements and properties is an open question
   we test against gates set in advance.
3. Lupine Science treats each measurement as evidence, not as a leaderboard
   entry, and publishes the verdict whether it passes, fails or abstains.
4. LUPI makes the evidence inspectable in the browser.
5. The Lupine Library turns the work into durable human knowledge.
6. glim-think keeps the agentic research loop attached to claims, evidence,
   refutations, and broadcasts.

## Science Spine

Use this taxonomy when a surface needs to show the full scientific program:

| Layer | Question |
| --- | --- |
| Error geometry | Do prediction errors form stable low-dimensional structure? (Open: tested, not established.) |
| Sloppy-model structure | Which stiff and sloppy directions explain model failure? |
| Cross-MLIP transfer | Do foundation MLIPs inherit, rotate, or escape the classical error geometry? |
| Causal and statistical validity | Which trends survive matched samples, bootstrap controls, and confounder checks? |
| Claim lifecycle | Which claims are Supported, Open, Failed, Abstained, Refuted by us, Self-corrected or Withdrawn? |
| Formal specification | Which arithmetic and stated inequalities behind published numbers can Lean 4 check? (It does not check the physics, the reference data or the pipeline.) |
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
software collaborators. Readers evaluating the program should start from the
evidence trail, claim lifecycle, and operating cadence without being directly
pitched on the surface.

Prefer:

- "error geometry"
- "field evidence"
- "science spine"
- "claim lifecycle"
- the ledger's statuses: Supported, Open, Failed, Abstained, Refuted by us,
  Self-corrected, Withdrawn
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
- "publishes corrections" or "correction layer" as a product: correction is a
  research question, and it has held only in narrow, stated cases
- "proof pack" (say "evidence record") and "certificate" for a physical result

## One-Sentence Forms

General:

> Lupine Science measures where machine-learned models of atoms go wrong,
> against published references and pass/fail gates set in advance, and
> publishes every verdict, failures included.

Lab reader:

> Lupine Science is a lab-facing research record on MLIP error: measurements
> against published references, gates set in advance, a claim lifecycle and
> inspectable evidence.

Evaluator:

> Lupine Science is best evaluated from its evidence trail: the hypothesis
> ledger, Library reports, LUPI evidence routes and the corrections log.

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

> What does this model get wrong, against which references, and can the
> evidence be inspected?

We are open to working with labs and model builders on work of these shapes.
None of them is an offered product today:

- an independent error audit of an MLIP on a material family, with pass/fail
  gates set in advance
- an evidence record for a paper, dataset, or benchmark
- a ledger-backed evaluation loop for a model

Do not make the front door an investor pitch. Readers evaluating the program
should start from the public evidence trail and the ledger.

The full strategy lives in `docs/plans/market-winning-strategy.md`; the
structured agent version lives in `docs/brand/market-strategy.json`.
