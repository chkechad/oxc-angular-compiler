#!/usr/bin/env tsx
/**
 * Bitwarden Web Vault Build Benchmark
 *
 * Compares build performance between:
 * - OXC Angular Compiler (via Vite)
 * - Angular's @ngtools/webpack (bitwarden's existing webpack build)
 *
 * Usage:
 *   pnpm benchmark                 # Run full benchmark (cold + incremental)
 *   pnpm benchmark --cold          # Only cold build comparison
 *   pnpm benchmark --incremental   # Only incremental build comparison
 *   pnpm benchmark --vite-only     # Only test Vite/OXC build
 *   pnpm benchmark --webpack-only  # Only test Webpack build
 *   pnpm benchmark --iterations=N  # Number of iterations (default: 3)
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, rmSync, statSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Paths
const BENCHMARK_DIR = __dirname
const BITWARDEN_ROOT = resolve(__dirname, '../../../../../bitwarden-clients')
const BITWARDEN_WEB = resolve(BITWARDEN_ROOT, 'apps/web')
const VITE_DIST = resolve(BENCHMARK_DIR, 'dist')
const WEBPACK_DIST = resolve(BITWARDEN_WEB, 'build')

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

interface BenchmarkResult {
  name: string
  buildTime: number
  outputSize: number
  fileCount: number
  success: boolean
  error?: string
}

interface BenchmarkSummary {
  vite: BenchmarkResult[]
  webpack: BenchmarkResult[]
  averages: {
    vite: { buildTime: number; outputSize: number }
    webpack: { buildTime: number; outputSize: number }
  }
  speedup: number
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  cold: boolean
  incremental: boolean
  viteOnly: boolean
  webpackOnly: boolean
  iterations: number
  verbose: boolean
} {
  const args = process.argv.slice(2)
  const hasFlag = (flag: string) => args.includes(flag)
  const getValue = (flag: string, defaultValue: number): number => {
    const idx = args.findIndex((a) => a.startsWith(`${flag}=`))
    if (idx >= 0) {
      return parseInt(args[idx].split('=')[1], 10) || defaultValue
    }
    return defaultValue
  }

  const cold = hasFlag('--cold')
  const incremental = hasFlag('--incremental')
  const viteOnly = hasFlag('--vite-only')
  const webpackOnly = hasFlag('--webpack-only')
  const verbose = hasFlag('--verbose') || hasFlag('-v')
  const iterations = getValue('--iterations', 3)

  // If neither cold nor incremental specified, run both
  const runBoth = !cold && !incremental

  return {
    cold: cold || runBoth,
    incremental: incremental || runBoth,
    viteOnly,
    webpackOnly,
    iterations,
    verbose,
  }
}

/**
 * Log with formatting
 */
function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

/**
 * Log a section header
 */
function logSection(title: string): void {
  console.log()
  log('='.repeat(60), 'cyan')
  log(`  ${title}`, 'cyan')
  log('='.repeat(60), 'cyan')
  console.log()
}

/**
 * Run a command and return execution time
 */
async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  verbose: boolean = false,
): Promise<{ duration: number; success: boolean; error?: string }> {
  return new Promise((resolvePromise) => {
    const startTime = performance.now()

    const proc: ChildProcess = spawn(command, args, {
      cwd,
      stdio: verbose ? 'inherit' : 'pipe',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        FORCE_COLOR: '1',
      },
    })

    let stderr = ''

    if (!verbose && proc.stderr) {
      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })
    }

    proc.on('close', (code) => {
      const endTime = performance.now()
      const duration = endTime - startTime

      if (code === 0) {
        resolvePromise({ duration, success: true })
      } else {
        resolvePromise({
          duration,
          success: false,
          error: stderr || `Process exited with code ${code}`,
        })
      }
    })

    proc.on('error', (err) => {
      const endTime = performance.now()
      resolvePromise({
        duration: endTime - startTime,
        success: false,
        error: err.message,
      })
    })
  })
}

/**
 * Calculate directory size recursively
 */
function getDirectorySize(dir: string): { size: number; fileCount: number } {
  if (!existsSync(dir)) {
    return { size: 0, fileCount: 0 }
  }

  let totalSize = 0
  let fileCount = 0

  const walkDir = (currentPath: string) => {
    try {
      const stats = statSync(currentPath)
      if (stats.isDirectory()) {
        const entries = require('fs').readdirSync(currentPath)
        for (const entry of entries) {
          walkDir(resolve(currentPath, entry))
        }
      } else {
        totalSize += stats.size
        fileCount++
      }
    } catch {
      // Ignore errors (e.g., permission issues)
    }
  }

  walkDir(dir)
  return { size: totalSize, fileCount }
}

