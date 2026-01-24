import { test, expect } from '../fixtures/test-fixture.js'

test.describe('HTML Template HMR', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('modifying .html file triggers HMR update without page reload', async ({
    page,
    fileModifier,
    hmrDetector,
    waitForHmr,
  }) => {
    // 1. Add sentinel to detect full reload
    const sentinelId = await hmrDetector.addSentinel()

    // 2. Verify initial content
    await expect(page.locator('h1')).toContainText('E2E_TITLE')

    // 3. Modify HTML template
    await fileModifier.modifyFile('app.html', (content) => {
      return content.replace('{{ title() }}', 'TEMPLATE CHANGED VIA HMR!')
    })

    // 4. Wait for HMR to propagate
    await waitForHmr()

    // 5. Verify DOM updated with new content
    await expect(page.locator('h1')).toContainText('TEMPLATE CHANGED VIA HMR!')

    // 6. Verify HMR occurred (not full reload) - sentinel should survive
    const sentinelExists = await hmrDetector.sentinelExists(sentinelId)
    expect(sentinelExists).toBe(true)
  })

  test('multiple template changes trigger multiple HMR updates without reload', async ({
    page,
    fileModifier,
    hmrDetector,
    waitForHmr,
  }) => {
    await hmrDetector.setupEventListeners()
    const sentinelId = await hmrDetector.addSentinel()

    // First change
    await fileModifier.modifyFile('app.html', (content) =>
      content.replace('{{ title() }}', 'CHANGE 1'),
    )
    await waitForHmr()
    await expect(page.locator('h1')).toContainText('CHANGE 1')

    // Second change
    await fileModifier.modifyFile('app.html', (content) => content.replace('CHANGE 1', 'CHANGE 2'))
    await waitForHmr()
    await expect(page.locator('h1')).toContainText('CHANGE 2')

    // Sentinel should still exist (no reload occurred)
    expect(await hmrDetector.sentinelExists(sentinelId)).toBe(true)
  })

  test('modifying text content via template HMR works correctly', async ({
    page,
    fileModifier,
    hmrDetector,
    waitForHmr,
  }) => {
    const sentinelId = await hmrDetector.addSentinel()

    // Modify the paragraph text content
    await fileModifier.modifyFile('app.html', (content) => {
      return content.replace('E2E test fixture for HMR testing.', 'HMR UPDATED TEXT CONTENT!')
    })

    await waitForHmr()

    // Verify paragraph text was updated
    await expect(page.locator('p.description')).toContainText('HMR UPDATED TEXT CONTENT!')

    // Verify no reload - sentinel should survive
    expect(await hmrDetector.sentinelExists(sentinelId)).toBe(true)
  })
})
