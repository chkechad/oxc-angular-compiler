#!/usr/bin/env node
/**
 * Show detailed diffs for Angular compiler comparison results.
 *
 * Usage:
 *   pnpm show-diff ComponentName   # Show diff for a specific component
 *   pnpm show-diff --all           # Show all diffs (paginated)
 */

import { readFile } from 'fs/promises'
import { resolve, relative } from 'path'
import { parseArgs } from 'util'

import type { ComparisonReport, CompilationResult, FunctionLevelComparison } from './types.js'

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
}

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    all: {
      type: 'boolean',
      description: 'Show all diffs',
    },
    report: {
      type: 'string',
      short: 'r',
      default: './compare-report.json',
      description: 'Path to compare-report.json',
    },
    limit: {
      type: 'string',
      short: 'l',
      default: '10',
      description: 'Number of results per page (for --all)',
    },
    help: {
      type: 'boolean',
      short: 'h',
      description: 'Show help',
    },
  },
})

if (values.help) {
  printHelp()
  process.exit(0)
}

const reportPath = resolve(values.report!)
let report: ComparisonReport

try {
  const content = await readFile(reportPath, 'utf-8')
  report = JSON.parse(content) as ComparisonReport
} catch (e) {
  console.error(`Error reading report: ${reportPath}`)
  console.error(e)
  process.exit(1)
}

const mismatchedResults = report.results.filter((r) => r.status === 'mismatch')
const errorResults = report.results.filter(
  (r) => r.status === 'oxc-error' || r.status === 'ts-error' || r.status === 'both-error',
)

if (values.all) {
  showAllDiffs(mismatchedResults, errorResults, parseInt(values.limit!, 10))
} else if (positionals.length > 0) {
  const filter = positionals[0]
  const filtered = findComponents(report.results, filter)

  if (filtered.length === 0) {
    console.log(`No components found matching: ${filter}`)
    console.log('\nTry searching for partial names or check available mismatched components:')
    console.log(
      mismatchedResults
        .slice(0, 10)
        .map((r) => `  - ${r.component.className}`)
        .join('\n'),
    )
    process.exit(1)
  }

  for (const result of filtered) {
    showComponentDiff(result, report.metadata.projectRoot)
  }
} else {
  printHelp()
  process.exit(0)
}

function printHelp(): void {
  console.log(`
Angular Compiler Diff Viewer

USAGE:
  pnpm show-diff <ComponentName>  Show diff for a specific component
  pnpm show-diff --all            Show all diffs (paginated)

OPTIONS:
  -r, --report <path>   Path to compare-report.json (default: ./compare-report.json)
  -l, --limit <n>       Number of results per page for --all (default: 10)
  -h, --help            Show this help

EXAMPLES:
  pnpm show-diff AppComponent
  pnpm show-diff Dialog              # Partial match
  pnpm show-diff --all -l 5          # Show 5 at a time
`)
}

function findComponents(results: CompilationResult[], filter: string): CompilationResult[] {
  const lowerFilter = filter.toLowerCase()
  return results.filter(
    (r) =>
      (r.status === 'mismatch' ||
        r.status === 'oxc-error' ||
        r.status === 'ts-error' ||
        r.status === 'both-error') &&
      (r.component.className.toLowerCase().includes(lowerFilter) ||
        r.component.filePath.toLowerCase().includes(lowerFilter)),
  )
}

function showAllDiffs(
  mismatched: CompilationResult[],
  errors: CompilationResult[],
  limit: number,
): void {
  const all = [...errors, ...mismatched]

  console.log(`\n${COLORS.bold}Total results: ${all.length}${COLORS.reset}`)
  console.log(`  Errors: ${errors.length}`)
  console.log(`  Mismatches: ${mismatched.length}\n`)

  for (let i = 0; i < Math.min(limit, all.length); i++) {
    showComponentDiff(all[i], '')
    console.log('\n' + '='.repeat(80) + '\n')
  }

  if (all.length > limit) {
    console.log(
      `${COLORS.dim}Showing ${limit} of ${all.length}. Use -l to show more.${COLORS.reset}`,
    )
  }
}

