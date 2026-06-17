import {
  FUNCTIONAL_GROUPS_SEO,
  FUNCTIONAL_GROUP_EXAMPLES_SEO,
  MILLION_ATOM_VIEWER_SEO,
  OCHEM_VIEWER_SEO,
  OMOL25_GEOMETRY_SEO,
  OMOL25_SEO,
  useSeo,
  type SeoConfig,
} from '../seo';
import { FUNCTIONAL_GROUPS } from '../organicFunctionalGroups';

export type SeoEducationKind =
  | 'functional-groups'
  | 'functional-group-examples'
  | 'ochem-viewer'
  | 'omol25'
  | 'omol25-geometry'
  | 'million-atom-viewer';

interface EducationPageConfig {
  seo: SeoConfig;
  eyebrow: string;
  title: string;
  intro: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  image: string;
  imageAlt: string;
  visualCaption: string;
  stats: Array<[string, string]>;
  sections: Array<{ title: string; body: string }>;
  proofTitle: string;
  proofBody: string;
  proofItems: Array<{ label: string; detail: string }>;
  dataTitle: string;
  dataBody: string;
}

const COURSE_GROUPS = FUNCTIONAL_GROUPS.slice(0, 12).map((group) => ({
  id: group.id,
  label: group.label,
  family: group.family,
  color: group.color,
}));

