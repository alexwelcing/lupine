import katex from 'katex'
import { useMemo } from 'react'

function renderMath(math: string, displayMode: boolean) {
  return katex.renderToString(math, {
    displayMode,
    throwOnError: false,
    strict: 'ignore',
    trust: false,
  })
}

export function InlineMath({ math }: { math: string }) {
  const html = useMemo(() => renderMath(math, false), [math])
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

export function BlockMath({ math }: { math: string }) {
  const html = useMemo(() => renderMath(math, true), [math])
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
