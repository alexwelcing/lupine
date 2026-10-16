# Read-only source readiness snapshot

The resource `src/lupine_discovery/resources/source-readiness-v1.json` is a
documentary snapshot of already published evidence at commit
`88d512cbf40a7a7d11fb45aa24cd5462f8a7e81d`. It performs no acquisition or source
inspection. Neither source is admitted for scientific benchmarking. A blocked
source operation is not a negative scientific result. The resource retains
Li's partial XML exposure and Dryad's earlier qualitative/metadata exposure.

The closed successful resource shape has exactly `schema`, `snapshot_commit`
and `sources`. Its schema is `lupine.source-readiness.v1`, its commit is the
literal commit above, and `sources` contains exactly the ordered Li and Dryad
records. Every source has exactly these members:

| Member | Type and scope |
| --- | --- |
| `id`, `title`, `data_kind` | Nonempty ASCII strings |
| `status` | `BLOCKED_SCHEMA` for Li; `BLOCKED_ACCESS` for Dryad |
| `scientific_admission` | Literal `NOT_ADMITTED` |
| `completed_actions`, `unexecuted_actions`, `blockers`, `exposure` | Nonempty arrays of nonempty ASCII strings |
| `license_declaration` | Nonempty ASCII string, documentary rights declaration only |
| `evidence_urls` | Nonempty array of fixed HTTPS GitHub links to the exact snapshot |

All strings are at most 1,024 characters; each array is at most 16 elements.
The file is at most 32 KiB and has nesting depth at most eight. Duplicate keys,
non-ASCII strings, control characters, extra/missing fields, non-string scalar
values and altered source order are rejected. There are no numeric measurement
values. Operational counts appear only in bounded descriptive strings.

Structural validation is followed by equality to the reviewed snapshot's
canonical SHA256: sorted keys, compact separators, ASCII JSON, no trailing LF.
This prevents a structurally valid claim edit from becoming a current readiness
claim. It is an identity check, not scientific attestation. A new evidence
snapshot requires an explicit review and an updated resource and validator pin;
the loader never fetches or silently upgrades evidence.

`load_source_readiness()` returns a detached validated object or raises a closed
`SourceReadinessError`. `validate_source_readiness(value)` is the pure object
validator; `loads_source_readiness(raw)` applies the bounded strict JSON decoder.
`source_readiness_report()` returns either the complete validated resource or
this separate closed failure shape:

```json
{
  "schema": "lupine.source-readiness.unavailable.v1",
  "status": "UNAVAILABLE",
  "reason": "SOURCE_READINESS_RESOURCE_MISSING",
  "scientific_admission": "NOT_ADMITTED"
}
```

Missing or unreadable resources use status `UNAVAILABLE` and reason
`SOURCE_READINESS_RESOURCE_MISSING` or `SOURCE_READINESS_RESOURCE_UNREADABLE`.
Invalid, stale or altered resources use status `INVALID` and reason
`SOURCE_READINESS_RESOURCE_INVALID`. None has a `sources` member, empty success
list, cached prior snapshot or scientific success claim.

`lupine-discovery source-readiness [--output PATH]` emits deterministic sorted,
indented JSON plus a final LF. Exit zero means this documentary snapshot was
loaded; it does not mean scientific readiness. Missing/unreadable/invalid
resource results emit their explicit failure object and exit two. The same
object appears in `/api/benchmarks` under `source_readiness`; the surrounding
benchmark response and other routes retain their existing meanings. The UI
asset route is `/source-readiness.js`. The new command accepts no source path,
URL, request or retry option. Browser exports preserve complete JSON identity;
whitespace and key order are not scientific content.
