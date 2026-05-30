import { createServerFn } from '@tanstack/react-start'

const WORKER_BASE = import.meta.env.VITE_GLIM_THINK_URL ?? 'https://glim-think-v1.aw-ab5.workers.dev'
const FEED_URL = `${WORKER_BASE}/feed`
const OPS_URL = `${WORKER_BASE}/ops/deployments`

export const getLiveFeed = createServerFn({ method: 'GET' })
  .handler(async () => {
    const res = await fetch(FEED_URL)
    if (!res.ok) throw new Error('Feed error')
    return res.json()
  })

export const getDeployments = createServerFn({ method: 'GET' })
  .handler(async () => {
    const res = await fetch(OPS_URL + '?limit=20')
    if (!res.ok) throw new Error('Deployments fetch error')
    return res.json()
  })

/* ─── High-Performance Server-Side Lattice Generator (GCP Cloud Run Accelerated) ─── */
const LATTICE_BASIS: Record<string, Array<[number, number, number]>> = {
  sc: [[0, 0, 0]],
  bcc: [[0, 0, 0], [0.5, 0.5, 0.5]],
  fcc: [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]],
}

const DEFAULT_SPACING: Record<string, number> = {
  Cu: 3.61,
  Fe: 2.87,
  Ni: 3.52,
  Al: 4.05,
  Si: 5.43,
  C: 3.57,
  W: 3.16,
  Co: 2.51,
}

function defaultSpacingForElements(elements: string[]): number {
  if (elements.length === 1) {
    return DEFAULT_SPACING[elements[0]] ?? 3.5
  }
  let sum = 0
  elements.forEach((el) => {
    sum += DEFAULT_SPACING[el] ?? 3.5
  })
  return sum / elements.length
}

// In-memory cache for ultra-fast serving of pre-computed massive structures on GCP
const latticeCache = new Map<string, string>()

export const generateProceduralLattice = createServerFn({ method: 'POST' })
  .handler(async (ctx: any) => {
    const input = ctx?.data || ctx
    const atomCount = Number(input?.atomCount) || 100000
    const lattice = String(input?.lattice || 'fcc')
    const elements = Array.isArray(input?.elements) ? input.elements : ['Cu']
    const inputSpacing = input?.spacing ? Number(input.spacing) : undefined
    
    const cacheKey = `${atomCount}-${lattice}-${elements.join(',')}-${inputSpacing ?? 'default'}`
    if (latticeCache.has(cacheKey)) {
      return { xyz: latticeCache.get(cacheKey)!, cached: true }
    }

    const basis = LATTICE_BASIS[lattice.toLowerCase()] ?? LATTICE_BASIS.fcc
    const spacing = inputSpacing ?? defaultSpacingForElements(elements)
    const cellsPerAxis = Math.ceil(Math.cbrt(atomCount / basis.length))
    const span = cellsPerAxis * spacing
    const center = span / 2

    const lines = []
    lines.push(String(atomCount))
    lines.push(`Generated ${atomCount} ${elements.join('/')} ${lattice.toUpperCase()} lattice (GCP Server Pre-computed)`)

    let index = 0
    for (let z = 0; z < cellsPerAxis && index < atomCount; z += 1) {
      for (let y = 0; y < cellsPerAxis && index < atomCount; y += 1) {
        for (let x = 0; x < cellsPerAxis && index < atomCount; x += 1) {
          for (let basisIndex = 0; basisIndex < basis.length && index < atomCount; basisIndex += 1) {
            const basisPoint = basis[basisIndex]
            const elementIndex = Math.abs((x * 73856093) ^ (y * 19349663) ^ (z * 83492791) ^ basisIndex) % elements.length
            const element = elements[elementIndex]
            const wave = 0.08 * Math.sin((x + y * 1.7 + z * 0.6 + basisIndex) * 0.18)
            const px = (x + basisPoint[0]) * spacing - center
            const py = (y + basisPoint[1]) * spacing - center + wave
            const pz = (z + basisPoint[2]) * spacing - center
            
            lines.push(`${element} ${px.toFixed(4)} ${py.toFixed(4)} ${pz.toFixed(4)}`)
            index += 1
          }
        }
      }
    }

    const xyz = lines.join('\n')
    
    // Evict old cache entry if map is too large (keep max 10 entries to protect memory)
    if (latticeCache.size >= 10) {
      const firstKey = latticeCache.keys().next().value
      if (firstKey !== undefined) {
        latticeCache.delete(firstKey)
      }
    }
    latticeCache.set(cacheKey, xyz)

    return { xyz, cached: false }
  })

