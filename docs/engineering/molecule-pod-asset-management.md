# Molecule print-on-demand asset management system

## Purpose

This document defines the asset management system for extending the Lupi Live
molecule surface into a Shopify + Gooten print-on-demand shop. The system starts
from a shopper's interest in a molecule, captures safe customization choices,
renders a print-ready 2D pattern, and preserves enough provenance to reproduce,
inspect, approve, publish, and fulfill the exact asset that was sold.

The design keeps commerce orchestration in the `glim-think` control plane while
reusing the Lupi viewer and molecule library as the source of molecular truth.
It is intentionally not a marketing-site implementation; it is the durable
workflow and asset ledger needed before storefront UX and catalog pages are
built.

## Product goals

- Turn a molecule search or saved Lupi view into a purchasable design family.
- Let shoppers customize only the dimensions that can be rendered and fulfilled
  reliably: molecule, viewpoint/projection, style, color palette, pattern layout,
  label text, product family, size, placement, and optional personalization.
- Produce deterministic print assets for each selected Gooten product/print
  space, with previews that Shopify can show and production files that Gooten can
  retrieve.
- Maintain a full evidence trail: source geometry, design parameters, renderer
  version, product template, approvals, generated files, Shopify IDs, Gooten IDs,
  and order-specific personalization.
- Support both curated catalog drops and one-off custom orders without forking
  the underlying asset model.

## External platform assumptions

- Shopify owns storefront browsing, checkout, customer accounts, discounts,
  taxes, and payment authorization.
- Gooten owns print-on-demand production, product catalog data, print-space
  templates, product previews, and order fulfillment.
- The integration must be able to publish catalog products through the Gooten
  Shopify app path and also support a custom API path for generated or
  personalized assets.
- Gooten print artwork URLs must be publicly fetchable at production time, so the
  system must publish immutable render artifacts to signed or public CDN-backed
  locations rather than keeping them only in private working storage.

## Core concepts

### 1. Molecule source

A molecule source is the scientific input used to generate the design. It can be
a saved Lupi view, curated library item, gallery molecule, NIST/PubChem hit, or
Meta OMol25 geometry. The source record stores canonical identifiers, provenance,
geometry URL, resolved structure hash, display name, formula, tags, and any
rights or usage notes.

### 2. Design brief

A design brief is the user- or merchandiser-facing intent: why this molecule is
interesting, the audience, product target, allowed customizations, style guardrails,
and copy constraints. It is the durable bridge between molecule search and asset
rendering.

### 3. Design recipe

A design recipe is the deterministic rendering input. It freezes projection,
atom/bond styling, palette, pattern tiling, label placement, background,
accessibility contrast, DPI, bleed, safe zone, and per-product placement rules.
Recipes are versioned and content-addressed so a sold asset can always be
re-rendered or audited.

### 4. Render artifact

A render artifact is an output file created from a recipe: production PNG/TIFF/PDF,
transparent overlay, SVG working file, Shopify preview image, Gooten preview image,
thumbnail, or QA contact sheet. Each artifact stores dimensions, DPI, color mode,
file hash, storage URL, renderer version, and validation status.

### 5. Product binding

A product binding maps a design recipe to a sellable product variant and print
space. It stores the Gooten product/SKU/options, print-area template, Shopify
product/variant IDs, pricing metadata, mockups, and the publish state.

### 6. Customization session

A customization session captures shopper choices before purchase. Sessions can
remain ephemeral until checkout, but after an item enters a cart the system must
persist the recipe diff and generated proof so the exact purchased asset can be
recreated for fulfillment.

### 7. Fulfillment package

A fulfillment package is the immutable set of production artifacts, metadata, and
external IDs needed to submit or route an order line to Gooten. It is generated
per order line when personalization changes the artwork; otherwise it can point
to an approved reusable catalog asset.

## Lifecycle

1. **Discover molecule.** A user or merchandiser searches through the Lupi MCP
   surface and selects a molecule or saved view.
2. **Create brief.** The system records the interest signal, target product
   family, scientific story, copy constraints, and customization policy.
3. **Draft recipe.** The renderer builds one or more 2D pattern recipes from the
   molecule source and style presets.
4. **Bind product templates.** The recipe is mapped to Gooten print spaces for
   candidate products such as posters, apparel, mugs, totes, notebooks, or phone
   cases.
5. **Render proofs.** The engine emits preview images, contact sheets, and
   production candidates into immutable asset storage.
