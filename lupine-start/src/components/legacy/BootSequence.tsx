import { useEffect, useRef, useState } from 'react'

const LOGS = [
  'INIT: Kernel Boot sequence engaged.',
  'WASM: Loading compiled Rust binary (4.2MB)... [OK]',
  'OXT: Establishing secure handshake with prediction cluster... [OK]',
  'WEBGPU: Requesting device adapter...',
  'WEBGPU: Adapter found -> High Performance Profile.',
  'MD: Initializing 12x12x12 MgLi supercell... (1,728 atoms)',
  'SYS: Generating projection matrices...',
  'SYS: Handing control to main UI thread.',
  'BOOT COMPLETE',
]

export function BootSequence() {
  const [visible, setVisible] = useState(false)
  const [lines, setLines] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('lupine_booted')) {
      return
    }
    sessionStorage.setItem('lupine_booted', '1')
    setVisible(true)

    let i = 0
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if (i >= LOGS.length) {
          clearInterval(interval)
          setTimeout(() => {
            setVisible(false)
            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.style.display = 'none'
              }
            }, 600)
          }, 400)
          return
        }
        setLines((prev) => [...prev, `[${(performance.now() / 1000).toFixed(3)}] ${LOGS[i]}`])
        i++
      }, Math.random() * 60 + 20)
      return () => clearInterval(interval)
    }, 150)

    return () => clearTimeout(timer)
  }, [])

  if (!visible && lines.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[10000] flex flex-col justify-end p-[60px] font-mono text-[13px] text-[#4ecdc4] pointer-events-none"
      style={{
        background: 'var(--slate-950, #0a0b12)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
      }}
    >
      {lines.map((line, idx) => (
        <div key={idx} className="mt-1.5" style={{ textShadow: '0 0 8px rgba(78,205,196,0.4)' }}>
          {line}
        </div>
      ))}
    </div>
  )
}
