import { createServerFn } from '@tanstack/react-start'

const FEED_URL = 'https://glim-think-v1.aw-ab5.workers.dev/feed'

export const getLiveFeed = createServerFn({ method: 'GET' })
  .handler(async () => {
    const res = await fetch(FEED_URL)
    if (!res.ok) throw new Error('Feed error')
    return res.json()
  })