6. **Validate.** Automated gates check file dimensions, DPI, transparent areas,
   bleed/safe zones, contrast, label spelling, product template fit, and molecule
   provenance.
7. **Approve.** A human or policy workflow approves the design family for catalog
   publication or marks it as custom-order-only.
8. **Publish.** The commerce adapter creates or updates Shopify products and
   variants, attaches previews, stores product metadata, and links to the Gooten
   product binding.
9. **Sell/customize.** The storefront records shopper customizations as a session
   and freezes them into an order-line recipe diff at checkout.
10. **Fulfill.** The order worker creates a fulfillment package, ensures Gooten can
    fetch production artwork, submits or routes the order, and writes Gooten order
    IDs back to the ledger.
11. **Observe.** Spans and ledger events record render timing, validation results,
    publish attempts, order handoff, reprints, cancellations, and customer support
    interventions.

## Data model

| Entity | Durable key | Purpose | Important fields |
| --- | --- | --- | --- |
| `MoleculeSource` | `molsrc_<hash>` | Canonical molecule input | source type, external IDs, geometry URL, structure hash, formula, name, rights notes |
| `DesignBrief` | `brief_<id>` | User/merch intent | molecule source, interest text, audience, product families, allowed customization schema, copy constraints |
| `DesignRecipe` | `recipe_<hash>` | Deterministic render input | brief ID, renderer version, style preset, projection, palette, layout, label config, template refs |
| `RenderArtifact` | `artifact_<hash>` | Output file metadata | recipe hash, role, URL, MIME type, dimensions, DPI, hash, validation results |
| `ProductBinding` | `binding_<id>` | Sellable mapping | recipe hash, Gooten product/SKU/options, print spaces, Shopify product/variant IDs, status |
| `CustomizationSession` | `session_<id>` | Shopper choices | base binding, recipe diff, preview artifact, cart token, expiration, order link |
| `FulfillmentPackage` | `fulfill_<order_line_id>` | Production handoff | order line, artifact URLs, Gooten IDs, Shopify IDs, status, retries, audit log |
| `AssetApproval` | `approval_<id>` | Gate decision | artifact IDs, reviewer/policy, verdict, notes, timestamp |

## Storage layout

Use content-addressed object storage for generated files and a queryable ledger
for metadata.

```text
pod-assets/
  molecule-sources/{molsrc_hash}/source.json
  recipes/{recipe_hash}/recipe.json
  recipes/{recipe_hash}/proofs/{artifact_hash}.png
  recipes/{recipe_hash}/production/{gooten_product}/{print_space}/{artifact_hash}.png
  recipes/{recipe_hash}/mockups/{shopify_product}/{artifact_hash}.jpg
  orders/{shopify_order_id}/{line_item_id}/fulfillment-package.json
```

Rules:

- Production artifact URLs are immutable; never overwrite a file after it has
  been attached to a Shopify product, cart, order, or Gooten submission.
- Mutable aliases such as `latest-preview.png` are allowed only for internal
  drafts and must never be used for fulfillment.
- Store the source recipe next to every generated file so the asset can be
  regenerated even if the database row is unavailable.
- Keep private work-in-progress files separate from publishable production files;
  only production files and required previews should be CDN-fetchable.

## Customization schema

Each product binding advertises a JSON schema of safe customizations. Example
axes:

- `molecule`: fixed catalog molecule, allowed molecule set, or user-selected Lupi
  search result.
- `projection`: canonical 2D projection, saved 3D camera projection, ring layout,
  lattice view, or stylized orbital view.
- `palette`: brand palettes plus product-specific contrast constraints.
- `pattern`: centered hero molecule, tiled repeat, radial repeat, gradient field,
  or all-over print.
- `label`: none, formula, common name, custom short text, coordinates, or short
  science note.
- `personalization`: initials, date, gift message, or molecule-interest prompt.
- `productPlacement`: print-space placement, scale, rotation, and safe-zone policy.

Every axis must declare validation rules, preview requirements, fulfillment impact,
and whether it changes the reusable catalog asset or creates an order-specific
asset.

## Rendering and validation pipeline

- **Renderer inputs:** molecule geometry, projection settings, style preset,
  customization diff, product template, and output spec.
- **Renderer outputs:** layered SVG working file, transparent production raster,
  flattened production raster where required, Shopify preview, Gooten preview, and
  QA contact sheet.