/**
 * Clean build directories
 */
function cleanBuildDirs(): void {
  log('Cleaning build directories...', 'dim')

  if (existsSync(VITE_DIST)) {
    rmSync(VITE_DIST, { recursive: true, force: true })
  }

  if (existsSync(WEBPACK_DIST)) {
    rmSync(WEBPACK_DIST, { recursive: true, force: true })
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format duration to human readable
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = ((ms % 60000) / 1000).toFixed(1)
  return `${minutes}m ${seconds}s`
}

/**
 * Run Vite/OXC build
 */
async function runViteBuild(verbose: boolean): Promise<BenchmarkResult> {
  log('Running Vite/OXC build...', 'blue')

  const result = await runCommand('pnpm', ['run', 'build:vite'], BENCHMARK_DIR, verbose)

  const { size, fileCount } = getDirectorySize(VITE_DIST)

  return {
    name: 'Vite/OXC',
    buildTime: result.duration,
    outputSize: size,
    fileCount,
    success: result.success,
    error: result.error,
  }
}

/**
 * Run Webpack build (bitwarden's existing build)
 */
async function runWebpackBuild(verbose: boolean): Promise<BenchmarkResult> {
  log("Running Webpack build (bitwarden's build:oss)...", 'yellow')

  // Check if pnpm is available in bitwarden
  const result = await runCommand('pnpm', ['run', 'build:oss'], BITWARDEN_WEB, verbose)

  const { size, fileCount } = getDirectorySize(WEBPACK_DIST)

  return {
    name: 'Webpack/@ngtools',
    buildTime: result.duration,
    outputSize: size,
    fileCount,
    success: result.success,
    error: result.error,
  }
}

/**
 * Run cold build benchmark
 */
async function runColdBuildBenchmark(
  options: ReturnType<typeof parseArgs>,
): Promise<{ vite: BenchmarkResult[]; webpack: BenchmarkResult[] }> {
  logSection('Cold Build Benchmark')

  const viteResults: BenchmarkResult[] = []
  const webpackResults: BenchmarkResult[] = []

  for (let i = 1; i <= options.iterations; i++) {
    log(`\nIteration ${i}/${options.iterations}`, 'bright')

    // Clean before each iteration
    cleanBuildDirs()

    // Run Vite build
    if (!options.webpackOnly) {
      const viteResult = await runViteBuild(options.verbose)
      viteResults.push(viteResult)
      if (viteResult.success) {
        log(`  Vite: ${formatDuration(viteResult.buildTime)}`, 'green')
      } else {
        log(`  Vite: FAILED - ${viteResult.error?.substring(0, 100)}`, 'red')
      }
    }

    // Clean between builds
    cleanBuildDirs()

    // Run Webpack build
    if (!options.viteOnly) {
      const webpackResult = await runWebpackBuild(options.verbose)
      webpackResults.push(webpackResult)
      if (webpackResult.success) {
        log(`  Webpack: ${formatDuration(webpackResult.buildTime)}`, 'green')
      } else {
        log(`  Webpack: FAILED - ${webpackResult.error?.substring(0, 100)}`, 'red')
      }
    }
  }

  return { vite: viteResults, webpack: webpackResults }
}

/**
 * Simulate incremental build by modifying a file
 */
function modifyTestFile(): { filePath: string; originalContent: string } {
  // Find a component file to modify
  const testFile = resolve(BITWARDEN_WEB, 'src/app/app.component.ts')

  if (!existsSync(testFile)) {
    throw new Error(`Test file not found: ${testFile}`)
  }

  const originalContent = readFileSync(testFile, 'utf-8')

  // Add a comment to trigger rebuild
  const modifiedContent = originalContent + `\n// Benchmark timestamp: ${Date.now()}\n`
  writeFileSync(testFile, modifiedContent)

  return { filePath: testFile, originalContent }
}

/**
 * Restore modified file
 */
function restoreTestFile(filePath: string, originalContent: string): void {
  writeFileSync(filePath, originalContent)
}

/**
 * Run incremental build benchmark
 */
async function runIncrementalBuildBenchmark(
  options: ReturnType<typeof parseArgs>,
): Promise<{ vite: BenchmarkResult[]; webpack: BenchmarkResult[] }> {
  logSection('Incremental Build Benchmark')

  const viteResults: BenchmarkResult[] = []
  const webpackResults: BenchmarkResult[] = []

  // First, do initial builds
  log('Performing initial builds...', 'dim')
  cleanBuildDirs()

  if (!options.webpackOnly) {
    await runViteBuild(options.verbose)
  }

  if (!options.viteOnly) {
    await runWebpackBuild(options.verbose)
  }

  // Now run incremental builds
  for (let i = 1; i <= options.iterations; i++) {
    log(`\nIteration ${i}/${options.iterations}`, 'bright')

    // Modify a file
    const { filePath, originalContent } = modifyTestFile()

    try {
      // Run Vite incremental build
      if (!options.webpackOnly) {
        const viteResult = await runViteBuild(options.verbose)
        viteResults.push(viteResult)
        if (viteResult.success) {
          log(`  Vite (incremental): ${formatDuration(viteResult.buildTime)}`, 'green')
        } else {
          log(`  Vite: FAILED - ${viteResult.error?.substring(0, 100)}`, 'red')
        }
      }

      // Run Webpack incremental build
      if (!options.viteOnly) {
        const webpackResult = await runWebpackBuild(options.verbose)
        webpackResults.push(webpackResult)
        if (webpackResult.success) {
          log(`  Webpack (incremental): ${formatDuration(webpackResult.buildTime)}`, 'green')
        } else {
          log(`  Webpack: FAILED - ${webpackResult.error?.substring(0, 100)}`, 'red')
        }
      }
    } finally {
      // Always restore the file
      restoreTestFile(filePath, originalContent)
    }
  }

  return { vite: viteResults, webpack: webpackResults }
}

/**
 * Calculate averages and generate summary
 */
function generateSummary(
  viteResults: BenchmarkResult[],
  webpackResults: BenchmarkResult[],
): BenchmarkSummary {
  const successfulVite = viteResults.filter((r) => r.success)
  const successfulWebpack = webpackResults.filter((r) => r.success)

  const avgViteTime =
    successfulVite.length > 0
      ? successfulVite.reduce((sum, r) => sum + r.buildTime, 0) / successfulVite.length
      : 0

  const avgWebpackTime =
    successfulWebpack.length > 0
      ? successfulWebpack.reduce((sum, r) => sum + r.buildTime, 0) / successfulWebpack.length
      : 0

  const avgViteSize =
    successfulVite.length > 0
      ? successfulVite.reduce((sum, r) => sum + r.outputSize, 0) / successfulVite.length
      : 0

  const avgWebpackSize =
    successfulWebpack.length > 0
      ? successfulWebpack.reduce((sum, r) => sum + r.outputSize, 0) / successfulWebpack.length
      : 0

  const speedup = avgViteTime > 0 && avgWebpackTime > 0 ? avgWebpackTime / avgViteTime : 0

  return {
    vite: viteResults,
    webpack: webpackResults,
    averages: {
      vite: { buildTime: avgViteTime, outputSize: avgViteSize },
      webpack: { buildTime: avgWebpackTime, outputSize: avgWebpackSize },
    },
    speedup,
  }
}

/**
 * Print benchmark results
 */
function printResults(summary: BenchmarkSummary, title: string): void {
  logSection(`Results: ${title}`)

  console.log('Individual runs:')
  console.log('-'.repeat(60))

  const maxRuns = Math.max(summary.vite.length, summary.webpack.length)

  for (let i = 0; i < maxRuns; i++) {
    const viteRun = summary.vite[i]
    const webpackRun = summary.webpack[i]

    console.log(`Run ${i + 1}:`)
    if (viteRun) {
      const status = viteRun.success ? colors.green + 'OK' : colors.red + 'FAIL'
      console.log(
        `  Vite/OXC:     ${formatDuration(viteRun.buildTime).padEnd(12)} [${status}${colors.reset}]`,
      )
    }
    if (webpackRun) {
      const status = webpackRun.success ? colors.green + 'OK' : colors.red + 'FAIL'
      console.log(
        `  Webpack:      ${formatDuration(webpackRun.buildTime).padEnd(12)} [${status}${colors.reset}]`,
      )
    }
  }

  console.log()
  console.log('Averages:')
  console.log('-'.repeat(60))

  if (summary.averages.vite.buildTime > 0) {
    console.log(
      `  Vite/OXC:     ${formatDuration(summary.averages.vite.buildTime).padEnd(12)} | ${formatBytes(summary.averages.vite.outputSize)}`,
    )
  }

  if (summary.averages.webpack.buildTime > 0) {
    console.log(
      `  Webpack:      ${formatDuration(summary.averages.webpack.buildTime).padEnd(12)} | ${formatBytes(summary.averages.webpack.outputSize)}`,
    )
  }

  if (summary.speedup > 0) {
    console.log()
    if (summary.speedup > 1) {
      log(`  Speedup: ${summary.speedup.toFixed(2)}x faster with Vite/OXC`, 'green')
    } else if (summary.speedup < 1) {
      log(`  Speedup: ${(1 / summary.speedup).toFixed(2)}x faster with Webpack`, 'yellow')
    } else {
      log(`  Speedup: Similar performance`, 'dim')
    }
  }
}

/**
 * Check prerequisites
 */
async function checkPrerequisites(): Promise<boolean> {
  log('Checking prerequisites...', 'dim')

  // Check bitwarden-clients exists
  if (!existsSync(BITWARDEN_WEB)) {
    log(`ERROR: bitwarden-clients not found at ${BITWARDEN_ROOT}`, 'red')
    log(
      'Please clone bitwarden-clients to the expected location or update the path in benchmark.ts',
      'red',
    )
    return false
  }

  // Check if bitwarden has node_modules
  if (!existsSync(resolve(BITWARDEN_ROOT, 'node_modules'))) {
    log('WARNING: bitwarden-clients/node_modules not found. Running pnpm install...', 'yellow')
    const result = await runCommand('pnpm', ['install'], BITWARDEN_ROOT, true)
    if (!result.success) {
      log('ERROR: Failed to install bitwarden dependencies', 'red')
      return false
    }
  }

  // Check local dependencies
  if (!existsSync(resolve(BENCHMARK_DIR, 'node_modules'))) {
    log('Installing benchmark dependencies...', 'yellow')
    const result = await runCommand('pnpm', ['install'], BENCHMARK_DIR, true)
    if (!result.success) {
      log('ERROR: Failed to install benchmark dependencies', 'red')
      return false
    }
  }

  log('Prerequisites OK', 'green')
  return true
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log()
  log('Bitwarden Web Vault Build Benchmark', 'bright')
  log('OXC Angular Compiler vs @ngtools/webpack', 'dim')
  console.log()

  const options = parseArgs()

  // Check prerequisites
  const prereqOk = await checkPrerequisites()
  if (!prereqOk) {
    process.exit(1)
  }

  let coldResults: { vite: BenchmarkResult[]; webpack: BenchmarkResult[] } | null = null
  let incrementalResults: { vite: BenchmarkResult[]; webpack: BenchmarkResult[] } | null = null

  // Run cold build benchmark
  if (options.cold) {
    coldResults = await runColdBuildBenchmark(options)
    const coldSummary = generateSummary(coldResults.vite, coldResults.webpack)
    printResults(coldSummary, 'Cold Build')
  }

  // Run incremental build benchmark
  if (options.incremental) {
    incrementalResults = await runIncrementalBuildBenchmark(options)
    const incrementalSummary = generateSummary(incrementalResults.vite, incrementalResults.webpack)
    printResults(incrementalSummary, 'Incremental Build')
  }

  // Final summary
  logSection('Benchmark Complete')

  if (coldResults && incrementalResults) {
    const allVite = [...coldResults.vite, ...incrementalResults.vite]
    const allWebpack = [...coldResults.webpack, ...incrementalResults.webpack]
    const overallSummary = generateSummary(allVite, allWebpack)

    console.log('Overall Summary:')
    console.log('-'.repeat(60))
    console.log(
      `  Total Vite builds:    ${allVite.length} (${allVite.filter((r) => r.success).length} successful)`,
    )
    console.log(
      `  Total Webpack builds: ${allWebpack.length} (${allWebpack.filter((r) => r.success).length} successful)`,
    )

    if (overallSummary.speedup > 0) {
      console.log()
      if (overallSummary.speedup > 1) {
        log(`  Overall: Vite/OXC is ${overallSummary.speedup.toFixed(2)}x faster`, 'green')
      } else {
        log(`  Overall: Webpack is ${(1 / overallSummary.speedup).toFixed(2)}x faster`, 'yellow')
      }
    }
  }

  console.log()
}

// Run the benchmark
main().catch((err) => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})
