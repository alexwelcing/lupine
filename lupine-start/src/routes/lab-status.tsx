import type { ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageShell } from '../components/ui/PageShell'
import status from '../data/lab-status.json'

export const Route = createFileRoute('/lab-status')({
  component: LabStatusPage,
  head: () => ({
    meta: [
      { title: 'Lab Status — latest work dispatch' },
      {
        name: 'description',
        content:
          'A maintained dispatch of the latest engineering work behind Lupine: what shipped, what is in progress, and known issues — reported honestly, including regressions.',
      },
    ],
  }),
})

const SEVERITY_STYLE: Record<string, { dot: string; label: string }> = {
  high: { dot: '#c47a50', label: 'HIGH' },
  medium: { dot: '#b89a5a', label: 'MEDIUM' },
  low: { dot: '#5a9e97', label: 'LOW' },
}

interface ShippedItem {
  title: string
  ref?: string
  detail: string
}

function Section({
  kicker,
  children,
}: {
  kicker: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="status-pulse" />
        <span className="mono-label text-[var(--primary)] tracking-[0.3em]">
          {kicker}
        </span>
      </div>
      {children}
    </section>
  )
}

function Card({
  title,
  badge,
  detail,
  badgeColor,
}: {
  title: string
  badge?: string
  detail: string
  badgeColor?: string
}) {
  return (
    <div className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-5">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h3 className="font-display text-lg text-[var(--on-surface)]">{title}</h3>
        {badge && (
          <span
            className="mono-label whitespace-nowrap text-xs tracking-[0.2em]"
            style={{ color: badgeColor ?? 'var(--primary)' }}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="text-[var(--on-surface-variant)] leading-relaxed">{detail}</p>
    </div>
  )
}

function LabStatusPage() {
  const shipped = status.shipped as ShippedItem[]
  const inProgress = status.inProgress as ShippedItem[]
  const knownIssues = status.knownIssues as Array<{
    severity: string
    title: string
    detail: string
  }>

  return (
    <PageShell
      kicker={`LAB STATUS · UPDATED ${status.updated}`}
      title={status.headline}
      subtitle={status.summary}
      maxWidth="5xl"
    >
      <div className="space-y-12">
        <Section kicker={`SHIPPED · ${status.cycle}`}>
          <div className="grid gap-4">
            {shipped.map((item) => (
              <Card
                key={item.title}
                title={item.title}
                badge={item.ref}
                detail={item.detail}
              />
            ))}
          </div>
        </Section>

        <Section kicker="IN PROGRESS">
          <div className="grid gap-4">
            {inProgress.map((item) => (
              <Card key={item.title} title={item.title} detail={item.detail} />
            ))}
          </div>
        </Section>

        <Section kicker="KNOWN ISSUES · REPORTED HONESTLY">
          <div className="grid gap-4">
            {knownIssues.map((item) => {
              const s = SEVERITY_STYLE[item.severity] ?? SEVERITY_STYLE.low
              return (
                <Card
                  key={item.title}
                  title={item.title}
                  badge={s.label}
                  badgeColor={s.dot}
                  detail={item.detail}
                />
              )
            })}
          </div>
        </Section>

        <p className="pt-4 text-sm text-[var(--on-surface-variant)]">
          This page is data-driven — edit{' '}
          <code className="text-[var(--primary)]">src/data/lab-status.json</code>{' '}
          and redeploy to reflect the latest work.
        </p>
      </div>
    </PageShell>
  )
}
