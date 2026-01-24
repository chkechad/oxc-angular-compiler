import { parseSync } from 'oxc-parser'

/**
 * Represents a simple template literal that can be normalized to a string.
 * Only template literals without expressions (interpolations) are eligible.
 */
interface TemplateLiteralLocation {
  /** Start position in source (includes the opening backtick) */
  start: number
  /** End position in source (includes the closing backtick) */
  end: number
  /** The raw content inside the template literal */
  content: string
}

/**
 * AST node types we care about for finding template literals
 */
interface AstNode {
  type: string
  start: number
  end: number
  key?: AstNode
  value?: AstNode
  quasis?: Array<{ value: { raw: string; cooked: string } }>
  expressions?: AstNode[]
  name?: string
  [key: string]: unknown
}

/**
 * Find all template literals that are values of object properties.
 * Only returns template literals without expressions (simple templates).
 */
function findPropertyTemplateLiterals(node: AstNode): TemplateLiteralLocation[] {
  const results: TemplateLiteralLocation[] = []

  function visit(node: AstNode): void {
    if (!node || typeof node !== 'object') return

    // Check if this is a Property or ObjectProperty with a TemplateLiteral value
    if (
      (node.type === 'Property' || node.type === 'ObjectProperty') &&
      node.value &&
      (node.value as AstNode).type === 'TemplateLiteral'
    ) {
      const templateLiteral = node.value as AstNode

      // Only process template literals without expressions (simple templates)
      if (
        templateLiteral.expressions &&
        (templateLiteral.expressions as AstNode[]).length === 0 &&
        templateLiteral.quasis &&
        templateLiteral.quasis.length === 1
      ) {
        results.push({
          start: templateLiteral.start,
          end: templateLiteral.end,
          content: templateLiteral.quasis[0].value.cooked,
        })
      }
    }

    // Recursively visit all properties
    for (const key of Object.keys(node)) {
      const value = node[key]
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object') {
            visit(item as AstNode)
          }
        }
      } else if (value && typeof value === 'object') {
        visit(value as AstNode)
      }
    }
  }

  visit(node)
  return results
}

/**
 * Escape a string for use in a double-quoted string literal.
 */
function escapeForStringLiteral(content: string): string {
  return content
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, '\\n') // Escape actual newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t') // Escape tabs
}

/**
 * Normalize template literals to regular strings for semantic comparison.
 *
 * Uses AST parsing to precisely identify template literals that are object
 * property values (like `template:\`...\``) and converts them to equivalent
 * string literals (like `template:"..."`).
 *
 * This approach is more precise than regex because it:
 * - Only matches template literals that are actually property values
 * - Correctly handles template literals inside tagged templates (like $localize)
 * - Avoids false positives from patterns like `:INTERPOLATION:` in i18n messages
 *
 * @param code - The JavaScript/TypeScript code to normalize
 * @returns The code with property template literals converted to strings
 */
export function normalizeTemplateLiterals(code: string): string {
  // Parse the code to get the AST
  const parseResult = parseSync('input.js', code, { sourceType: 'module' })

  // If there are parse errors, fall back to returning the original code
  // The comparison will catch parse errors later
  if (parseResult.errors.length > 0) {
    return code
  }

  // Find all template literals that are property values
  const locations = findPropertyTemplateLiterals(parseResult.program as unknown as AstNode)

  // If no template literals found, return original code
  if (locations.length === 0) {
    return code
  }

  // Sort by position (descending) so we can replace from end to start
  // This prevents position shifts from affecting subsequent replacements
  locations.sort((a, b) => b.start - a.start)

  // Perform replacements
  let result = code
  for (const loc of locations) {
    const escaped = escapeForStringLiteral(loc.content)
    const replacement = `"${escaped}"`
    result = result.slice(0, loc.start) + replacement + result.slice(loc.end)
  }

  return result
}