- **Validation gates:** exact pixel dimensions, DPI, bleed, safe zone, color mode,
  alpha handling, maximum file size, public fetchability, contrast, label overflow,
  banned text, provenance completeness, and duplicate-hash detection.
- **Human review:** required for new molecule sources, new product families, copy
  changes that make scientific claims, and any asset flagged by validation.
- **Telemetry:** emit OpenInference-style spans for molecule resolution, recipe
  generation, rendering, validation, approval, Shopify publish, and Gooten handoff.
  Telemetry remains opt-in and non-blocking, matching the existing flywheel
  pattern.

## Integration boundaries

### Lupi MCP and molecule library

The asset system should call the existing molecule search/load surface instead of
inventing a second molecule catalog. A saved Lupi view can become a molecule
source, and an approved product design can write a backlink to the library item so
future agents can find merch-ready molecules.

### `glim-think` control plane

`glim-think` should own long-running workflow state: agenda items for new design
families, ledger entries for recipe/render/approval/publish events, retries for
Shopify and Gooten adapters, and policy checks for fulfillment readiness.

### Shopify

Shopify receives products, variants, preview images, product metafields, cart line
properties, and order webhooks. Shopify should not be the only store of the recipe
or production asset; it stores commerce-facing references back to the asset
ledger.

Recommended metafields:

- `lupine.molecule_source_id`
- `lupine.design_recipe_hash`
- `lupine.product_binding_id`
- `lupine.customization_schema_version`
- `lupine.preview_artifact_ids`
- `lupine.fulfillment_mode` (`catalog_asset` or `order_specific_asset`)

### Gooten

Gooten-facing code should be isolated behind a fulfillment adapter that can:

- Sync or cache product catalog and print-space templates.
- Create print-ready product mappings from approved production artwork.
- Generate product previews for QA and Shopify publication.
- Submit order lines with the correct product variant, print space, artwork URL,
  shipping address, and billing configuration.
- Poll or receive fulfillment status updates and write them back to the ledger.

## API surface

Initial internal endpoints or durable workflow commands:

```text
POST /pod/molecule-sources/resolve
POST /pod/design-briefs
POST /pod/design-recipes/draft
POST /pod/design-recipes/{recipeHash}/render
POST /pod/render-artifacts/{artifactHash}/validate
POST /pod/product-bindings
POST /pod/product-bindings/{bindingId}/publish-shopify
POST /pod/customization-sessions
POST /pod/customization-sessions/{sessionId}/freeze
POST /pod/fulfillment-packages
POST /pod/fulfillment-packages/{packageId}/submit-gooten
GET  /pod/assets/{id}
GET  /pod/ledger/events?entity=...
```

## Approval and governance

- New molecule sources require provenance and rights review before catalog use.
- Scientific copy must be factual, short, and tied to the molecule source; claims
  that imply medical, therapeutic, or performance effects require explicit review.
- Print files cannot publish until validation passes and all required product
  spaces have production artifacts.
- Order-specific personalization can bypass catalog approval only if it stays
  within an approved customization schema.
- Reprints must reuse the original fulfillment package unless the customer support
  agent explicitly creates a corrected package.

## Minimum viable build sequence

1. Add the metadata ledger tables/entities for molecule sources, briefs, recipes,
   artifacts, product bindings, customization sessions, approvals, and fulfillment
   packages.
2. Implement a renderer stub that emits deterministic placeholder previews and
   production-size blank/contact-sheet artifacts for one product family.
3. Add validation gates for dimensions, hash immutability, public URL fetchability,
   safe-zone metadata, and recipe completeness.
4. Wire Lupi molecule search results into `MoleculeSource` creation.
5. Add a Shopify draft-product publisher using metafields and preview artifacts.
6. Add a Gooten adapter skeleton for catalog/template sync and artwork URL checks.
7. Add order webhook handling that freezes customization sessions into fulfillment
   packages without submitting live orders by default.
8. Promote to live fulfillment only after sandbox orders prove Gooten can fetch
   the immutable artwork and status events round-trip into the ledger.

## Open decisions

- Which product family should be the first production template: poster, apparel,
  mug, tote, or phone case?
- Should order-specific personalization happen in Shopify line-item properties,
  a custom storefront app, or a Lupi-hosted configurator embedded in Shopify?
- Which storage backend should hold public production files: Cloudflare R2, GCS,
  or Firebase Storage?
- What is the first approved molecule/style collection, and who owns scientific
  copy review?
- Should generated pattern recipes be exposed back through MCP as reusable design
  resources for agents?
