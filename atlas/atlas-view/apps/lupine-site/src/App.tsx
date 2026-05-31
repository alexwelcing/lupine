import React from 'react';

import './App.css';

type RibbonSource = {
  source_id: string;
  title: string;
  source_kind: string;
  priority: number;
  ingestion_status: string;
  verification: string;
  domains: string[];
  claim_ids: string[];
  claim_guardrails: string[];
  target_artifacts: string[];
  next_action: string;
};

type RibbonUnit = {
  unit_id: string;
  role: string;
  status: string;
  priority: number;
  source_ids: string[];
  claim_ids: string[];
  summary: string;
  depends_on: string[];
};

type RibbonPayload = {
  schema: string;
  registry_id: string;
  registry_path: string;
  summary: {
    sources_total: number;
    verified_sources: number;
    domains: Record<string, number>;
    claims: Record<string, number>;
  };
  queue: {
    counters: {
      sources: number;
      work_units: number;
      roles: Record<string, number>;
      statuses: Record<string, number>;
    };
    team_roles: Record<string, string>;
    priority_units: RibbonUnit[];
  };
  active_sources: RibbonSource[];
  claim_guardrail: string;
  acceptance_gates: Record<string, string[]>;
  commands: string[];
};

const ribbonPath = '/research/materials-research-source-ribbon-v1.json';

const fallbackPayload: RibbonPayload = {
  schema: 'lupine.research.source_ribbon_surface.v1',
  registry_id: 'materials-research-source-registry-v1',
  registry_path: 'data/research_sources/materials_research_sources_v1.json',
  summary: {
    sources_total: 0,
    verified_sources: 0,
    domains: {},
    claims: {},
  },
  queue: {
    counters: {
      sources: 0,
      work_units: 0,
      roles: {},
      statuses: {},
    },
    team_roles: {},
    priority_units: [],
  },
  active_sources: [],
  claim_guardrail: 'Source registry payload is loading.',
  acceptance_gates: {},
  commands: [],
};

function labelize(value: string) {
  return value.replace(/[_-]/g, ' ');
}

function shortId(value: string) {
  return value.replace(/^source-intake:/, '');
}

function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail: string }) {
  return (
    <div className="metric">
      <span className="metric__label">{label}</span>
      <strong>{value}</strong>
      <span className="metric__detail">{detail}</span>
    </div>
  );
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'ready' | 'queued' }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

export default function App() {
  const [payload, setPayload] = React.useState<RibbonPayload>(fallbackPayload);
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'fallback'>('loading');

  React.useEffect(() => {
    let mounted = true;
    fetch(ribbonPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<RibbonPayload>;
      })
      .then((nextPayload) => {
        if (mounted) {
          setPayload(nextPayload);
          setLoadState('ready');
        }
      })
      .catch(() => {
        if (mounted) {
          setPayload(fallbackPayload);
          setLoadState('fallback');
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activeSources = payload.active_sources.slice(0, 7);
  const priorityUnits = payload.queue.priority_units.slice(0, 8);
  const statePhaseGate = payload.acceptance_gates.state_phase_seed_v1 ?? [];
  const domainCount = Object.keys(payload.summary.domains).length;
  const roleEntries = Object.entries(payload.queue.team_roles);

  return (
    <main className="science-page">
      <section className="hero">
        <div className="hero__brand">
          <img src="/brand/lupine-science-icon.png" alt="" />
          <span>Lupine Science</span>
        </div>
        <div className="hero__layout">
          <div className="hero__copy">
            <p className="eyebrow">Research control plane</p>
            <h1>Verified materials sources, active agent queue.</h1>
            <p className="lede">
              The MLIP and molecular-dynamics work is now organized around a reusable source registry,
              claim guardrails, and an executable intake queue for state, pressure, temperature, and
              phase-change research.
            </p>
            <div className="hero__actions">
              <a href={ribbonPath}>Source ribbon JSON</a>
              <a href="/llms.txt">Agent guide</a>
            </div>
          </div>
          <div className="status-panel" aria-label="Research source status">
            <div className="status-panel__topline">
              <Pill tone={loadState === 'ready' ? 'ready' : 'queued'}>{loadState}</Pill>
              <span>{payload.registry_id}</span>
            </div>
            <div className="metric-grid">
              <Metric
                label="Verified sources"
                value={`${payload.summary.verified_sources}/${payload.summary.sources_total}`}
                detail={`${domainCount} research domains`}
              />
              <Metric
                label="Team queue"
                value={payload.queue.counters.work_units}
                detail={`${payload.queue.counters.sources} active sources`}
              />
              <Metric
                label="Ready now"
                value={payload.queue.counters.statuses.ready ?? 0}
                detail="inspection starts"
              />
              <Metric
                label="Queued"
                value={payload.queue.counters.statuses.queued ?? 0}
                detail="follow-on units"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="section-heading">
          <p className="eyebrow">Active source intake</p>
          <h2>Broad, verified, claim-bounded.</h2>
        </div>
        <div className="source-grid">
          {activeSources.map((source) => (
            <article className="source-card" key={source.source_id}>
              <div className="source-card__header">
                <Pill tone={source.verification === 'verified_live' ? 'ready' : 'neutral'}>
                  {labelize(source.verification)}
                </Pill>
                <span>P{source.priority}</span>
              </div>
              <h3>{source.title}</h3>
              <p>{source.next_action}</p>
              <div className="tag-row">
                {source.claim_ids.slice(0, 3).map((claim) => (
                  <Pill key={claim}>{labelize(claim)}</Pill>
                ))}
              </div>
              <small>{labelize(source.ingestion_status)}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="split">
        <div>
          <div className="section-heading">
            <p className="eyebrow">Team grind queue</p>
            <h2>Work units with owners and gates.</h2>
          </div>
          <div className="queue-list">
            {priorityUnits.map((unit) => (
              <article className="queue-row" key={unit.unit_id}>
                <div>
                  <Pill tone={unit.status === 'ready' ? 'ready' : 'queued'}>{unit.status}</Pill>
                  <strong>{shortId(unit.unit_id)}</strong>
                  <p>{unit.summary}</p>
                </div>
                <span>{labelize(unit.role)}</span>
              </article>
            ))}
          </div>
        </div>

        <aside className="guardrail-panel">
          <p className="eyebrow">Claim boundary</p>
          <h2>Do not collapse evidence roles.</h2>
          <p>{payload.claim_guardrail}</p>
          <div className="gate-list">
            {statePhaseGate.map((gate) => (
              <div className="gate" key={gate}>{gate}</div>
            ))}
          </div>
        </aside>
      </section>

      <section className="band band--light">
        <div className="section-heading">
          <p className="eyebrow">Reusable system layer</p>
          <h2>Same registry, many research lanes.</h2>
        </div>
        <div className="role-grid">
          {roleEntries.map(([role, description]) => (
            <article className="role-card" key={role}>
              <span>{payload.queue.counters.roles[role] ?? 0}</span>
              <h3>{labelize(role)}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="commands">
        <div>
          <p className="eyebrow">Verification spine</p>
          <h2>{payload.registry_path}</h2>
        </div>
        <div className="command-list">
          {payload.commands.map((command) => (
            <code key={command}>{command}</code>
          ))}
        </div>
      </section>
    </main>
  );
}