const PAGES: Record<SeoEducationKind, EducationPageConfig> = {
  'functional-groups': {
    seo: FUNCTIONAL_GROUPS_SEO,
    eyebrow: 'Organic chemistry study route',
    title: 'Functional groups become visible, comparable, and teachable in the molecule view.',
    intro:
      'Lupi turns the first-year organic chemistry move into an interactive loop: recognize the pattern, compare nearby examples, predict the chemistry, then export a study sheet with the same view.',
    primaryHref: '/#gallery',
    primaryLabel: 'Open functional group gallery',
    secondaryHref: '/?sim=aspirin',
    secondaryLabel: 'Load aspirin example',
    image: '/gallery/snapshots/aspirin.jpg',
    imageAlt: 'Aspirin rendered in Lupi with its organic chemistry functional groups visible.',
    visualCaption: 'Aspirin study example',
    stats: [
      ['Course level', 'College ochem'],
      ['Study handles', `${FUNCTIONAL_GROUPS.length} groups`],
      ['Viewer modes', 'Study Lens + print'],
      ['Example stance', 'Real 3D coordinates'],
    ],
    sections: [
      {
        title: 'Recognition before memorization',
        body:
          'Students can scan for carbonyls, arenes, alcohols, amines, nitriles, epoxides, and sulfur groups as spatial patterns instead of isolated names.',
      },
      {
        title: 'Mechanism prompts where the molecule is',
        body:
          'The Study Lens carries professor-order prompts into the active viewer: polarity, likely nucleophiles or electrophiles, common traps, and transfer questions.',
      },
      {
        title: 'Printable sheets that match the view',
        body:
          'Study-sheet export keeps the configured molecule image, group cues, provenance notes, composition, and practice questions together for recitation or office hours.',
      },
    ],
    proofTitle: 'A route built around how organic chemistry is actually taught.',
    proofBody:
      'The page maps search intent to the same interactive tools already inside the viewer: curated molecules, functional-group filters, Study Lens, AR study prompts, and print-to-PDF sheets.',
    proofItems: [
      { label: 'Compare', detail: 'Aspirin, benzaldehyde, acetone, phenol, acetonitrile, ethyl acetate, and more.' },
      { label: 'Explain', detail: 'Recognition cues, reactivity, spectroscopy checks, and common confusion guards.' },
      { label: 'Transfer', detail: 'Students move from a named group to a nearby molecule and ask what changes.' },
    ],
    dataTitle: 'The viewer separates structure from claims.',
    dataBody:
      'Curated organic examples use 3D coordinate files and teaching labels. Lupi does not turn those labels into fake source bonds or unsupported measured properties.',
  },
  'functional-group-examples': {
    seo: FUNCTIONAL_GROUP_EXAMPLES_SEO,
    eyebrow: 'Organic chemistry examples route',
    title: 'Functional group examples students can rotate, compare, and print.',
    intro:
      'Students search for examples when a name is not enough. Lupi gives them real 3D molecules for alcohols, phenols, aldehydes, ketones, acids, esters, amides, nitriles, arenes, and epoxides, then keeps the comparison inside the viewer.',
    primaryHref: '/#gallery',
    primaryLabel: 'Browse example molecules',
    secondaryHref: '/study/organic-functional-groups',
    secondaryLabel: 'Open study guide',
    image: '/gallery/snapshots/aspirin.jpg',
    imageAlt: 'Aspirin rendered as a multi-functional organic chemistry example in Lupi.',
    visualCaption: 'Multi-group example route',
    stats: [
      ['Search intent', 'Examples by group'],
      ['Examples include', 'Aspirin + carbonyls'],
      ['Learning move', 'Compare and transfer'],
      ['Output', 'Printable sheets'],
    ],
    sections: [
      {
        title: 'Examples grouped by the decisions students make',
        body:
          'The route emphasizes recognition cues that survive across molecules: carbonyl planarity, aromatic context, heteroatom polarity, acid-base behavior, and leaving-group logic.',
      },
      {
        title: 'Each example points back into the active viewer',
        body:
          'A student can move from a search result to the gallery, open a molecule, switch Study Lens on, and export the exact configured view for review.',
      },
      {
        title: 'The copy matches professor language',
        body:
          'The page is written around first-course concepts such as functional-group families, mechanism handles, spectroscopy checks, and common near-miss examples.',
      },
    ],
    proofTitle: 'A search landing page that behaves like an ochem recitation tool.',
    proofBody:
      'Instead of giving a static list, the page sends learners into molecule examples that can be rotated, compared, filtered, studied, and printed.',
    proofItems: [
      { label: 'Carbonyls', detail: 'Aldehydes, ketones, esters, acids, amides, anhydrides, and acyl halides become comparable patterns.' },
      { label: 'Heteroatoms', detail: 'Alcohols, phenols, amines, nitriles, epoxides, sulfides, thiols, and nitro groups keep visible shape context.' },
      { label: 'Arenes', detail: 'Aromatic examples show how the same group changes when it is attached to a ring system.' },
    ],
    dataTitle: 'The examples are teaching labels over real structures.',
    dataBody:
      'Lupi uses curated coordinates and explicit functional-group mappings for study. It does not claim those labels are measured properties or source-provided bond annotations.',
  },
  'ochem-viewer': {
    seo: OCHEM_VIEWER_SEO,
    eyebrow: 'Organic chemistry viewer route',
    title: 'A 3D molecule viewer built for how organic chemistry is learned.',
    intro:
      'Organic chemistry is taught through visual transfer: see a pattern, test what it implies, compare a nearby molecule, and explain the change. Lupi turns that rhythm into a browser-native viewer workflow.',
    primaryHref: '/?sim=aspirin',
    primaryLabel: 'Load aspirin in 3D',
    secondaryHref: '/study/functional-group-examples',
    secondaryLabel: 'See example set',
    image: '/gallery/snapshots/alanine_dipeptide.jpg',
    imageAlt: 'Alanine dipeptide rendered in Lupi as an organic molecule study example.',
    visualCaption: '3D study workflow',
    stats: [
      ['Viewer mode', 'Rotate + inspect'],
      ['Study layer', 'Ochem prompts'],
      ['Export', 'Image + PDF sheet'],
      ['Audience', 'College chemistry'],
    ],
    sections: [
      {
        title: 'Spatial reasoning comes before answer checking',
        body:
          'Learners can inspect atom positions, composition, labels, and group cues before jumping to a memorized reaction family.',
      },
      {
        title: 'Study Lens keeps prompts close to the molecule',
        body:
          'Mechanism, polarity, spectroscopy, and common-trap prompts sit with the active structure so a study session does not become a disconnected glossary.',
      },
      {
        title: 'Exports preserve the configured view',
        body:
          'Print and PDF study sheets carry the molecule image, labels, group notes, and practice questions so the view can travel into recitation or office hours.',
      },
    ],
    proofTitle: 'The page is a search doorway into the actual viewer experience.',
    proofBody:
      'The route explains why a 3D molecule viewer matters for organic chemistry, then moves learners directly into live structures and study surfaces.',
    proofItems: [
      { label: 'Recognize', detail: 'Find the visible functional group and name the geometry or polarity cue.' },
      { label: 'Reason', detail: 'Ask what the group implies for acidity, nucleophilicity, electrophilicity, or spectra.' },
      { label: 'Transfer', detail: 'Compare a related molecule and decide what changed chemically.' },
    ],
    dataTitle: 'Viewer aids stay separate from source claims.',
    dataBody:
      'Lupi can draw useful study overlays and display guides, but source geometry, curated teaching labels, and inferred viewer aids stay explicitly separated.',
  },
  omol25: {
    seo: OMOL25_SEO,
    eyebrow: 'Materials and molecule dataset route',
    title: 'OMol25 search belongs in a viewer that respects what the data actually says.',
    intro:
      'Lupi indexes OMol25 neutral-validation structures so learners and agents can open real DFT geometry, facet by elements or method-derived functional-group screens, and keep source topology separate from display aids.',
    primaryHref: '/?tab=omol25#gallery',
    primaryLabel: 'Open OMol25 browser',
    secondaryHref: '/study/organic-functional-groups',
    secondaryLabel: 'See functional group study',
    image: '/gallery/snapshots/diamond_crystal.jpg',
    imageAlt: 'A crystalline structure rendered in Lupi as a materials dataset example.',
    visualCaption: 'OMol25-ready geometry browser',
    stats: [
      ['Indexed slice', '27,697 structures'],
      ['Geometry', 'Real DFT XYZ'],
      ['Search facets', 'Elements + groups'],
      ['Bond stance', 'No source topology claim'],
    ],
    sections: [
      {
        title: 'Actual coordinates, not formula guesses',
        body:
          'Each OMol25 hit opens an XYZ geometry file from the hosted index, so the viewer starts from atom positions and element identity rather than reconstructing a molecule from a name.',
      },
      {
        title: 'Functional-group screens with provenance',
        body:
          'Organic tags are method-derived screens over geometry. They help students and agents triage examples, but they are labeled differently from source-provided bond topology.',
      },
      {
        title: 'Materials curriculum alongside molecules',
        body:
          'The same viewer language supports structure, processing, properties, performance, characterization prompts, and data provenance for materials-science teaching.',
      },
    ],
    proofTitle: 'A dataset route for learners, researchers, and agents.',
    proofBody:
      'Search engines can now discover a clear explanation of the OMol25 surface, while visitors get a direct path into the live browser and the same data-truth boundaries used in the app.',
    proofItems: [
      { label: 'Search', detail: 'Find records by text, element composition, and method-screened functional groups.' },
      { label: 'Inspect', detail: 'Open XYZ geometry in the same 3D viewer as the gallery and uploaded structures.' },
      { label: 'Qualify', detail: 'Keep coordinates, inferred display links, source labels, and measured properties distinct.' },
    ],
    dataTitle: 'OMol25 is geometry-first in Lupi.',
    dataBody:
      'The hosted index carries real DFT geometry and compact metadata. Lupi labels viewer-drawn links as visual guides unless a separate provenance artifact supplies source or quantum-analysis bonds.',
  },
  'omol25-geometry': {
    seo: OMOL25_GEOMETRY_SEO,
    eyebrow: 'OMol25 geometry route',
    title: 'OMol25 molecule geometry opens as real XYZ structures, not formula guesses.',
    intro:
      'The useful promise of an OMol25 viewer is not just search. It is opening the actual DFT geometry, preserving the distinction between coordinates, metadata, method-derived screens, and any bonds the source did not provide.',
    primaryHref: '/?tab=omol25#gallery',
    primaryLabel: 'Search OMol25 geometry',
    secondaryHref: '/materials/omol25',
    secondaryLabel: 'Read data boundary',
    image: '/gallery/snapshots/water_cluster_64.jpg',
    imageAlt: 'A molecular cluster rendered in Lupi for geometry-first dataset inspection.',
    visualCaption: 'Geometry-first dataset view',
    stats: [
      ['Route focus', 'XYZ geometry'],
      ['Source boundary', 'No fake bonds'],
      ['Search facets', 'Formula + elements'],
      ['Agent use', 'Loadable hits'],
    ],
    sections: [
      {
        title: 'Geometry is the source of truth',
        body:
          'OMol25 hits load from hosted XYZ coordinate files, so the viewer begins with atom positions and element identity rather than reconstructing chemistry from a formula string.',
      },
      {
        title: 'Screens help triage without pretending provenance',
        body:
          'Functional-group tags are method-derived signals that help people and agents find likely examples. They are useful, but they are not a replacement for source topology.',
      },
      {
        title: 'Dataset pages need honest language',
        body:
          'The route gives search engines and readers a clear explanation of what is real, what is inferred, and what should remain labeled as a display guide.',
      },
    ],
    proofTitle: 'A geometry-intent page for researchers and students.',
    proofBody:
      'This route targets users looking for OMol25 molecule geometry and sends them into a viewer that keeps the data boundary visible.',
    proofItems: [
      { label: 'Load', detail: 'Open XYZ structures directly in the same viewer used for curated gallery molecules.' },
      { label: 'Filter', detail: 'Facet by elements, formula text, and method-derived functional-group screens.' },
      { label: 'Audit', detail: 'Keep display links, source metadata, and measured or computed properties distinct.' },
    ],
    dataTitle: 'This is the fair ask of the tool.',
    dataBody:
      'Lupi can faithfully display OMol25 coordinates and any metadata in the index. It should not invent source bonds or properties that the dataset does not supply.',
  },
  'million-atom-viewer': {
    seo: MILLION_ATOM_VIEWER_SEO,
    eyebrow: 'Large materials visualization route',
    title: 'Million-atom materials visualization belongs in the browser, under user control.',
    intro:
      'Lupi opens a 953,312-atom FCC copper lattice as a first-impression scale test: not a video, not a static hero image, but an interactive scene that makes browser-native materials visualization feel real.',
    primaryHref: '/scenes/1m-copper-lattice',
    primaryLabel: 'Open 1M atom scene',
    secondaryHref: '/?sim=massive_1m',
    secondaryLabel: 'Load in viewer',
    image: '/gallery/snapshots/massive_1m.jpg',
    imageAlt: 'Nearly one million copper atoms rendered in the Lupi materials viewer.',
    visualCaption: '953,312-atom copper lattice',
    stats: [
      ['Scene scale', '953,312 atoms'],
      ['Structure', 'FCC copper'],
      ['Format', '.glimbin stream'],
      ['Goal', 'Controlled in scene'],
    ],
    sections: [
      {
        title: 'Scale is meaningful only when it remains interactive',
        body:
          'The page frames the copper lattice as a controllable scene so visitors understand Lupi as a working viewer, not a gallery of pre-rendered screenshots.',
      },
      {
        title: 'Materials science needs both overview and inspection',
        body:
          'Large lattices, trajectories, defects, and microstructures need zoomable context before a reader can judge what a model or simulation is showing.',
      },
      {
        title: 'The claim stays narrow and testable',
        body:
          'The route describes atom count, structure type, and browser visualization. It avoids implying measured properties or experimental provenance that are not part of the scene.',
      },
    ],
    proofTitle: 'A stronger first-impression route for LUPI scale.',
    proofBody:
      'Users searching for a million-atom viewer get a direct path to the copper lattice scene, while the copy explains what is actually being shown.',
    proofItems: [
      { label: 'Open', detail: 'Launch the public copper lattice route from a canonical URL.' },
      { label: 'Inspect', detail: 'Use the same viewer shell and controls as smaller molecule and materials examples.' },
      { label: 'Explain', detail: 'Frame the scene as generated geometry with atom positions and element identity.' },
    ],
    dataTitle: 'Big scenes still need source-aware claims.',
    dataBody:
      'The million-atom scene is a generated FCC copper scale test. Lupi treats that as a visualization and interaction benchmark, not as a measured materials-property dataset.',
  },
};

