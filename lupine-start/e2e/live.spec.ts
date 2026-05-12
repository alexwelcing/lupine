import { test, expect } from '@playwright/test'

// Traces: docs/handoff/05_secure_live_ticker_architecture.md.
// The Research Feed consumer must render and continue polling the glim-think
// worker. /live drives a TanStack Query swarm feed with refetchInterval: 5_000
// so we expect at least one polled refetch within a 15s window.

const WORKER_URL_PATTERN = /glim-think.*workers\.dev\/feed\//

test('live page renders and polls the worker feed', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  const feedHits = new Set<string>()
  let totalFeedHits = 0
  page.on('request', (req) => {
    const url = req.url()
    if (WORKER_URL_PATTERN.test(url)) {
      feedHits.add(url)
      totalFeedHits += 1
    }
  })

  await page.goto('/live')

  await expect(page.getByRole('heading', { level: 1, name: 'The lab at work' })).toBeVisible()

  // refetchInterval on the swarm feed is 5s — 15s should yield ≥2 hits to it.
  await page.waitForTimeout(15_000)

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([])
  expect(feedHits.size, `distinct worker feed URLs hit: ${[...feedHits].join(', ')}`).toBeGreaterThanOrEqual(1)
  expect(totalFeedHits, `total worker feed hits in 15s: ${totalFeedHits}`).toBeGreaterThanOrEqual(2)
})
