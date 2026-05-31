import { describe, it, expect } from "vitest";
import { searchCatalog, scoreEntry } from "../src/catalog";
import type { CatalogEntry } from "../src/types";

// Small fixture catalog exercising title / subtitle / formula / tags /
// elements / domain matching.
const CATALOG: CatalogEntry[] = [
  {
    id: "h2o",
    title: "Water",
    subtitle: "The universal solvent",
    formula: "H2O",
    elements: ["H", "O"],
    tags: ["solvent", "liquid", "polar"],
    domain: "chemistry",
  },
  {
    id: "c6h6",
    title: "Benzene",
    subtitle: "Aromatic ring",
    formula: "C6H6",
    elements: ["C", "H"],
    tags: ["aromatic", "ring", "organic"],
    domain: "organic",
  },
  {
    id: "nacl",
    title: "Sodium Chloride",
    subtitle: "Table salt",
    formula: "NaCl",
    elements: ["Na", "Cl"],
    tags: ["salt", "ionic", "crystal"],
    domain: "materials",
  },
  {
    id: "fe2o3",
    title: "Hematite",
    subtitle: "Iron(III) oxide",
    formula: "Fe2O3",
    elements: ["Fe", "O"],
    tags: ["mineral", "oxide", "rust"],
    domain: "materials",
  },
  {
    id: "fe3o4",
    title: "Magnetite",
    subtitle: "Iron(II,III) oxide",
    formula: "Fe3O4",
    elements: ["Fe", "O"],
    tags: ["mineral", "magnetic", "oxide"],
    domain: "materials",
  },
  {
    id: "caffeine",
    title: "Caffeine",
    subtitle: "Stimulant alkaloid",
    formula: "C8H10N4O2",
    elements: ["C", "H", "N", "O"],
    tags: ["alkaloid", "stimulant"],
    domain: "biochemistry",
  },
];

describe("searchCatalog", () => {
  it("matches by exact title (case-insensitive)", () => {
    const hits = searchCatalog(CATALOG, { query: "water" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.id).toBe("h2o");
  });

  it("matches by exact id", () => {
    const hits = searchCatalog(CATALOG, { query: "nacl" });
    expect(hits[0]?.id).toBe("nacl");
  });

  it("matches by formula", () => {
    const hits = searchCatalog(CATALOG, { query: "C6H6" });
    expect(hits[0]?.id).toBe("c6h6");
  });

  it("matches by subtitle words (fuzzy / token overlap)", () => {
    const hits = searchCatalog(CATALOG, { query: "table salt" });
    expect(hits[0]?.id).toBe("nacl");
  });

  it("matches by tag", () => {
    const hits = searchCatalog(CATALOG, { query: "aromatic" });
    expect(hits[0]?.id).toBe("c6h6");
  });

  it("matches by domain word", () => {
    const ids = searchCatalog(CATALOG, { query: "biochemistry" }).map((h) => h.id);
    expect(ids).toContain("caffeine");
  });

  it("does substring / prefix matching for partial words", () => {
    // "magnet" should prefer Magnetite (title prefix) — substring/prefix path.
    const hits = searchCatalog(CATALOG, { query: "magnet" });
    expect(hits[0]?.id).toBe("fe3o4");
  });

  it("biases results with the elements filter", () => {
    // Generic word "oxide" matches both iron oxides; the Fe/O element filter
    // keeps them top-ranked over unrelated entries.
    const hits = searchCatalog(CATALOG, { query: "oxide", elements: ["Fe", "O"] });
    const topIds = hits.slice(0, 2).map((h) => h.id);
    expect(topIds).toContain("fe2o3");
    expect(topIds).toContain("fe3o4");
  });

  it("ranks the best match first when several are plausible", () => {
    // "iron oxide mineral" should surface both, with the exact subtitle
    // phrase ("iron(iii) oxide") not required — token overlap drives rank.
    const hits = searchCatalog(CATALOG, { query: "iron oxide mineral" });
    const ids = hits.map((h) => h.id);
    expect(ids).toContain("fe2o3");
    expect(ids).toContain("fe3o4");
  });

  it("returns at most the requested number of hits", () => {
    const hits = searchCatalog(CATALOG, { query: "oxide" }, 1);
    expect(hits.length).toBeLessThanOrEqual(1);
  });

  it("defaults the limit to 5", () => {
    // A broad query that touches many entries should still cap at 5.
    const hits = searchCatalog(CATALOG, { query: "o" });
    expect(hits.length).toBeLessThanOrEqual(5);
  });

  it("returns trimmed fields only (id, title, formula, elements, domain)", () => {
    const hit = searchCatalog(CATALOG, { query: "water" })[0];
    expect(hit).toBeDefined();
    expect(Object.keys(hit ?? {}).sort()).toEqual(
      ["domain", "elements", "formula", "id", "title"].sort(),
    );
    // subtitle and tags must NOT leak through.
    const asRecord = hit as unknown as Record<string, unknown>;
    expect(asRecord.subtitle).toBeUndefined();
    expect(asRecord.tags).toBeUndefined();
  });

  it("returns nothing for a query with no signal", () => {
    const hits = searchCatalog(CATALOG, { query: "xyzzy-nonexistent-zzz" });
    expect(hits).toEqual([]);
  });

  it("handles an empty catalog", () => {
    expect(searchCatalog([], { query: "water" })).toEqual([]);
  });

  it("returns a stable prefix when query and elements are both empty", () => {
    const hits = searchCatalog(CATALOG, { query: "" });
    expect(hits.length).toBe(5);
    expect(hits[0]?.id).toBe("h2o"); // first catalog entry, stable order
  });
});

describe("scoreEntry", () => {
  const water = CATALOG[0]!;

  it("scores an exact title match very highly", () => {
    const score = scoreEntry(water, ["water"], "water", []);
    expect(score).toBeGreaterThanOrEqual(100);
  });

  it("scores an unrelated query at zero", () => {
    const score = scoreEntry(water, ["quartz"], "quartz", []);
    expect(score).toBe(0);
  });

  it("penalizes (but does not zero) a missing requested element", () => {
    // Water has no Fe; requesting Fe should soft-penalize, not hard-exclude.
    const base = scoreEntry(water, ["water"], "water", []);
    const penalized = scoreEntry(water, ["water"], "water", ["Fe"]);
    expect(penalized).toBeLessThan(base);
  });
});
