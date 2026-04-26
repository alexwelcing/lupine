import { useEffect, useRef } from 'react'

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    document.body.classList.add('legacy-cursor-active')

    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let dotX = mouseX
    let dotY = mouseY
    let ringX = mouseX
    let ringY = mouseY
    let rafId: number

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    const onEnter = () => document.body.classList.add('cursor-active')
    const onLeave = () => document.body.classList.remove('cursor-active')

    const animate = () => {
      dotX += (mouseX - dotX) * 0.5
      dotY += (mouseY - dotY) * 0.5
      ringX += (mouseX - ringX) * 0.15
      ringY += (mouseY - ringY) * 0.15

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`
      }
      rafId = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMove)
    document.querySelectorAll('a, button, [role="button"]').forEach((el) => {
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)
    })

    rafId = requestAnimationFrame(animate)

    return () => {
      document.body.classList.remove('legacy-cursor-active')
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
      document.querySelectorAll('a, button, [role="button"]').forEach((el) => {
        el.removeEventListener('mouseenter', onEnter)
        el.removeEventListener('mouseleave', onLeave)
      })
    }
  }, [])

  return (
    <>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full mix-blend-screen"
        style={{
          width: 6,
          height: 6,
          background: '#4ecdc4',
          transition: 'width 0.2s, height 0.2s, background 0.2s',
        }}
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full mix-blend-screen"
        style={{
          width: 32,
          height: 32,
          border: '1px solid rgba(78, 205, 196, 0.4)',
          transition: 'width 0.2s, height 0.2s, border-color 0.2s, background 0.2s',
        }}
      />
    </>
  )
}
