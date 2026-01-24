/**
 * Fixture discovery and registration module.
 *
 * Discovers all .fixture.ts files in the fixtures directory
 * and provides utilities for filtering and listing fixtures.
 */

import { dirname, relative } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

import fg from 'fast-glob'

import type { Fixture } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Discover all fixtures, optionally filtered by category.
 *
 * @param categories - Optional array of category names to filter by
 * @returns Array of Fixture objects sorted by category/name
 */
export async function discoverFixtures(categories?: string[]): Promise<Fixture[]> {
  // Build glob pattern based on category filter
  // Note: Brace expansion needs either multiple values or a comma
  // {a,b} works but {a} doesn't - use @(a) or simple path for single category
  let pattern: string
  if (categories && categories.length > 0) {
    if (categories.length === 1) {
      // Single category - use simple path without braces
      pattern = `${categories[0]}/*.fixture.ts`
    } else {
      // Multiple categories - use brace expansion
      pattern = `{${categories.join(',')}}/*.fixture.ts`
    }
  } else {
    pattern = '**/*.fixture.ts'
  }

  const files = await fg(pattern, {
    cwd: __dirname,
    absolute: true,
    ignore: ['**/node_modules/**', '**/*.d.ts'],
  })

  const fixtures: Fixture[] = []

  for (const file of files) {
    try {
      // Use pathToFileURL for cross-platform compatibility (fixes Windows paths)
      const fileUrl = pathToFileURL(file).href
      const module = await import(fileUrl)

      if (module.fixture && isValidFixture(module.fixture)) {
        // Set default filePath if not provided
        if (!module.fixture.filePath) {
          const relPath = relative(__dirname, file)
          module.fixture.filePath = `/fixtures/${relPath.replace('.fixture.ts', '.component.ts')}`
        }
        fixtures.push(module.fixture)
      } else if (module.fixtures && Array.isArray(module.fixtures)) {
        // Support multiple fixtures per file
        for (const fixture of module.fixtures) {
          if (isValidFixture(fixture)) {
            if (!fixture.filePath) {
              const relPath = relative(__dirname, file)
              fixture.filePath = `/fixtures/${relPath.replace('.fixture.ts', '.component.ts')}`
            }
            fixtures.push(fixture)
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Failed to load fixture from ${file}:`, error)
    }
  }

  // Sort by category, then by name
  return fixtures.sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category)
    if (categoryCompare !== 0) return categoryCompare
    return a.name.localeCompare(b.name)
  })
}

/**
 * Get all available categories.
 *
 * @returns Array of unique category names
 */
export async function getCategories(): Promise<string[]> {
  const dirs = await fg('*/', {
    cwd: __dirname,
    onlyDirectories: true,
  })

  return dirs
    .map((d) => d.replace(/\/$/, ''))
    .filter((d) => !d.startsWith('.'))
    .sort()
}

/**
 * List all fixtures with their metadata (for --list-fixtures).
 *
 * @param categories - Optional category filter
 * @returns Formatted string listing all fixtures
 */
export async function listFixtures(categories?: string[]): Promise<string> {
  const fixtures = await discoverFixtures(categories)
  const allCategories = await getCategories()

  const lines: string[] = []
  lines.push('Available Fixtures:')
  lines.push('='.repeat(60))

  // Group by category
  const byCategory = new Map<string, Fixture[]>()
  for (const fixture of fixtures) {
    const existing = byCategory.get(fixture.category) || []
    existing.push(fixture)
    byCategory.set(fixture.category, existing)
  }

  for (const category of allCategories) {
    const categoryFixtures = byCategory.get(category)
    if (!categoryFixtures) continue

    lines.push('')
    lines.push(`[${category}] (${categoryFixtures.length} fixtures)`)
    lines.push('-'.repeat(40))

    for (const fixture of categoryFixtures) {
      const status = fixture.skip ? ' [SKIP]' : ''
      lines.push(`  ${fixture.name}${status}`)
      lines.push(`    ${fixture.description}`)
    }
  }

  lines.push('')
  lines.push(`Total: ${fixtures.length} fixtures in ${byCategory.size} categories`)

  return lines.join('\n')
}

/**
 * Validate that an object is a valid Fixture.
 */
function isValidFixture(obj: unknown): obj is Fixture {
  if (typeof obj !== 'object' || obj === null) return false

  const fixture = obj as Record<string, unknown>

  // Common required fields
  if (
    typeof fixture.name !== 'string' ||
    typeof fixture.category !== 'string' ||
    typeof fixture.description !== 'string' ||
    typeof fixture.className !== 'string'
  ) {
    return false
  }

  // Type-specific validation
  const fixtureType = fixture.type as string | undefined

  switch (fixtureType) {
    case 'pipe':
    case 'directive':
    case 'injectable':
    case 'ng-module':
    case 'full-transform':
      // These require sourceCode instead of template
      return typeof fixture.sourceCode === 'string'
    case 'class-metadata':
      // Class metadata fixtures require sourceCode and decoratorType
      return typeof fixture.sourceCode === 'string' && typeof fixture.decoratorType === 'string'
    case 'injector':
      // Injector fixtures use injectorName
      return typeof fixture.injectorName === 'string' || typeof fixture.className === 'string'
    case 'factory':
      // Factory fixtures use factoryName
      return typeof fixture.factoryName === 'string' || typeof fixture.className === 'string'
    case 'component':
    default:
      // Component fixtures require template
      return typeof fixture.template === 'string'
  }
}

// Re-export types
export type { Fixture, FixtureResult, FixtureReport } from './types.js'
