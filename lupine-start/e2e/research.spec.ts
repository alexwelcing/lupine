import { test, expect } from '@playwright/test'

// Smoke-check for /research. Polling cadence differs from /live, so we only
// assert the page renders and emits no console errors.

test('research page renders without console errors', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto('/research')

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Cross-Potential Geometric Error Analysis for Interatomic Potentials',
    }),
  ).toBeVisible()

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([])
})
