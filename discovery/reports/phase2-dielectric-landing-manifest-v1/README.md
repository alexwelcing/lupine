# Dryad landing identifies two files; file identity remains unverified

The one ordinary GET to the exact [registry-supplied landing URL](https://datadryad.org/dataset/doi:10.5061/dryad.ph81h) returned HTTP 200 without redirects or retries. Its structured Dataset metadata confirms DOI `10.5061/dryad.ph81h`, version `1` and a CC0-1.0 license declaration. Literal download anchors identify two files:

| Literal file name | Literal page link, not followed |
|---|---|
| `dielectric_tensors_and_refractive_indices_v3.json` | `/downloads/file_stream/69471` |
| `README_for_dielectric_tensors_and_refractive_indices_v3.pdf` | `/downloads/file_stream/69472` |

These are **documentary file names and locators**, not verified file contents. The filename suffix `v3` is distinct from the landing page's numeric dataset version `1` and the registry's string `"1"`. No relationship between those version conventions was inferred. No file, README PDF or bulk archive was downloaded.

The [selected projection](landing/projection.json) retains exact structured metadata and literal links. The inspected JSON-LD and link projection supplies no file byte counts or checksums. That is a limit of the inspected representation, not a claim that such information cannot exist elsewhere on the site. The JSON-LD `distribution` is an `application/zip` **download** route; it is not a metadata-only manifest endpoint. No exact metadata-only next URL was identified by this projection.

The page's structured `url` and bulk-download strings use HTTP and double-encoded DOI punctuation. Those strings are preserved literally. The separate anchor projection records both original relative hrefs and their ordinary resolution against the requested HTTPS landing URL. None was repaired, normalized into a new API request, followed or treated as a canonical file identity. No alternative API or second request ran.

The [prospective scope](scope.json) preceded acquisition. The exact HTML is 38,136 bytes, SHA256 `80d2afe88f7bbe6921fc7387cfe8d3dd37e4d2a85e1077897efcd24c36746c29`. The bounded HTML parser examined structured metadata and literal links without running JavaScript or retrieving dependencies. One JSON-LD block parsed successfully; no transport or parse failure occurred. The [request receipt](landing/receipt.json) preserves the original status, timing and identity.

The whole HTML container was machine read and may contain scientific descriptions, aggregate information or site scripts. Researcher output was restricted to file/identity/license/version metadata and structural presence information; no descriptions, abstract, scientific results or file contents were displayed. Earlier paper qualitative exposure remains unchanged, and no freshness or untouched-evidence claim follows.

This adds a documentary file-list step to the primary Dryad identity and rights record. Exact file bytes/hashes, observation schema, units, pairing/completeness, source overlap and equivalence to processed Figshare file `13213475` remain unresolved. Landing-page CC0 corroborates the primary dataset's registry declaration; it is not a verified rights or equivalence statement for the derivative file. Li remains primary. No data acquisition, join, fit, benchmark selection, threshold or admission changed.

The [source bindings](source-bindings.json) and [disposition](disposition.json) bind this narrow result. Raw HTML is retained ignored and excluded from the public copy set. Any subsequent metadata or file request requires its own explicit scope; this task ends after the single authorized landing request.
