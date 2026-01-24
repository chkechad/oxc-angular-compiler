/**
 * Preset definitions for the Angular compiler comparison tool.
 */

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface Preset {
  name: string
  description: string
  include: string[]
  exclude: string[]
  /** Root directory of the project (for full-file compilation) */
  projectRoot?: string
  /** Path to tsconfig.json (for full-file compilation with real project context) */
  tsconfigPath?: string
}

// Project paths relative to the compare tool directory
// __dirname = napi/angular-compiler/e2e/compare/src
// Need 6 levels up: src -> compare -> e2e -> angular-compiler -> napi -> oxc -> github
const BITWARDEN_PROJECT_ROOT = resolve(__dirname, '../../../../../../bitwarden-clients')
const MATERIAL_ANGULAR_PROJECT_ROOT = resolve(__dirname, '../../../../../../material-angular')
const CLICKUP_FRONTEND_PROJECT_ROOT = resolve(__dirname, '../../../../../../clickup_frontend')

export const PRESETS: Record<string, Preset> = {
  bitwarden: {
    name: 'bitwarden',
    description: 'Bitwarden clients - .component.ts suffix',
    include: ['**/*.component.ts'],
    exclude: ['**/node_modules/**', '**/*.spec.ts', '**/*.test.ts'],
    // Project context for full-file compilation mode
    projectRoot: BITWARDEN_PROJECT_ROOT,
    tsconfigPath: resolve(BITWARDEN_PROJECT_ROOT, 'tsconfig.base.json'),
  },
  'material-angular': {
    name: 'material-angular',
    description: 'Angular Material/CDK - no .component.ts suffix',
    include: [
      'src/material/*/*.ts',
      'src/cdk/*/*.ts',
      'src/components-examples/**/*-example.ts',
      'src/dev-app/**/*.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/testing/**',
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*-module.ts',
      '**/public-api.ts',
      '**/index.ts',
      '**/BUILD.bazel',
      '**/*.harness.ts',
      '**/*.e2e.ts',
      '**/schematics/**',
    ],
    // Project context for full-file compilation mode
    projectRoot: MATERIAL_ANGULAR_PROJECT_ROOT,
    tsconfigPath: resolve(MATERIAL_ANGULAR_PROJECT_ROOT, 'tsconfig.json'),
  },
  // ClickUp Frontend - Full project (5,600+ components)
  clickup: {
    name: 'clickup',
    description: 'ClickUp Frontend - full project (5,600+ components)',
    include: ['**/*.component.ts'],
    exclude: [
      '**/node_modules/**',
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.mock.ts',
      '**/*.fixture.ts',
      '**/*.stories.ts',
      '**/*.po.ts',
      '**/*stub*.ts',
      '**/testing/**',
      '**/client-e2e/**',
    ],
    projectRoot: CLICKUP_FRONTEND_PROJECT_ROOT,
    tsconfigPath: resolve(CLICKUP_FRONTEND_PROJECT_ROOT, 'tsconfig.base.json'),
  },
  // ClickUp - Core libs only (~350 components, faster iteration)
  'clickup-core': {
    name: 'clickup-core',
    description: 'ClickUp Frontend - core library (~350 components)',
    include: ['libs/core/**/*.component.ts'],
    exclude: [
      '**/node_modules/**',
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.mock.ts',
      '**/*.fixture.ts',
      '**/*.stories.ts',
    ],
    projectRoot: CLICKUP_FRONTEND_PROJECT_ROOT,
    tsconfigPath: resolve(CLICKUP_FRONTEND_PROJECT_ROOT, 'tsconfig.base.json'),
  },
  // ClickUp - Client app only (~7 components, quickest)
  'clickup-client': {
    name: 'clickup-client',
    description: 'ClickUp Frontend - client app only (~7 components)',
    include: ['apps/client/**/*.component.ts'],
    exclude: ['**/node_modules/**', '**/*.spec.ts', '**/*.test.ts', '**/*.mock.ts'],
    projectRoot: CLICKUP_FRONTEND_PROJECT_ROOT,
    tsconfigPath: resolve(CLICKUP_FRONTEND_PROJECT_ROOT, 'apps/client/tsconfig.app.json'),
  },
}

export function getPreset(name: string): Preset | undefined {
  return PRESETS[name]
}

export function getPresetNames(): string[] {
  return Object.keys(PRESETS)
}

export function formatPresetList(): string {
  const lines: string[] = ['Available presets:']
  for (const [name, preset] of Object.entries(PRESETS)) {
    lines.push(`  ${name}`)
    lines.push(`    ${preset.description}`)
    lines.push(`    Include: ${preset.include.length} pattern(s)`)
    lines.push(`    Exclude: ${preset.exclude.length} pattern(s)`)
    lines.push('')
  }
  return lines.join('\n')
}

export function mergePresetWithCli(
  preset: Preset,
  cliInclude?: string[],
  cliExclude?: string[],
): { include: string[]; exclude: string[] } {
  return {
    include: [...preset.include, ...(cliInclude || [])],
    exclude: [...preset.exclude, ...(cliExclude || [])],
  }
}
