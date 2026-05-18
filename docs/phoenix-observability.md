# Phoenix: Making the Research Loop Observable

**Featured.** This is the story of wiring [Arize Phoenix](https://phoenix.arize.com)
into the Lupine research loop — why we did it, what broke, what we proved, and how to
get more value out of it next. It is the first instrument that lets us ask whether the
loop is actually getting better, instead of assuming it is.

## Why

The Lupine research loop runs hypotheses through an LLM-driven pipeline: harvest →
comprehend → conjecture → evaluate → close. For months it ran **blind**. We could see
that it produced output; we could not see whether the output was *improving*, which
model actually served a request, or where latency and cost went. A self-improving
system you cannot measure is just a system that changes.

Observability is the precondition for the entire north-star plan: the hypothesis
lifecycle is the unit of optimization, Phoenix evals are the fitness function, and the
Evolver is the actuator. Without the fitness function wired in, the Evolver has nothing
to climb.

## What we did

1. **Diagnosed the two disconnected halves.** Phoenix configuration was split: GitHub
   repo secrets fed the hourly evaluation workflow, while wrangler secrets fed the
   Cloudflare Worker's trace exporter. Neither was set by deploy automation, so
   **0 / 300 spans** reached Phoenix Cloud. We set both halves.
2. **Consolidated to one LLM path.** `glim-think` had two LLM code paths; the gateway
   one was dead (it produced none of the 300 spans). We deleted it and kept a single
   AI-SDK-native path so telemetry reflects reality.
3. **Wired OpenInference telemetry**, golden datasets and a functional eval runner via
   the Phoenix REST API, a per-model performance scorecard reading live-path
   attribution (`ai.telemetry.functionId`), and finally **closed the eval→routing
   loop** so model selection is driven by measured performance.

## What we proved (the hard part)

The Worker still showed zero spans even with valid secrets. We proved a **hard
infrastructure limit**: a Cloudflare Worker cannot export OTLP directly to Phoenix
Cloud. The Cloudflare edge black-holes the Worker→external subrequest and returns a
**fabricated `200`** — `curl` from outside gets the real `server: uvicorn`, the Worker
gets a fake `server: cloudflare`. The Phoenix key was valid the entire time. The fix is
not a config tweak; it requires a GCP egress relay (mirroring `deploy-otlp-relay.yml`).
Naming the limit precisely is itself a result — it stopped weeks of key-rotation
guesswork.

## Results

- Telemetry is now **truthful**: the scorecard reads the path that actually executed,
  not a path that never ran.
- The eval→routing loop selects models on real measured performance.
- The exact egress limitation is documented and bounded, with a known fix shape.

## Suggested next steps — getting more value from this tool

Phoenix is wired; the leverage now is in *using* it:

1. **Stand up the GCP OTLP relay** so Worker spans actually land — until then the
   richest traces (the live research loop) are still dark.
2. **Make the hypothesis lifecycle a first-class trace.** One trace per hypothesis,
   spanning harvest→close, so a reader can replay *why* a conjecture moved. This is the
   substrate the Evolver optimizes against.
3. **Promote scientific-throughput evals** (did a round produce a literature-anchored,
   non-trivial, falsifiable claim?) to the loop's fitness function — not just latency
   and cost.
4. **Feed the scorecard into the Evolver's model-selection actuation**, keeping
   structural change PR-gated and prompt/rubric/criteria change autonomous.
5. **Regression-gate every Evolver change** against the golden datasets so the loop can
   only ratchet forward.

The goal is not dashboards. It is a measurable fitness function on the hypothesis
lifecycle, so "the loop is improving" becomes a claim we can check instead of hope.