export function SeoEducationPage({ kind }: { kind: SeoEducationKind }) {
  const page = PAGES[kind];
  useSeo(page.seo);

  return (
    <main className="lupi-education-page" data-kind={kind}>
      <style>{EDUCATION_CSS}</style>
      <section className="lupi-education-hero" aria-labelledby="lupi-education-title">
        <div className="lupi-education-copy">
          <a className="lupi-education-eyebrow" href="/">
            {page.eyebrow}
          </a>
          <h1 id="lupi-education-title">{page.title}</h1>
          <p>{page.intro}</p>
          <div className="lupi-education-actions" aria-label="Education page actions">
            <a className="lupi-education-primary" href={page.primaryHref}>
              {page.primaryLabel}
            </a>
            <a className="lupi-education-secondary" href={page.secondaryHref}>
              {page.secondaryLabel}
            </a>
          </div>
        </div>
        <div className="lupi-education-visual" aria-label={page.imageAlt}>
          <img src={page.image} alt={page.imageAlt} />
          <div className="lupi-education-visual-caption">
            <span>Source-aware view</span>
            <strong>{page.visualCaption}</strong>
          </div>
        </div>
      </section>

      <section className="lupi-education-stats" aria-label="Route facts">
        {page.stats.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      {(kind === 'functional-groups' || kind === 'functional-group-examples' || kind === 'ochem-viewer') && (
        <section className="lupi-education-groups" aria-labelledby="lupi-education-groups-title">
          <div>
            <h2 id="lupi-education-groups-title">Functional group handles students can actually use.</h2>
            <p>
              The gallery already maps first-course chemistry language onto visible molecules. This route makes those handles discoverable before a student reaches the full app.
            </p>
          </div>
          <div className="lupi-education-chipgrid" aria-label="Functional group examples">
            {COURSE_GROUPS.map((group) => (
              <span key={group.id} style={{ '--group-color': group.color } as React.CSSProperties}>
                <i aria-hidden="true" />
                {group.label}
                <em>{group.family}</em>
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="lupi-education-methods" aria-labelledby="lupi-education-methods-title">
        <div>
          <h2 id="lupi-education-methods-title">{page.proofTitle}</h2>
          <p>{page.proofBody}</p>
        </div>
        <div className="lupi-education-method-list">
          {page.sections.map((section) => (
            <article key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lupi-education-proof" aria-label="Learning workflow">
        {page.proofItems.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="lupi-education-data" aria-labelledby="lupi-education-data-title">
        <h2 id="lupi-education-data-title">{page.dataTitle}</h2>
        <p>{page.dataBody}</p>
      </section>
    </main>
  );
}

const EDUCATION_CSS = `
.lupi-education-page {
  width: 100%;
  min-height: 100vh;
  overflow-x: clip;
  background: #020204;
  color: #f8fafc;
}
.lupi-education-hero {
  box-sizing: border-box;
  width: min(1380px, 100%);
  margin: 0 auto;
  min-height: calc(100dvh - 120px);
  padding: 68px 28px 34px;
  display: grid;
  grid-template-columns: minmax(380px, 0.88fr) minmax(520px, 1.12fr);
  align-items: center;
  gap: 44px;
}
.lupi-education-copy {
  max-width: 660px;
}
.lupi-education-eyebrow {
  display: inline-flex;
  color: #7dd3fc;
  text-decoration: none;
  font-size: 14px;
  line-height: 1.3;
  font-weight: 780;
  letter-spacing: 0;
}
.lupi-education-copy h1 {
  margin: 18px 0 0;
  color: #f8fafc;
  font-size: 58px;
  line-height: 1;
  font-weight: 860;
  letter-spacing: 0;
  text-wrap: balance;
}
.lupi-education-copy p {
  max-width: 42rem;
  margin: 22px 0 0;
  color: rgba(226, 232, 240, 0.72);
  font-size: 18px;
  line-height: 1.64;
  letter-spacing: 0;
  text-wrap: pretty;
}
.lupi-education-actions {
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.lupi-education-primary,
.lupi-education-secondary {
  min-height: 44px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  padding: 0 18px;
  text-decoration: none;
  font-size: 14px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
}
.lupi-education-primary {
  color: #08111a;
  border: 1px solid rgba(94, 234, 212, 0.55);
  background: linear-gradient(135deg, #5eead4, #fbbf24);
}
.lupi-education-secondary {
  color: rgba(248, 250, 252, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
}
.lupi-education-primary:hover,
.lupi-education-secondary:hover {
  transform: translateY(-1px);
}
.lupi-education-visual {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-radius: 8px;
  aspect-ratio: 16 / 10;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: #06080d;
  box-shadow: 0 34px 90px rgba(0, 0, 0, 0.42);
}
.lupi-education-visual img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
.lupi-education-visual::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 48%, rgba(2, 2, 4, 0.72));
  pointer-events: none;
}
.lupi-education-visual-caption {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 14px;
  z-index: 1;
  padding: 12px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
}
.lupi-education-visual-caption span,
.lupi-education-visual-caption strong {
  display: block;
  letter-spacing: 0;
}
.lupi-education-visual-caption span {
  color: rgba(226, 232, 240, 0.6);
  font-size: 12px;
  line-height: 1.25;
}
.lupi-education-visual-caption strong {
  margin-top: 5px;
  color: #f8fafc;
  font-size: 18px;
  line-height: 1.2;
  font-weight: 780;
}
.lupi-education-stats,
.lupi-education-groups,
.lupi-education-methods,
.lupi-education-proof,
.lupi-education-data {
  box-sizing: border-box;
  width: min(1280px, 100%);
  margin: 0 auto;
  padding-left: 28px;
  padding-right: 28px;
}
.lupi-education-stats {
  padding-bottom: 48px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.lupi-education-stats div {
  min-width: 0;
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
}
.lupi-education-stats span,
.lupi-education-stats strong {
  display: block;
  letter-spacing: 0;
}
.lupi-education-stats span {
  color: rgba(226, 232, 240, 0.52);
  font-size: 12px;
  line-height: 1.3;
}
.lupi-education-stats strong {
  margin-top: 7px;
  color: #f8fafc;
  font-size: 18px;
  line-height: 1.15;
  font-weight: 780;
  overflow-wrap: anywhere;
}
.lupi-education-groups,
.lupi-education-methods {
  padding-top: 62px;
  padding-bottom: 68px;
  display: grid;
  grid-template-columns: minmax(320px, 0.78fr) minmax(520px, 1.22fr);
  gap: 44px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.lupi-education-groups h2,
.lupi-education-methods h2,
.lupi-education-data h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 34px;
  line-height: 1.12;
  font-weight: 820;
  letter-spacing: 0;
  text-wrap: balance;
}
.lupi-education-groups p,
.lupi-education-methods > div > p,
.lupi-education-data p {
  max-width: 42rem;
  margin: 16px 0 0;
  color: rgba(226, 232, 240, 0.68);
  font-size: 16px;
  line-height: 1.66;
  letter-spacing: 0;
  text-wrap: pretty;
}
.lupi-education-chipgrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  align-content: start;
}
.lupi-education-chipgrid span {
  min-width: 0;
  min-height: 58px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 8px;
  align-content: center;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--group-color) 38%, rgba(255, 255, 255, 0.12));
  background: color-mix(in srgb, var(--group-color) 10%, rgba(255, 255, 255, 0.04));
  padding: 9px 10px;
  color: #f8fafc;
  font-size: 13px;
  line-height: 1.2;
  font-weight: 760;
  letter-spacing: 0;
}
.lupi-education-chipgrid i {
  width: 7px;
  height: 7px;
  margin-top: 4px;
  border-radius: 999px;
  background: var(--group-color);
  grid-row: 1 / span 2;
}
.lupi-education-chipgrid em {
  margin-top: 4px;
  color: rgba(226, 232, 240, 0.56);
  font-size: 11px;
  line-height: 1.2;
  font-style: normal;
  font-weight: 620;
}
.lupi-education-method-list {
  display: grid;
  gap: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.lupi-education-method-list article {
  padding: 22px 0 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.lupi-education-method-list h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 21px;
  line-height: 1.25;
  font-weight: 780;
  letter-spacing: 0;
}
.lupi-education-method-list p {
  max-width: 44rem;
  margin: 10px 0 0;
  color: rgba(226, 232, 240, 0.66);
  font-size: 15px;
  line-height: 1.62;
  letter-spacing: 0;
}
.lupi-education-proof {
  padding-top: 0;
  padding-bottom: 62px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.lupi-education-proof article {
  min-width: 0;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  padding: 18px;
}
.lupi-education-proof span {
  display: block;
  color: #7dd3fc;
  font-size: 12px;
  line-height: 1.3;
  font-weight: 780;
  letter-spacing: 0;
}
.lupi-education-proof p {
  margin: 10px 0 0;
  color: rgba(226, 232, 240, 0.68);
  font-size: 15px;
  line-height: 1.58;
  letter-spacing: 0;
}
.lupi-education-data {
  padding-top: 56px;
  padding-bottom: 88px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
@media (max-width: 1080px) {
  .lupi-education-hero,
  .lupi-education-groups,
  .lupi-education-methods {
    grid-template-columns: 1fr;
  }
  .lupi-education-copy {
    max-width: 780px;
  }
  .lupi-education-copy h1 {
    font-size: 50px;
  }
  .lupi-education-visual {
    max-width: 860px;
  }
}
@media (max-width: 760px) {
  .lupi-education-hero {
    min-height: auto;
    padding: 50px 16px 24px;
    gap: 22px;
  }
  .lupi-education-copy h1 {
    font-size: 34px;
    line-height: 1.02;
  }
  .lupi-education-copy p {
    font-size: 15px;
    line-height: 1.5;
  }
  .lupi-education-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
  .lupi-education-primary,
  .lupi-education-secondary {
    min-height: 42px;
    padding: 0 12px;
    font-size: 13px;
  }
  .lupi-education-visual {
    aspect-ratio: 16 / 11;
  }
  .lupi-education-stats,
  .lupi-education-groups,
  .lupi-education-methods,
  .lupi-education-proof,
  .lupi-education-data {
    padding-left: 16px;
    padding-right: 16px;
  }
  .lupi-education-stats,
  .lupi-education-proof {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .lupi-education-chipgrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .lupi-education-groups h2,
  .lupi-education-methods h2,
  .lupi-education-data h2 {
    font-size: 29px;
  }
}
@media (max-width: 440px) {
  .lupi-education-stats,
  .lupi-education-proof,
  .lupi-education-chipgrid {
    grid-template-columns: 1fr;
  }
}
`;