function showComponentDiff(result: CompilationResult, projectRoot: string): void {
  const { component, status } = result

  // Header
  const relativePath = projectRoot ? relative(projectRoot, component.filePath) : component.filePath

  console.log(`${COLORS.bold}${COLORS.cyan}${component.className}${COLORS.reset}`)
  console.log(`${COLORS.dim}${relativePath}${COLORS.reset}`)
  console.log(`Status: ${getStatusColor(status)}${status}${COLORS.reset}`)
  console.log()

  // Handle error cases
  if (status === 'oxc-error') {
    console.log(`${COLORS.red}Oxc Error:${COLORS.reset}`)
    console.log(result.oxcOutput?.error || 'Unknown error')
    return
  }

  if (status === 'ts-error') {
    console.log(`${COLORS.red}TypeScript Error:${COLORS.reset}`)
    console.log(result.tsOutput?.error || 'Unknown error')
    return
  }

  if (status === 'both-error') {
    console.log(`${COLORS.red}Both compilers failed:${COLORS.reset}`)
    console.log(`Oxc: ${result.oxcOutput?.error || 'Unknown'}`)
    console.log(`TS:  ${result.tsOutput?.error || 'Unknown'}`)
    return
  }

  // Show function-level summary
  if (result.functionComparison) {
    showFunctionSummary(result.functionComparison, result.oxcOutput?.code, result.tsOutput?.code)
  } else if (result.diff && result.diff.length > 0) {
    // Show legacy diff info (parse errors, etc.)
    console.log(`${COLORS.bold}Diff Details:${COLORS.reset}`)
    for (const d of result.diff) {
      if (d.type === 'different') {
        console.log(`  ${COLORS.yellow}~${COLORS.reset} ${d.path}`)
        if (d.expected !== undefined) {
          console.log(`    ${COLORS.red}expected:${COLORS.reset} ${d.expected}`)
        }
        if (d.actual !== undefined) {
          console.log(`    ${COLORS.green}actual:${COLORS.reset} ${d.actual}`)
        }
      } else if (d.type === 'missing') {
        console.log(`  ${COLORS.red}-${COLORS.reset} ${d.path}: ${d.expected}`)
      } else if (d.type === 'extra') {
        console.log(`  ${COLORS.green}+${COLORS.reset} ${d.path}: ${d.actual}`)
      }
    }
    console.log()
  } else if (status === 'mismatch') {
    // No detailed diff available, show raw code comparison
    console.log(`${COLORS.yellow}No detailed diff available. Showing raw outputs:${COLORS.reset}`)
    console.log()
    if (result.oxcOutput?.code) {
      console.log(`${COLORS.cyan}Oxc Output:${COLORS.reset}`)
      console.log(result.oxcOutput.code.slice(0, 500))
      if (result.oxcOutput.code.length > 500) {
        console.log(`${COLORS.dim}... (truncated)${COLORS.reset}`)
      }
      console.log()
    }
    if (result.tsOutput?.code) {
      console.log(`${COLORS.cyan}TS Output:${COLORS.reset}`)
      console.log(result.tsOutput.code.slice(0, 500))
      if (result.tsOutput.code.length > 500) {
        console.log(`${COLORS.dim}... (truncated)${COLORS.reset}`)
      }
    }
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'match':
      return COLORS.green
    case 'mismatch':
      return COLORS.yellow
    case 'oxc-error':
    case 'ts-error':
    case 'both-error':
      return COLORS.red
    default:
      return ''
  }
}

