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
