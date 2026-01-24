import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { test as base, expect, type Page } from '@playwright/test'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const FIXTURE_APP = join(__dirname, '../app/src/app')

/**
 * File modification utility for e2e tests.
 * Backs up files before modification and restores them after tests.
 */
export class FileModifier {
  private originalContents: Map<string, string> = new Map()

  /**
   * Modify a file in the fixture app directory.
   * Automatically backs up the original content for restoration.
   */
  async modifyFile(filename: string, modifier: (content: string) => string): Promise<void> {
    const filepath = join(FIXTURE_APP, filename)
    const content = await readFile(filepath, 'utf-8')

    if (!this.originalContents.has(filename)) {
      this.originalContents.set(filename, content)
    }

    const modified = modifier(content)
    await writeFile(filepath, modified)
  }

  /**
   * Restore a specific file to its original content.
   */
  async restoreFile(filename: string): Promise<void> {
    const original = this.originalContents.get(filename)
    if (original) {
      const filepath = join(FIXTURE_APP, filename)
      await writeFile(filepath, original)
      this.originalContents.delete(filename)
    }
  }

  /**
   * Restore all modified files to their original content.
   */
  async restoreAll(): Promise<void> {
    for (const [filename] of this.originalContents) {
      await this.restoreFile(filename)
    }
  }
}

/**
 * HMR detection utility.
 * Uses DOM sentinel approach to reliably detect HMR vs full page reload.
 */
export class HmrDetector {
  constructor(private page: Page) {}

  /**
   * Add a DOM sentinel element that will survive HMR but be destroyed on full reload.
   * @returns The sentinel ID for later checking
   */
  async addSentinel(): Promise<string> {
    const sentinelId = `hmr-sentinel-${Date.now()}`
    await this.page.evaluate((id) => {
      const el = document.createElement('div')
      el.id = id
      el.style.display = 'none'
      document.body.appendChild(el)
    }, sentinelId)
    return sentinelId
  }

  /**
   * Check if a sentinel element still exists in the DOM.
   * - Exists: HMR occurred (DOM was mutated, not replaced)
   * - Gone: Full page reload (entire DOM was replaced)
   */
  async sentinelExists(sentinelId: string): Promise<boolean> {
    return (await this.page.locator(`#${sentinelId}`).count()) > 0
  }

  /**
   * Set up listeners to capture HMR events from the page.
   * Call this before making file changes.
   * Note: We use addScriptTag to inject the listener code because
   * page.evaluate() cannot serialize import.meta.hot references.
   */
  async setupEventListeners(): Promise<void> {
    await this.page.addScriptTag({
      content: `
        window.__hmrEvents = [];
        if (import.meta.hot) {
          import.meta.hot.on("angular:component-update", (data) => {
            window.__hmrEvents.push({
              type: "angular:component-update",
              data,
              timestamp: Date.now(),
            });
          });
          import.meta.hot.on("vite:beforeFullReload", () => {
            window.__hmrEvents.push({
              type: "vite:beforeFullReload",
              timestamp: Date.now(),
            });
          });
        }
      `,
      type: 'module',
    })
  }

  /**
   * Get all captured HMR events.
   */
  async getEvents(): Promise<Array<{ type: string; data?: any; timestamp: number }>> {
    return await this.page.evaluate(() => (window as any).__hmrEvents || [])
  }

  /**
   * Check if a specific event type was received.
   */
  async hasEvent(eventType: string): Promise<boolean> {
    const events = await this.getEvents()
    return events.some((e) => e.type === eventType)
  }
}

// Custom test fixtures
type HmrTestFixtures = {
  fileModifier: FileModifier
  hmrDetector: HmrDetector
  waitForHmr: () => Promise<void>
}

export const test = base.extend<HmrTestFixtures>({
  // File modification utility with automatic cleanup
  fileModifier: async ({ page: _ }, use) => {
    const modifier = new FileModifier()
    await use(modifier)
    // Always restore files after test
    await modifier.restoreAll()
  },

  // HMR detection utility
  hmrDetector: async ({ page }, use) => {
    const detector = new HmrDetector(page)
    await use(detector)
  },

  // Wait for HMR updates to stabilize
  waitForHmr: async ({ page }, use) => {
    const wait = async () => {
      // Give time for file watcher to detect change and HMR to propagate
      // Note: Don't use networkidle - it never completes when HMR is active
      await page.waitForTimeout(2000)
    }
    await use(wait)
  },
})

export { expect }
