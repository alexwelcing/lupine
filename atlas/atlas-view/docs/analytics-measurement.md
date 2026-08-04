# Lupi Analytics Measurement

Lupi has two measurement lanes:

- First-party analytics: enabled in production through `VITE_LUPI_ANALYTICS_URL`.
  Events go to `collectAnalytics`, then structured Cloud Logging entries with
  `jsonPayload.component="lupi_analytics"`.
- Firebase/GA4: available, but intentionally disabled by default. Only enable it
  with `VITE_FIREBASE_ANALYTICS_ENABLED=true` and
  `VITE_FIREBASE_ANALYTICS_CONSENT=granted` after consent/legal basis is handled.

## Live Verification

Run this after deploys:

```bash
pnpm verify:analytics-live
```

It loads `https://lupi.live/` with a synthetic UTM campaign, verifies that:

- the browser sends a first-party `app_landed` event to `collectAnalytics`;
- no Firebase/GA network requests are made by default;
- the matching event lands in Cloud Logging.

Synthetic verification traffic uses `utm_source=codex_verify` and is excluded
from the report tool by default.

## Funnel Report

Summarize recent events from Cloud Logging:

```bash
pnpm analytics:report -- --hours=24
pnpm analytics:report -- --hours=168 --limit=5000
pnpm analytics:report -- --hours=24 --json
```

The report shows:

- event counts and unique-session counts by funnel step;
- conversion from the previous step and from `app_landed`;
- top UTM cohorts by session count, signup completions, and saves;
- the most recent events.

To include synthetic verifier traffic:

```bash
pnpm analytics:report -- --include-probes=true
```

## Raw Logs Explorer Filter

```text
jsonPayload.component="lupi_analytics"
```

Useful refinements:

```text
jsonPayload.component="lupi_analytics"
jsonPayload.event="view_saved"
```

```text
jsonPayload.component="lupi_analytics"
jsonPayload.utm.utm_campaign="launch"
```