function showFunctionSummary(
  comparison: FunctionLevelComparison,
  fullOxcCode?: string,
  fullTsCode?: string,
): void {
  console.log(`${COLORS.bold}Function Summary:${COLORS.reset}`)

  // Pre-extract functions from full code for fallback
  const oxcFunctions = fullOxcCode ? splitIntoFunctions(fullOxcCode) : {}
  const tsFunctions = fullTsCode ? splitIntoFunctions(fullTsCode) : {}

  if (comparison.missingFunctions.length > 0) {
    console.log(`  ${COLORS.red}Missing (in TS, not in Oxc):${COLORS.reset}`)
    for (const name of comparison.missingFunctions) {
      console.log(`    - ${name}`)
    }
  }

  if (comparison.extraFunctions.length > 0) {
    console.log(`  ${COLORS.green}Extra (in Oxc, not in TS):${COLORS.reset}`)
    for (const name of comparison.extraFunctions) {
      console.log(`    + ${name}`)
    }
  }

  if (comparison.functionDiffs.length > 0) {
    console.log(`  ${COLORS.yellow}Differing:${COLORS.reset}`)
    for (const fd of comparison.functionDiffs) {
      console.log(`\n  ${COLORS.yellow}~ ${fd.name}${COLORS.reset}`)
      // Show actual code diff using oxcCode and tsCode from the diff entry
      if (fd.oxcCode && fd.tsCode) {
        showFunctionCodeDiff(fd.oxcCode, fd.tsCode)
      } else {
        // Fallback: extract from full code
        const oxcFunc = oxcFunctions[fd.name]
        const tsFunc = tsFunctions[fd.name]
        if (oxcFunc && tsFunc) {
          showFunctionCodeDiff(oxcFunc, tsFunc)
        } else {
          console.log(`    ${COLORS.dim}(Code diff not available)${COLORS.reset}`)
        }
      }
    }
  }

  if (comparison.matchingFunctions.length > 0) {
    console.log(
      `\n  ${COLORS.dim}Matching: ${comparison.matchingFunctions.length} function(s)${COLORS.reset}`,
    )
  }

  console.log()
}

/**
 * Show a readable code diff between two function implementations.
 */
function showFunctionCodeDiff(oxcCode: string, tsCode: string): void {
  const oxcLines = oxcCode.split('\n')
  const tsLines = tsCode.split('\n')

  // Create sets for quick lookup (trimmed for whitespace tolerance)
  const oxcSet = new Set(oxcLines.map((l) => l.trim()))
  const tsSet = new Set(tsLines.map((l) => l.trim()))

  // Find differing lines
  const oxcOnly: string[] = []
  const tsOnly: string[] = []

  for (const line of oxcLines) {
    const trimmed = line.trim()
    if (trimmed && !tsSet.has(trimmed)) {
      oxcOnly.push(line)
    }
  }

  for (const line of tsLines) {
    const trimmed = line.trim()
    if (trimmed && !oxcSet.has(trimmed)) {
      tsOnly.push(line)
    }
  }

  // Show differing lines in a readable format
  const maxLines = 15

  if (oxcOnly.length > 0) {
    console.log(`    ${COLORS.cyan}Oxc:${COLORS.reset}`)
    for (const line of oxcOnly.slice(0, maxLines)) {
      console.log(`      ${COLORS.green}${line}${COLORS.reset}`)
    }
    if (oxcOnly.length > maxLines) {
      console.log(
        `      ${COLORS.dim}... and ${oxcOnly.length - maxLines} more lines${COLORS.reset}`,
      )
    }
  }

  if (tsOnly.length > 0) {
    console.log(`    ${COLORS.cyan}TS:${COLORS.reset}`)
    for (const line of tsOnly.slice(0, maxLines)) {
      console.log(`      ${COLORS.red}${line}${COLORS.reset}`)
    }
    if (tsOnly.length > maxLines) {
      console.log(
        `      ${COLORS.dim}... and ${tsOnly.length - maxLines} more lines${COLORS.reset}`,
      )
    }
  }
}

function splitIntoFunctions(code: string): Record<string, string> {
  const functions: Record<string, string> = {}

  // Split by function declarations and const function expressions
  // This handles:
  // - function foo() { ... }
  // - const foo = function() { ... }
  // - const foo = () => { ... }
  const parts = code.split(/(?=function\s+\w+|const\s+\w+\s*=\s*(?:function|\())/)

  for (const part of parts) {
    // Match regular function declarations: function foo() { ... }
    const funcMatch = part.match(/^function\s+(\w+)/)
    if (funcMatch) {
      functions[funcMatch[1]] = part.trim()
      continue
    }

    // Match const function expressions: const foo = function() { ... }
    // or const arrow functions: const foo = () => { ... }
    const constMatch = part.match(/^const\s+(\w+)\s*=\s*(?:function|\()/)
    if (constMatch) {
      functions[constMatch[1]] = part.trim()
      continue
    }

    // Handle other const declarations at the top (arrays, objects, etc.)
    if (part.trim().startsWith('const ')) {
      functions['__constants__'] = (functions['__constants__'] || '') + part
    }
  }

  return functions
}
