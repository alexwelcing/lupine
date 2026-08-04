const PROOF_POINTS = [
  {
    label: 'Million-atom scale',
    title: 'Start with a real stress test, not a demo toy.',
    body:
      'The first scene invites visitors into a 953,312-atom FCC copper lattice and keeps the interaction centered on camera control, inspection, and scene responsiveness.',
  },
  {
    label: 'Organic chemistry study',
    title: 'Functional groups become spatial, not just memorized.',
    body:
      'Learners can move from carbonyls, nitriles, phenols, epoxides, sulfur groups, and acyl derivatives into the same 3D viewer used for larger scientific structures.',
  },
  {
    label: 'Materials datasets',
    title: 'Source labels stay visible as the catalog grows.',
    body:
      'Gallery, OMol25, NIST, and uploaded structures are presented as data-backed scenes, with the viewer avoiding unsupported bonds or properties when a source does not provide them.',
  },
];

export function LandingProofSection() {
  return (
    <section className="lupi-proof" aria-labelledby="lupi-proof-title">
      <style>{PROOF_CSS}</style>
      <div className="lupi-proof-shell">
        <div className="lupi-proof-intro">
          <p className="lupi-proof-kicker">Scale, study, and data truth</p>
          <h2 id="lupi-proof-title">A molecular viewer built for the way science is actually taught and checked.</h2>
          <p>
            Lupi connects first-principles materials intuition, college organic chemistry examples, and high-volume molecular data into one browser surface. The emphasis is simple: show the atoms, name the source, and make the scene useful enough to inspect.
          </p>
        </div>

        <div className="lupi-proof-grid" aria-label="Lupi first impression proof points">
          {PROOF_POINTS.map((point) => (
            <article key={point.label} className="lupi-proof-item">
              <span>{point.label}</span>
              <h3>{point.title}</h3>
              <p>{point.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const PROOF_CSS = `
.lupi-proof {
  width: 100%;
  background: #020204;
  color: #f8fafc;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.lupi-proof-shell {
  width: min(1280px, 100%);
  box-sizing: border-box;
  margin: 0 auto;
  padding: 72px 28px 78px;
  display: grid;
  grid-template-columns: minmax(320px, 0.82fr) minmax(520px, 1.18fr);
  gap: 46px;
  align-items: start;
}
.lupi-proof-intro {
  max-width: 560px;
}
.lupi-proof-kicker,
.lupi-proof-item span {
  margin: 0;
  color: #7dd3fc;
  font-size: 13px;
  font-weight: 780;
  line-height: 1.35;
  letter-spacing: 0;
}
.lupi-proof-intro h2 {
  margin: 14px 0 0;
  color: #f8fafc;
  font-size: 40px;
  line-height: 1.08;
  font-weight: 820;
  letter-spacing: 0;
  text-wrap: balance;
}
.lupi-proof-intro p:not(.lupi-proof-kicker) {
  max-width: 42rem;
  margin: 18px 0 0;
  color: rgba(226, 232, 240, 0.7);
  font-size: 17px;
  line-height: 1.65;
  letter-spacing: 0;
  text-wrap: pretty;
}
.lupi-proof-grid {
  display: grid;
  gap: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.lupi-proof-item {
  min-width: 0;
  padding: 24px 0 26px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.lupi-proof-item h3 {
  max-width: 42rem;
  margin: 10px 0 0;
  color: #f8fafc;
  font-size: 22px;
  line-height: 1.22;
  font-weight: 780;
  letter-spacing: 0;
  text-wrap: balance;
}
.lupi-proof-item p {
  max-width: 44rem;
  margin: 10px 0 0;
  color: rgba(226, 232, 240, 0.66);
  font-size: 15px;
  line-height: 1.62;
  letter-spacing: 0;
}
@media (max-width: 980px) {
  .lupi-proof-shell {
    grid-template-columns: 1fr;
    gap: 34px;
  }
  .lupi-proof-intro {
    max-width: 720px;
  }
  .lupi-proof-intro h2 {
    font-size: 36px;
  }
}
@media (max-width: 640px) {
  .lupi-proof-shell {
    padding: 58px 16px 64px;
  }
  .lupi-proof-intro h2 {
    font-size: 31px;
  }
  .lupi-proof-intro p:not(.lupi-proof-kicker) {
    font-size: 16px;
  }
  .lupi-proof-item {
    padding: 22px 0 24px;
  }
  .lupi-proof-item h3 {
    font-size: 20px;
  }
}
`;
