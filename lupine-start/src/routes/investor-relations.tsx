import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Section, SectionHeader } from '../components/ui/Section'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export const Route = createFileRoute('/investor-relations')({
  component: InvestorRelationsPage,
  head: () => ({
    meta: [
      { title: 'Investor Relations — Lupine Materials Science' },
      { name: 'description', content: 'Unified computational platform for next-century materials. Secure data rooms, capitalization details, and deep-tech diligence materials.' },
    ],
  }),
})

function ScrambleText({ text }: { text: string }) {
  const [display, setDisplay] = useState(text)
  
  useEffect(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*"
    let iteration = 0
    const interval = setInterval(() => {
      setDisplay(text.split("")
        .map((letter, index) => {
          if (index < iteration) {
            return text[index]
          }
          return chars[Math.floor(Math.random() * chars.length)]
        })
        .join(""))
      
      if (iteration >= text.length) {
        clearInterval(interval)
      }
      iteration += 1 / 3
    }, 30)

    return () => clearInterval(interval)
  }, [text])

  return <>{display}</>
}

function InvestorRelationsPage() {
  return (
    <main className="relative flex-1 bg-[var(--surface)] overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative pt-[160px] pb-[120px] px-6 lg:px-12 z-10">
        <div className="bg-noise absolute inset-0 z-0" />
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            <motion.div 
              className="lg:col-span-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="mono-label text-[var(--tertiary)] mb-6 tracking-[0.3em]">INVESTOR RELATIONS</div>
              <h1 className="text-5xl lg:text-7xl mb-8 leading-[1.1] text-[var(--on-surface)]">
                The materials <em className="italic text-[var(--primary)] glow-primary">infrastructure</em> thesis.
              </h1>
              <p className="text-[var(--on-surface-variant)] text-xl md:text-2xl mb-12 max-w-2xl leading-relaxed font-light">
                Unified computational platform for next-century materials. Access secure data rooms, capitalization details, and deep-tech diligence materials.
              </p>
              
              <div className="flex gap-6 items-center flex-wrap">
                <a
                  href="mailto:alexwelcing@gmail.com?subject=Lupine%20Diligence%20Request"
                  className="px-6 py-3 bg-[var(--primary)] text-[var(--on-primary)] font-display text-sm uppercase tracking-widest hover:opacity-90 transition-opacity no-underline"
                >
                  Request Diligence
                </a>
                <a
                  href="/research"
                  className="px-6 py-3 border border-[var(--primary)] text-[var(--primary)] font-display text-sm uppercase tracking-widest hover:bg-[var(--primary)] hover:text-[var(--on-primary)] transition-colors no-underline"
                >
                  View Research
                </a>
              </div>
            </motion.div>

            <motion.div 
              className="lg:col-span-4 hidden lg:block"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <div className="glass-panel-elevated p-8 relative overflow-hidden h-full min-h-[300px] flex flex-col justify-end">
                <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTIwIDIwYzAgMTEuMDQ2LTguOTU0IDIwLTIwIDIwdjJDMTEuMDQ2IDQyIDIwIDMzLjA0NiAyMCAyMnYtMnoiIGZpbGw9IiMwMGZiZmIiIGZpbGwtb3BhY2l0eT0iMC4xIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')]"></div>
                <div className="relative z-10">
                  <div className="mono-label text-[var(--secondary)] mb-4">SYSTEM_STATUS: NOMINAL</div>
                  <div className="space-y-4">
                    <div className="h-1 w-full bg-[var(--surface-variant)] overflow-hidden">
                      <motion.div 
                        className="h-full bg-[var(--secondary)]"
                        initial={{ width: 0 }}
                        animate={{ width: "74.2%" }}
                        transition={{ duration: 2, ease: "easeOut" }}
                      />
                    </div>
                    <div className="mono-label text-[var(--on-surface-variant)] flex justify-between">
                      <span>SIMULATION_LOAD</span>
                      <span>74.2%</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* The Thesis */}
      <Section bg="light">
        <div className="max-w-4xl mx-auto text-center py-12">
          <span className="mono-label text-[var(--primary)] opacity-60 mb-12 block">Strategic Vision</span>
          <blockquote className="text-4xl md:text-6xl font-serif leading-tight text-[var(--on-surface)] italic">
            "Civilization runs on materials. Lupine is the only <span className="text-[var(--primary)] glow-primary">unified computational platform</span> capable of accelerating discovery at the speed of software."
          </blockquote>
          <div className="mt-16 w-24 h-px bg-gradient-to-r from-transparent via-[var(--outline-variant)] to-transparent mx-auto"></div>
        </div>
      </Section>

      {/* Market Opportunity */}
      <Section>
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <span className="mono-label text-[var(--secondary)] mb-4 block">Market Opportunity</span>
            <h2 className="text-4xl">Scaling the physical <span className="text-[var(--secondary)] italic glow-secondary">frontier</span></h2>
          </div>
          <div className="text-right mono-label text-[var(--on-surface-variant)]">
            SOURCE: Q4 2023 MATERIAL ANALYTICS REPORT [CONFIDENTIAL]
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card elevated className="relative overflow-hidden group">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-[var(--primary)] opacity-10 blur-[40px] rounded-full group-hover:opacity-20 transition-all"></div>
            <div className="font-display text-4xl text-[var(--primary)] mb-2"><ScrambleText text="12B" /></div>
            <div className="mono-label text-[var(--on-surface-variant)] mb-6">TAM by 2028</div>
            <p className="text-sm text-[var(--on-surface-variant)] font-light">Rapid expansion across aerospace, battery tech, and semiconductor verticals.</p>
          </Card>
          
          <Card elevated className="relative overflow-hidden group">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-violet-500 opacity-10 blur-[40px] rounded-full group-hover:opacity-20 transition-all"></div>
            <div className="font-display text-4xl text-violet-400 mb-2"><ScrambleText text="300K+" /></div>
            <div className="mono-label text-[var(--on-surface-variant)] mb-6">LAMMPS researchers</div>
            <p className="text-sm text-[var(--on-surface-variant)] font-light">Massive existing user base awaiting modern computational orchestration.</p>
          </Card>

          <Card elevated className="relative overflow-hidden group">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-[var(--secondary)] opacity-10 blur-[40px] rounded-full group-hover:opacity-20 transition-all"></div>
            <div className="font-display text-4xl text-[var(--secondary)] mb-2"><ScrambleText text="0" /></div>
            <div className="mono-label text-[var(--on-surface-variant)] mb-6">unified competitors</div>
            <p className="text-sm text-[var(--on-surface-variant)] font-light">Fragmented legacy tools create a unique vacuum for Lupine's OS.</p>
          </Card>

          <Card elevated className="relative overflow-hidden group">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-[var(--primary)] opacity-10 blur-[40px] rounded-full group-hover:opacity-20 transition-all"></div>
            <div className="font-display text-4xl text-[var(--on-surface)] mb-2"><ScrambleText text="100x" /></div>
            <div className="mono-label text-[var(--on-surface-variant)] mb-6">ML speedup vs DFT</div>
            <p className="text-sm text-[var(--on-surface-variant)] font-light">Proprietary neural potentials bypass traditional quantum bottlenecks.</p>
          </Card>
        </div>
      </Section>

      {/* Data Room Access */}
      <Section bg="light">
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel-elevated p-12 md:p-20 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-[var(--primary)] opacity-5 blur-[80px] rounded-full"></div>
            <div className="relative z-10 text-center">
              <svg className="w-12 h-12 mx-auto text-[var(--primary)] mb-8 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0110 0v4"></path>
              </svg>
              <h2 className="text-4xl italic mb-6">Request access to confidential data room</h2>
              <p className="text-[var(--on-surface-variant)] mb-12 max-w-lg mx-auto leading-relaxed">
                Access detailed capitalization tables, IP filings, and 3rd party computational validation reports. Requires signed MNDA.
              </p>
              <div className="flex flex-col md:flex-row gap-4 max-w-md mx-auto">
                <a
                  href="mailto:alexwelcing@gmail.com?subject=Lupine%20Data%20Room%20Access%20Request"
                  className="flex-grow px-6 py-4 bg-[var(--primary)] text-[var(--on-primary)] font-display text-sm uppercase tracking-widest hover:opacity-90 transition-opacity text-center no-underline"
                >
                  Request Access
                </a>
              </div>
              
              <div className="mt-16 flex flex-wrap justify-center gap-8 items-center">
                <div className="flex items-center gap-2 mono-label text-[var(--on-surface-variant)] opacity-50">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> SOC2 TYPE II
                </div>
                <div className="flex items-center gap-2 mono-label text-[var(--on-surface-variant)] opacity-50">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> ITAR COMPLIANT
                </div>
                <div className="flex items-center gap-2 mono-label text-[var(--on-surface-variant)] opacity-50">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg> AES-256
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </main>
  )
}
