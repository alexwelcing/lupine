import katex from 'katex'
import { useMemo } from 'react'

function renderMath(math: string, displayMode: boolean) {
  // JSX string literals like math="\\mathcal{M}" pass exactly "\\mathcal{M}" 
  // KaTeX sees "\\" as a line break. We need to unescape it to "\mathcal{M}"
  const unescapedMath = math.replace(/\\\\/g, '\\')
  
  return katex.renderToString(unescapedMath, {
    displayMode,
    throwOnError: false,
    strict: 'ignore',
    trust: false,
    output: 'html',  // only emit visible HTML, skip MathML to prevent double-rendering
  })
}

export function InlineMath({ math, className }: { math: string; className?: string }) {
  const html = useMemo(() => renderMath(math, false), [math])
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

export function BlockMath({ math, className }: { math: string; className?: string }) {
  const html = useMemo(() => renderMath(math, true), [math])
  return (
    <div
      className={`katex-block my-6 overflow-x-auto ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
