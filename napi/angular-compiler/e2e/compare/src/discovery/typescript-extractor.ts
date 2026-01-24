/**
 * TypeScript-based component metadata extraction for validation.
 *
 * This provides parallel extraction using TypeScript's native parser
 * to validate Oxc's extraction against the reference implementation.
 */

import { parseSync } from 'oxc-parser'
import * as ts from 'typescript'

/**
 * Properties to ignore when normalizing AST nodes for comparison.
 * These properties contain cosmetic/location information that doesn't affect semantics.
 */
const IGNORED_PROPERTIES = new Set([
  'span',
  'start',
  'end',
  'loc',
  'range',
  'leadingComments',
  'trailingComments',
  'innerComments',
  'comments',
  'raw',
  'extra',
])

/**
 * Unwrap expression wrapper nodes that don't affect runtime semantics.
 * This normalizes:
 * - `(expr)` -> `expr` (ParenthesizedExpression)
 * - `expr satisfies Type` -> `expr` (TSSatisfiesExpression)
 * - `expr as Type` -> `expr` (TSAsExpression)
 */
function unwrapExpressionWrappers(node: unknown): unknown {
  if (node === null || typeof node !== 'object') {
    return node
  }

  const obj = node as Record<string, unknown>

  // Unwrap ParenthesizedExpression
  if (obj.type === 'ParenthesizedExpression' && 'expression' in obj) {
    return unwrapExpressionWrappers(obj.expression)
  }

  // Unwrap TSSatisfiesExpression (e.g., `[...] satisfies Type[]`)
  if (obj.type === 'TSSatisfiesExpression' && 'expression' in obj) {
    return unwrapExpressionWrappers(obj.expression)
  }

  // Unwrap TSAsExpression (e.g., `[...] as Type[]`)
  if (obj.type === 'TSAsExpression' && 'expression' in obj) {
    return unwrapExpressionWrappers(obj.expression)
  }

  // Recursively process arrays
  if (Array.isArray(node)) {
    return node.map(unwrapExpressionWrappers)
  }

  // Recursively process object properties
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = unwrapExpressionWrappers(value)
  }
  return result
}

/**
 * Normalize AST to a canonical JSON string representation.
 * This excludes location and cosmetic properties, and unwraps expression wrappers.
 */
function normalizeAst(node: unknown): string {
  // First unwrap expression wrappers (parentheses, satisfies, as)
  const unwrapped = unwrapExpressionWrappers(node)
  return JSON.stringify(unwrapped, (key, value) => {
    if (IGNORED_PROPERTIES.has(key)) {
      return undefined
    }
    return value
  })
}

/**
 * Normalize a JavaScript expression string using AST parsing.
 *
 * This function parses the expression into an AST, normalizes it by removing
 * location/cosmetic information, and returns a canonical string representation.
 * This allows comparing expressions that are semantically identical but have
 * different formatting (e.g., spaces after commas).
 *
 * @param expr - The expression string to normalize (e.g., "[{provide: FOO}]")
 * @returns The normalized string representation, or the original expression if parsing fails
 */
function normalizeExpressionAst(expr: string | null | undefined): string {
  if (expr === null || expr === undefined) {
    return ''
  }

  try {
    // Wrap the expression in a variable declaration to make it parseable
    // Use .ts extension to allow TypeScript syntax like `satisfies` keyword
    const wrappedCode = `const _expr = ${expr};`
    const result = parseSync('expr.ts', wrappedCode, { sourceType: 'module' })

    if (result.errors.length > 0) {
      // Parse failed, fall back to simple whitespace normalization
      return expr.replace(/\s+/g, ' ').trim()
    }

    // Extract the initializer from the variable declaration
    const program = result.program as { body: unknown[] }
    if (program.body.length === 0) {
      return expr.replace(/\s+/g, ' ').trim()
    }

    const firstStmt = program.body[0] as {
      type: string
      declarations?: Array<{ init?: unknown }>
    }

    if (
      firstStmt.type === 'VariableDeclaration' &&
      firstStmt.declarations &&
      firstStmt.declarations.length > 0 &&
      firstStmt.declarations[0].init
    ) {
      // Normalize the initializer AST
      return normalizeAst(firstStmt.declarations[0].init)
    }

    // Fallback: simple whitespace normalization
    return expr.replace(/\s+/g, ' ').trim()
  } catch {
    // On any error, fall back to simple whitespace normalization
    return expr.replace(/\s+/g, ' ').trim()
  }
}

/**
 * Host metadata extracted using TypeScript parser.
 */
export interface TsExtractedHostMetadata {
  properties: string[][]
  attributes: string[][]
  listeners: string[][]
  classAttr?: string
  styleAttr?: string
}

/**
 * Host directive metadata extracted using TypeScript parser.
 */
export interface TsExtractedHostDirective {
  directive: string
  inputs: string[][]
  outputs: string[][]
  isForwardReference: boolean
}

/**
 * Input binding information extracted from @Input decorator.
 */
export interface TsInputBindingInfo {
  bindingPropertyName: string
  classPropertyName: string
  required: boolean
  isSignal: boolean
  transform?: string
}

/**
 * Query information extracted from @ViewChild/@ContentChild decorators.
 */
export interface TsQueryInfo {
  propertyName: string
  predicate: string | string[]
  descendants?: boolean
  static?: boolean
  read?: string
}

/**
 * Component metadata extracted using TypeScript's parser.
 * Mirrors ExtractedComponentMetadata from Oxc.
 */
export interface TsExtractedComponentMetadata {
  className: string
  selector?: string
  template?: string
  templateUrl?: string
  styles: string[]
  styleUrls: string[]
  standalone?: boolean
  encapsulation?: string
  changeDetection?: string
  host?: TsExtractedHostMetadata
  imports: string[]
  exportAs?: string
  preserveWhitespaces?: boolean
  providers?: string
  viewProviders?: string
  animations?: string
  schemas: string[]
  hostDirectives: TsExtractedHostDirective[]
  /** Component inputs extracted from @Input decorators */
  inputs?: Record<string, TsInputBindingInfo>
  /** Component outputs extracted from @Output decorators */
  outputs?: Record<string, string>
  /** Content queries extracted from @ContentChild/@ContentChildren decorators */
  queries?: TsQueryInfo[]
  /** View queries extracted from @ViewChild/@ViewChildren decorators */
  viewQueries?: TsQueryInfo[]
}

/**
 * Result of extraction validation.
 */
export interface ExtractionValidationResult {
  /** Whether the extractions match */
  matches: boolean
  /** List of mismatches found */
  mismatches: string[]
  /** Component class name */
  className: string
}

/**
 * Angular import information collected from the file.
 * Maps local names (aliases) to their original Angular export names.
 */
interface AngularImportInfo {
  /** Map of local alias -> original name (e.g., "Comp" -> "Component") */
  aliases: Map<string, string>
  /** Namespace identifier if using `import * as core from '@angular/core'` */
  namespace?: string
}

/**
 * Check if a decorator is @HostBinding or @HostListener.
 * Returns the decorator type if it matches, null otherwise.
 */
function isHostDecorator(
  expr: ts.Expression,
  imports: AngularImportInfo,
): 'HostBinding' | 'HostListener' | null {
  // Direct or aliased: @HostBinding() or @HB()
  if (ts.isIdentifier(expr)) {
    const localName = expr.text
    const resolved = imports.aliases.get(localName) ?? localName
    if (resolved === 'HostBinding') return 'HostBinding'
    if (resolved === 'HostListener') return 'HostListener'
  }

  // Namespaced: @core.HostBinding()
  if (ts.isPropertyAccessExpression(expr)) {
    const namespace = expr.expression
    const propertyName = expr.name
    if (ts.isIdentifier(namespace) && ts.isIdentifier(propertyName)) {
      if (namespace.text === imports.namespace) {
        if (propertyName.text === 'HostBinding') return 'HostBinding'
        if (propertyName.text === 'HostListener') return 'HostListener'
      }
    }
  }

  return null
}

/**
 * Check if a decorator is @Input or @Output.
 * Returns the decorator type if it matches, null otherwise.
 */
function isInputOutputDecorator(
  expr: ts.Expression,
  imports: AngularImportInfo,
): 'Input' | 'Output' | null {
  if (ts.isIdentifier(expr)) {
    const resolved = imports.aliases.get(expr.text) ?? expr.text
    if (resolved === 'Input') return 'Input'
    if (resolved === 'Output') return 'Output'
  }

  if (ts.isPropertyAccessExpression(expr)) {
    const namespace = expr.expression
    const propertyName = expr.name
    if (ts.isIdentifier(namespace) && ts.isIdentifier(propertyName)) {
      if (namespace.text === imports.namespace) {
        if (propertyName.text === 'Input') return 'Input'
        if (propertyName.text === 'Output') return 'Output'
      }
    }
  }
  return null
}

/**
 * Check if a decorator is @ViewChild, @ViewChildren, @ContentChild, or @ContentChildren.
 * Returns the decorator type if it matches, null otherwise.
 */
function isQueryDecorator(
  expr: ts.Expression,
  imports: AngularImportInfo,
): 'ViewChild' | 'ViewChildren' | 'ContentChild' | 'ContentChildren' | null {
  const queryNames = ['ViewChild', 'ViewChildren', 'ContentChild', 'ContentChildren']

  if (ts.isIdentifier(expr)) {
    const resolved = imports.aliases.get(expr.text) ?? expr.text
    if (queryNames.includes(resolved)) {
      return resolved as 'ViewChild' | 'ViewChildren' | 'ContentChild' | 'ContentChildren'
    }
  }

  if (ts.isPropertyAccessExpression(expr)) {
    const namespace = expr.expression
    const propertyName = expr.name
    if (ts.isIdentifier(namespace) && ts.isIdentifier(propertyName)) {
      if (namespace.text === imports.namespace && queryNames.includes(propertyName.text)) {
        return propertyName.text as
          | 'ViewChild'
          | 'ViewChildren'
          | 'ContentChild'
          | 'ContentChildren'
      }
    }
  }
  return null
}

/**
 * Extract input binding information from an @Input decorator.
 */
function extractInputDecoratorInfo(
  decorator: ts.Decorator,
  propertyName: string,
  sourceFile: ts.SourceFile,
): TsInputBindingInfo | null {
  if (!ts.isCallExpression(decorator.expression)) {
    // @Input without parentheses - use default binding name
    return {
      bindingPropertyName: propertyName,
      classPropertyName: propertyName,
      required: false,
      isSignal: false,
    }
  }

  const args = decorator.expression.arguments
  let bindingPropertyName = propertyName
  let required = false
  let isSignal = false
  let transform: string | undefined

  if (args.length > 0) {
    const firstArg = args[0]

    // @Input('customName')
    if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
      bindingPropertyName = firstArg.text
    }
    // @Input({ alias: 'name', required: true, transform: fn })
    else if (ts.isObjectLiteralExpression(firstArg)) {
      for (const prop of firstArg.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue

        const propName = prop.name.text
        switch (propName) {
          case 'alias':
            if (
              ts.isStringLiteral(prop.initializer) ||
              ts.isNoSubstitutionTemplateLiteral(prop.initializer)
            ) {
              bindingPropertyName = prop.initializer.text
            }
            break
          case 'required':
            required = extractBoolean(prop.initializer) ?? false
            break
          case 'transform':
            if (ts.isIdentifier(prop.initializer)) {
              transform = prop.initializer.text
            } else {
              transform = prop.initializer.getText(sourceFile)
            }
            break
        }
      }
    }
  }

  return {
    bindingPropertyName,
    classPropertyName: propertyName,
    required,
    isSignal,
    transform,
  }
}

/**
 * Extract output binding information from an @Output decorator.
 * Returns the public binding name (alias or property name).
 */
function extractOutputDecoratorInfo(decorator: ts.Decorator, propertyName: string): string {
  if (!ts.isCallExpression(decorator.expression)) {
    return propertyName
  }

  const args = decorator.expression.arguments
  if (args.length > 0) {
    const firstArg = args[0]
    if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
      return firstArg.text
    }
  }

  return propertyName
}

/**
 * Extract query information from @ViewChild/@ContentChild decorators.
 */
function extractQueryDecoratorInfo(
  decorator: ts.Decorator,
  decoratorType: 'ViewChild' | 'ViewChildren' | 'ContentChild' | 'ContentChildren',
  propertyName: string,
  sourceFile: ts.SourceFile,
): TsQueryInfo | null {
  if (!ts.isCallExpression(decorator.expression)) {
    return null
  }

  const args = decorator.expression.arguments
  if (args.length === 0) {
    return null
  }

  let predicate: string | string[] = ''
  let descendants: boolean | undefined
  let isStatic: boolean | undefined
  let read: string | undefined

  // First argument: predicate (selector string or type reference)
  const predicateArg = args[0]
  if (ts.isStringLiteral(predicateArg) || ts.isNoSubstitutionTemplateLiteral(predicateArg)) {
    predicate = predicateArg.text
  } else if (ts.isIdentifier(predicateArg)) {
    predicate = predicateArg.text
  } else if (ts.isPropertyAccessExpression(predicateArg)) {
    predicate = predicateArg.getText(sourceFile)
  }

  // Second argument: options object
  if (args.length > 1 && ts.isObjectLiteralExpression(args[1])) {
    const options = args[1]
    for (const prop of options.properties) {
      if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue

      const optName = prop.name.text
      switch (optName) {
        case 'descendants':
          descendants = extractBoolean(prop.initializer)
          break
        case 'static':
          isStatic = extractBoolean(prop.initializer)
          break
        case 'read':
          if (ts.isIdentifier(prop.initializer)) {
            read = prop.initializer.text
          } else {
            read = prop.initializer.getText(sourceFile)
          }
          break
      }
    }
  }

  return {
    propertyName,
    predicate,
    descendants: decoratorType.includes('Content') ? descendants : undefined,
    static: isStatic,
    read,
  }
}

/**
 * Extract @Input, @Output, @ViewChild, @ViewChildren, @ContentChild, @ContentChildren
 * decorators from a class and return the extracted metadata.
 */
function extractInputsOutputsQueriesFromClass(
  classNode: ts.ClassDeclaration,
  imports: AngularImportInfo,
  sourceFile: ts.SourceFile,
): {
  inputs: Record<string, TsInputBindingInfo>
  outputs: Record<string, string>
  queries: TsQueryInfo[]
  viewQueries: TsQueryInfo[]
} {
  const inputs: Record<string, TsInputBindingInfo> = {}
  const outputs: Record<string, string> = {}
  const queries: TsQueryInfo[] = []
  const viewQueries: TsQueryInfo[] = []

  for (const member of classNode.members) {
    // Only check property declarations (inputs/outputs/queries are on properties)
    if (
      !ts.isPropertyDeclaration(member) &&
      !ts.isGetAccessorDeclaration(member) &&
      !ts.isSetAccessorDeclaration(member)
    ) {
      continue
    }

    const decorators = ts.getDecorators(member)
    if (!decorators) continue

    let memberName: string | undefined
    if (member.name) {
      if (ts.isIdentifier(member.name)) {
        memberName = member.name.text
      } else if (ts.isStringLiteral(member.name)) {
        memberName = member.name.text
      }
    }

    if (!memberName) continue

    for (const decorator of decorators) {
      // Check for @Input/@Output
      const ioExpr = ts.isCallExpression(decorator.expression)
        ? decorator.expression.expression
        : ts.isIdentifier(decorator.expression)
          ? decorator.expression
          : null

      if (ioExpr) {
        const ioType = isInputOutputDecorator(ioExpr, imports)

        if (ioType === 'Input') {
          const info = extractInputDecoratorInfo(decorator, memberName, sourceFile)
          if (info) {
            inputs[info.bindingPropertyName] = info
          }
          continue
        }

        if (ioType === 'Output') {
          const bindingName = extractOutputDecoratorInfo(decorator, memberName)
          outputs[bindingName] = memberName
          continue
        }

        // Check for query decorators
        const queryType = isQueryDecorator(ioExpr, imports)
        if (queryType) {
          const info = extractQueryDecoratorInfo(decorator, queryType, memberName, sourceFile)
          if (info) {
            if (queryType === 'ViewChild' || queryType === 'ViewChildren') {
              viewQueries.push(info)
            } else {
              queries.push(info)
            }
          }
        }
      }
    }
  }

  return { inputs, outputs, queries, viewQueries }
}

/**
 * Extract host binding/listener information from a class member decorator.
 * For @HostBinding('class.active'), returns { key: "[class.active]", value: "memberName" }
 * For @HostListener('click', ['$event']), returns { key: "(click)", value: "memberName($event)" }
 */
function extractHostDecoratorInfo(
  decorator: ts.Decorator,
  decoratorType: 'HostBinding' | 'HostListener',
  memberName: string,
  sourceFile: ts.SourceFile,
): { key: string; value: string } | null {
  if (!ts.isCallExpression(decorator.expression)) {
    return null
  }

  const args = decorator.expression.arguments

  if (decoratorType === 'HostBinding') {
    // @HostBinding('property') or @HostBinding() (defaults to member name)
    let bindingName = memberName
    if (args.length > 0) {
      const firstArg = args[0]
      if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
        bindingName = firstArg.text
      }
    }
    return { key: `[${bindingName}]`, value: memberName }
  }

  if (decoratorType === 'HostListener') {
    // @HostListener('event', ['$event', '$event.target'])
    if (args.length === 0) {
      return null // Event name is required
    }

    const firstArg = args[0]
    let eventName: string | undefined
    if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
      eventName = firstArg.text
    }

    if (!eventName) {
      return null
    }

    // Extract the args array if present
    let argsStr = ''
    if (args.length > 1) {
      const argsArray = args[1]
      if (ts.isArrayLiteralExpression(argsArray)) {
        const argStrings: string[] = []
        for (const elem of argsArray.elements) {
          if (ts.isStringLiteral(elem) || ts.isNoSubstitutionTemplateLiteral(elem)) {
            argStrings.push(elem.text)
          } else {
            // For complex expressions, fall back to source text
            argStrings.push(elem.getText(sourceFile))
          }
        }
        argsStr = argStrings.join(', ')
      }
    }

    const value = argsStr ? `${memberName}(${argsStr})` : `${memberName}()`
    return { key: `(${eventName})`, value }
  }

  return null
}

/**
 * Extract @HostBinding and @HostListener decorators from a class
 * and merge them into host metadata using Angular's map overwrite semantics.
 * In Angular, if the same binding key appears multiple times, later definitions
 * override earlier ones (not append).
 */
function extractHostDecoratorsFromClass(
  classNode: ts.ClassDeclaration,
  imports: AngularImportInfo,
  existingHost: TsExtractedHostMetadata | undefined,
  sourceFile: ts.SourceFile,
): TsExtractedHostMetadata | undefined {
  // Use objects for proper merge semantics (later values overwrite earlier ones)
  const propertiesMap: Record<string, string> = {}
  const attributesMap: Record<string, string> = {}
  const listenersMap: Record<string, string> = {}

  // First, populate from existing metadata
  if (existingHost?.properties) {
    for (const [key, value] of existingHost.properties) {
      propertiesMap[key] = value
    }
  }
  if (existingHost?.attributes) {
    for (const [key, value] of existingHost.attributes) {
      attributesMap[key] = value
    }
  }
  if (existingHost?.listeners) {
    for (const [key, value] of existingHost.listeners) {
      listenersMap[key] = value
    }
  }

  let classAttr = existingHost?.classAttr
  let styleAttr = existingHost?.styleAttr
  let foundAny = false

  for (const member of classNode.members) {
    // Only check members that can have decorators
    if (
      !ts.isPropertyDeclaration(member) &&
      !ts.isMethodDeclaration(member) &&
      !ts.isGetAccessorDeclaration(member) &&
      !ts.isSetAccessorDeclaration(member)
    ) {
      continue
    }

    const decorators = ts.getDecorators(member)
    if (!decorators) continue

    let memberName: string | undefined

    if (member.name) {
      if (ts.isIdentifier(member.name)) {
        memberName = member.name.text
      } else if (ts.isStringLiteral(member.name)) {
        memberName = member.name.text
      }
    }

    if (!memberName) continue

    for (const decorator of decorators) {
      if (!ts.isCallExpression(decorator.expression)) continue

      const decoratorType = isHostDecorator(decorator.expression.expression, imports)
      if (!decoratorType) continue

      const info = extractHostDecoratorInfo(decorator, decoratorType, memberName, sourceFile)
      if (!info) continue

      foundAny = true

      // Use assignment (overwrite) instead of push (append) to match Angular semantics
      if (decoratorType === 'HostBinding') {
        propertiesMap[info.key] = info.value
      } else {
        listenersMap[info.key] = info.value
      }
    }
  }

  // Return undefined if no host metadata exists at all
  if (!foundAny && !existingHost) {
    return undefined
  }

  // Convert back to array format for return type compatibility
  return {
    properties: Object.entries(propertiesMap),
    attributes: Object.entries(attributesMap),
    listeners: Object.entries(listenersMap),
    classAttr,
    styleAttr,
  }
}

/**
 * Collect Angular imports from a source file.
 * Handles both named imports (with aliases) and namespace imports.
 */
function collectAngularImports(sourceFile: ts.SourceFile): AngularImportInfo {
  const info: AngularImportInfo = {
    aliases: new Map(),
  }

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue

    // Check if this import is from @angular/core
    const moduleSpecifier = statement.moduleSpecifier
    if (!ts.isStringLiteral(moduleSpecifier)) continue
    if (moduleSpecifier.text !== '@angular/core') continue

    const importClause = statement.importClause
    if (!importClause) continue

    // Handle namespace import: import * as core from '@angular/core'
    if (importClause.namedBindings && ts.isNamespaceImport(importClause.namedBindings)) {
      info.namespace = importClause.namedBindings.name.text
    }

    // Handle named imports: import { Component, Component as Comp } from '@angular/core'
    if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
      for (const element of importClause.namedBindings.elements) {
        // propertyName is the original export name, name is the local alias
        const originalName = element.propertyName?.text ?? element.name.text
        const localName = element.name.text
        info.aliases.set(localName, originalName)
      }
    }
  }

  return info
}

/**
 * Extract component metadata from a TypeScript file using TypeScript's parser.
 */
export function extractComponentMetadataWithTypescript(
  source: string,
  filePath: string,
): TsExtractedComponentMetadata[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  // Collect Angular imports (aliases and namespace)
  const angularImports = collectAngularImports(sourceFile)

  const result: TsExtractedComponentMetadata[] = []

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node) && node.name) {
      const decorator = findComponentDecorator(node, angularImports)
      if (decorator) {
        const metadata = extractFromDecorator(
          decorator,
          node.name.text,
          sourceFile,
          node,
          angularImports,
        )
        if (metadata) {
          result.push(metadata)
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return result
}

/**
 * Check if an expression refers to Angular's Component decorator.
 * Handles:
 * - Direct: Component({...})
 * - Aliased: Comp({...}) where `import { Component as Comp }`
 * - Namespaced: core.Component({...}) where `import * as core`
 */
function isComponentDecorator(expr: ts.Expression, imports: AngularImportInfo): boolean {
  // Direct or aliased: @Component() or @Comp()
  if (ts.isIdentifier(expr)) {
    const localName = expr.text
    // Check if this identifier resolves to "Component"
    const resolved = imports.aliases.get(localName) ?? localName
    return resolved === 'Component'
  }

  // Namespaced: @core.Component()
  if (ts.isPropertyAccessExpression(expr)) {
    const namespace = expr.expression
    const propertyName = expr.name
    if (ts.isIdentifier(namespace) && ts.isIdentifier(propertyName)) {
      // Check if the namespace matches our Angular namespace import
      if (namespace.text === imports.namespace && propertyName.text === 'Component') {
        return true
      }
    }
  }

  return false
}

/**
 * Find @Component decorator on a class declaration.
 */
function findComponentDecorator(
  node: ts.ClassDeclaration,
  imports: AngularImportInfo,
): ts.Decorator | undefined {
  const modifiers = ts.getDecorators(node)
  if (!modifiers) return undefined

  for (const decorator of modifiers) {
    if (ts.isCallExpression(decorator.expression)) {
      if (isComponentDecorator(decorator.expression.expression, imports)) {
        return decorator
      }
    }
  }
  return undefined
}

/**
 * Extract metadata from @Component decorator.
 */
function extractFromDecorator(
  decorator: ts.Decorator,
  className: string,
  sourceFile: ts.SourceFile,
  classNode: ts.ClassDeclaration,
  angularImports: AngularImportInfo,
): TsExtractedComponentMetadata | null {
  if (!ts.isCallExpression(decorator.expression)) {
    return null
  }

  const args = decorator.expression.arguments
  if (args.length === 0 || !ts.isObjectLiteralExpression(args[0])) {
    return null
  }

  const obj = args[0]
  const metadata: TsExtractedComponentMetadata = {
    className,
    styles: [],
    styleUrls: [],
    imports: [],
    schemas: [],
    hostDirectives: [],
  }

  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) {
      continue
    }

    const propName = prop.name.text
    const value = prop.initializer

    switch (propName) {
      case 'selector':
        metadata.selector = extractStringLiteral(value)
        break

      case 'template':
        metadata.template = extractStringLiteral(value)
        break

      case 'templateUrl':
        metadata.templateUrl = extractStringLiteral(value)
        break

      case 'styles':
        metadata.styles = extractStringArray(value)
        break

      case 'styleUrls':
        metadata.styleUrls = extractStringArray(value)
        break

      case 'styleUrl':
        const styleUrl = extractStringLiteral(value)
        if (styleUrl) {
          metadata.styleUrls.push(styleUrl)
        }
        break

      case 'standalone':
        metadata.standalone = extractBoolean(value)
        break

      case 'encapsulation':
        metadata.encapsulation = extractViewEncapsulation(value, sourceFile)
        break

      case 'changeDetection':
        metadata.changeDetection = extractChangeDetection(value, sourceFile)
        break

      case 'host':
        metadata.host = extractHostMetadata(value, sourceFile)
        break

      case 'imports':
        metadata.imports = extractImportsArray(value, sourceFile)
        break

      case 'exportAs':
        metadata.exportAs = extractStringLiteral(value)
        break

      case 'preserveWhitespaces':
        metadata.preserveWhitespaces = extractBoolean(value)
        break

      case 'providers':
        metadata.providers = value.getText(sourceFile)
        break

      case 'viewProviders':
        metadata.viewProviders = value.getText(sourceFile)
        break

      case 'animations':
        metadata.animations = value.getText(sourceFile)
        break

      case 'schemas':
        metadata.schemas = extractSchemas(value, sourceFile)
        break

      case 'hostDirectives':
        metadata.hostDirectives = extractHostDirectives(value, sourceFile)
        break
    }
  }

  // Extract @HostBinding and @HostListener decorators from class members
  // and merge them with any host metadata from the decorator
  metadata.host = extractHostDecoratorsFromClass(
    classNode,
    angularImports,
    metadata.host,
    sourceFile,
  )

  // Extract @Input, @Output, @ViewChild, @ViewChildren, @ContentChild, @ContentChildren
  // decorators from class members
  const ioq = extractInputsOutputsQueriesFromClass(classNode, angularImports, sourceFile)
  if (Object.keys(ioq.inputs).length > 0) {
    metadata.inputs = ioq.inputs
  }
  if (Object.keys(ioq.outputs).length > 0) {
    metadata.outputs = ioq.outputs
  }
  if (ioq.queries.length > 0) {
    metadata.queries = ioq.queries
  }
  if (ioq.viewQueries.length > 0) {
    metadata.viewQueries = ioq.viewQueries
  }

  return metadata
}

/**
 * Extract a string literal value.
 */
function extractStringLiteral(node: ts.Expression): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text
  }
  if (ts.isTemplateExpression(node)) {
    // For template strings with expressions, we get the full text
    // This is a simplification - real extraction would need to handle expressions
    let result = node.head.text
    for (const span of node.templateSpans) {
      result += '${...}' + span.literal.text
    }
    return result
  }
  return undefined
}

/**
 * Extract an array of string literals.
 */
function extractStringArray(node: ts.Expression): string[] {
  if (!ts.isArrayLiteralExpression(node)) {
    return []
  }
  const result: string[] = []
  for (const elem of node.elements) {
    const str = extractStringLiteral(elem)
    if (str !== undefined) {
      result.push(str)
    }
  }
  return result
}

/**
 * Extract a boolean value.
 */
function extractBoolean(node: ts.Expression): boolean | undefined {
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false
  }
  return undefined
}

/**
 * Extract ViewEncapsulation enum value.
 */
function extractViewEncapsulation(
  node: ts.Expression,
  _sourceFile: ts.SourceFile,
): string | undefined {
  if (ts.isPropertyAccessExpression(node)) {
    const propName = node.name.text
    if (propName === 'None' || propName === 'Emulated' || propName === 'ShadowDom') {
      return propName
    }
  }
  return undefined
}

/**
 * Extract ChangeDetectionStrategy enum value.
 */
function extractChangeDetection(
  node: ts.Expression,
  _sourceFile: ts.SourceFile,
): string | undefined {
  if (ts.isPropertyAccessExpression(node)) {
    const propName = node.name.text
    if (propName === 'Default' || propName === 'OnPush') {
      return propName
    }
  }
  return undefined
}

/**
 * Extract host metadata from object literal.
 */
function extractHostMetadata(
  node: ts.Expression,
  sourceFile: ts.SourceFile,
): TsExtractedHostMetadata | undefined {
  if (!ts.isObjectLiteralExpression(node)) {
    return undefined
  }

  const properties: string[][] = []
  const attributes: string[][] = []
  const listeners: string[][] = []
  let classAttr: string | undefined
  let styleAttr: string | undefined

  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) {
      continue
    }

    let key: string
    if (ts.isIdentifier(prop.name)) {
      key = prop.name.text
    } else if (ts.isStringLiteral(prop.name)) {
      key = prop.name.text
    } else if (ts.isComputedPropertyName(prop.name)) {
      // Skip computed properties
      continue
    } else {
      continue
    }

    // Use ?? instead of || to handle empty strings correctly
    const value = extractStringLiteral(prop.initializer) ?? prop.initializer.getText(sourceFile)

    // Classify the host binding
    if (key === 'class') {
      classAttr = value
    } else if (key === 'style') {
      styleAttr = value
    } else if (key.startsWith('(') && key.endsWith(')')) {
      // Event listener
      listeners.push([key, value])
    } else if (key.startsWith('[') && key.endsWith(']')) {
      // Property binding
      properties.push([key, value])
    } else if (key.startsWith('@')) {
      // Animation trigger (treated as attribute in Angular's host binding classification)
      attributes.push([key, value])
    } else {
      // Static attribute
      attributes.push([key, value])
    }
  }

  return { properties, attributes, listeners, classAttr, styleAttr }
}

/**
 * Extract imports array (class names).
 */
function extractImportsArray(node: ts.Expression, _sourceFile: ts.SourceFile): string[] {
  if (!ts.isArrayLiteralExpression(node)) {
    return []
  }
  const result: string[] = []
  for (const elem of node.elements) {
    if (ts.isIdentifier(elem)) {
      result.push(elem.text)
    } else if (ts.isCallExpression(elem) && ts.isIdentifier(elem.expression)) {
      // forwardRef(() => SomeClass)
      if (elem.expression.text === 'forwardRef' && elem.arguments.length > 0) {
        const arg = elem.arguments[0]
        if (ts.isArrowFunction(arg) && ts.isIdentifier(arg.body)) {
          result.push(arg.body.text)
        }
      }
    }
  }
  return result
}

/**
 * Extract schemas array.
 */
function extractSchemas(node: ts.Expression, _sourceFile: ts.SourceFile): string[] {
  if (!ts.isArrayLiteralExpression(node)) {
    return []
  }
  const result: string[] = []
  for (const elem of node.elements) {
    if (ts.isIdentifier(elem)) {
      result.push(elem.text)
    }
  }
  return result
}

/**
 * Extract host directives array.
 */
function extractHostDirectives(
  node: ts.Expression,
  sourceFile: ts.SourceFile,
): TsExtractedHostDirective[] {
  if (!ts.isArrayLiteralExpression(node)) {
    return []
  }
  const result: TsExtractedHostDirective[] = []

  for (const elem of node.elements) {
    if (ts.isIdentifier(elem)) {
      // Simple directive reference
      result.push({
        directive: elem.text,
        inputs: [],
        outputs: [],
        isForwardReference: false,
      })
    } else if (ts.isObjectLiteralExpression(elem)) {
      // Object with directive, inputs, outputs
      const hd = extractHostDirectiveObject(elem, sourceFile)
      if (hd) {
        result.push(hd)
      }
    }
  }

  return result
}

/**
 * Extract a single host directive object.
 */
function extractHostDirectiveObject(
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
): TsExtractedHostDirective | null {
  let directive: string | undefined
  let inputs: string[][] = []
  let outputs: string[][] = []
  let isForwardReference = false

  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) {
      continue
    }

    const propName = prop.name.text
    const value = prop.initializer

    switch (propName) {
      case 'directive':
        if (ts.isIdentifier(value)) {
          directive = value.text
        } else if (ts.isCallExpression(value) && ts.isIdentifier(value.expression)) {
          if (value.expression.text === 'forwardRef' && value.arguments.length > 0) {
            isForwardReference = true
            const arg = value.arguments[0]
            if (ts.isArrowFunction(arg) && ts.isIdentifier(arg.body)) {
              directive = arg.body.text
            }
          }
        }
        break

      case 'inputs':
        inputs = extractMappingsArray(value, sourceFile)
        break

      case 'outputs':
        outputs = extractMappingsArray(value, sourceFile)
        break
    }
  }

  if (!directive) {
    return null
  }

  return { directive, inputs, outputs, isForwardReference }
}

/**
 * Extract input/output mappings array.
 */
function extractMappingsArray(node: ts.Expression, _sourceFile: ts.SourceFile): string[][] {
  if (!ts.isArrayLiteralExpression(node)) {
    return []
  }
  const result: string[][] = []

  for (const elem of node.elements) {
    if (ts.isStringLiteral(elem)) {
      // Simple string: same public and internal name
      result.push([elem.text, elem.text])
    } else if (ts.isObjectLiteralExpression(elem)) {
      // Object mapping: { publicName: 'internalName' }
      for (const prop of elem.properties) {
        if (ts.isPropertyAssignment(prop)) {
          let key: string | undefined
          if (ts.isIdentifier(prop.name)) {
            key = prop.name.text
          } else if (ts.isStringLiteral(prop.name)) {
            key = prop.name.text
          }
          const value = extractStringLiteral(prop.initializer)
          if (key && value) {
            result.push([key, value])
          }
        }
      }
    }
  }

  return result
}

/**
 * Validate Oxc extraction against TypeScript extraction.
 */
export function validateExtraction(
  oxcMetadata: {
    className: string
    selector?: string | null
    template?: string | null
    templateUrl?: string | null
    styles: string[]
    styleUrls: string[]
    standalone: boolean
    encapsulation: string
    changeDetection: string
    host?: {
      properties: string[][]
      attributes: string[][]
      listeners: string[][]
      classAttr?: string | null
      styleAttr?: string | null
    } | null
    imports: string[]
    exportAs?: string | null
    preserveWhitespaces: boolean
    providers?: string | null
    viewProviders?: string | null
    animations?: string | null
    schemas: string[]
    hostDirectives: Array<{
      directive: string
      inputs: string[][]
      outputs: string[][]
      isForwardReference: boolean
    }>
  },
  tsMetadata: TsExtractedComponentMetadata,
): ExtractionValidationResult {
  const mismatches: string[] = []

  // Compare selector
  if (normalize(oxcMetadata.selector) !== normalize(tsMetadata.selector)) {
    mismatches.push(`selector: Oxc="${oxcMetadata.selector}" vs TS="${tsMetadata.selector}"`)
  }

  // Compare template
  if (normalize(oxcMetadata.template) !== normalize(tsMetadata.template)) {
    const oxcTrunc = truncate(oxcMetadata.template, 50)
    const tsTrunc = truncate(tsMetadata.template, 50)
    mismatches.push(`template: Oxc="${oxcTrunc}" vs TS="${tsTrunc}"`)
  }

  // Compare templateUrl
  if (normalize(oxcMetadata.templateUrl) !== normalize(tsMetadata.templateUrl)) {
    mismatches.push(
      `templateUrl: Oxc="${oxcMetadata.templateUrl}" vs TS="${tsMetadata.templateUrl}"`,
    )
  }

  // Compare styles (order matters)
  if (!arraysEqual(oxcMetadata.styles, tsMetadata.styles)) {
    mismatches.push(
      `styles: Oxc has ${oxcMetadata.styles.length} vs TS has ${tsMetadata.styles.length}`,
    )
  }

  // Compare styleUrls (order matters)
  if (!arraysEqual(oxcMetadata.styleUrls, tsMetadata.styleUrls)) {
    mismatches.push(
      `styleUrls: Oxc=${JSON.stringify(oxcMetadata.styleUrls)} vs TS=${JSON.stringify(tsMetadata.styleUrls)}`,
    )
  }

  // Compare standalone (note: TS extraction may be undefined if not specified)
  if (tsMetadata.standalone !== undefined && oxcMetadata.standalone !== tsMetadata.standalone) {
    mismatches.push(`standalone: Oxc=${oxcMetadata.standalone} vs TS=${tsMetadata.standalone}`)
  }

  // Compare encapsulation
  if (tsMetadata.encapsulation && oxcMetadata.encapsulation !== tsMetadata.encapsulation) {
    mismatches.push(
      `encapsulation: Oxc="${oxcMetadata.encapsulation}" vs TS="${tsMetadata.encapsulation}"`,
    )
  }

  // Compare changeDetection
  if (tsMetadata.changeDetection && oxcMetadata.changeDetection !== tsMetadata.changeDetection) {
    mismatches.push(
      `changeDetection: Oxc="${oxcMetadata.changeDetection}" vs TS="${tsMetadata.changeDetection}"`,
    )
  }

  // Compare exportAs
  if (normalize(oxcMetadata.exportAs) !== normalize(tsMetadata.exportAs)) {
    mismatches.push(`exportAs: Oxc="${oxcMetadata.exportAs}" vs TS="${tsMetadata.exportAs}"`)
  }

  // Compare preserveWhitespaces
  if (
    tsMetadata.preserveWhitespaces !== undefined &&
    oxcMetadata.preserveWhitespaces !== tsMetadata.preserveWhitespaces
  ) {
    mismatches.push(
      `preserveWhitespaces: Oxc=${oxcMetadata.preserveWhitespaces} vs TS=${tsMetadata.preserveWhitespaces}`,
    )
  }

  // Compare imports (order may differ, compare as sets)
  if (!setsEqual(oxcMetadata.imports, tsMetadata.imports)) {
    mismatches.push(
      `imports: Oxc=${JSON.stringify(oxcMetadata.imports)} vs TS=${JSON.stringify(tsMetadata.imports)}`,
    )
  }

  // Compare schemas (order may differ, compare as sets)
  if (!setsEqual(oxcMetadata.schemas, tsMetadata.schemas)) {
    mismatches.push(
      `schemas: Oxc=${JSON.stringify(oxcMetadata.schemas)} vs TS=${JSON.stringify(tsMetadata.schemas)}`,
    )
  }

  // Compare host metadata
  if (oxcMetadata.host || tsMetadata.host) {
    const hostMismatches = compareHostMetadata(oxcMetadata.host, tsMetadata.host)
    mismatches.push(...hostMismatches)
  }

  // Compare host directives
  const hdMismatches = compareHostDirectives(oxcMetadata.hostDirectives, tsMetadata.hostDirectives)
  mismatches.push(...hdMismatches)

  // Compare providers (using AST normalization to ignore formatting differences)
  if (
    normalizeExpressionAst(oxcMetadata.providers) !== normalizeExpressionAst(tsMetadata.providers)
  ) {
    const oxcProv = truncate(oxcMetadata.providers, 80)
    const tsProv = truncate(tsMetadata.providers, 80)
    mismatches.push(`providers: Oxc="${oxcProv}" vs TS="${tsProv}"`)
  }

  // Compare viewProviders (using AST normalization to ignore formatting differences)
  if (
    normalizeExpressionAst(oxcMetadata.viewProviders) !==
    normalizeExpressionAst(tsMetadata.viewProviders)
  ) {
    const oxcVP = truncate(oxcMetadata.viewProviders, 80)
    const tsVP = truncate(tsMetadata.viewProviders, 80)
    mismatches.push(`viewProviders: Oxc="${oxcVP}" vs TS="${tsVP}"`)
  }

  // Compare animations (using AST normalization to ignore formatting differences)
  if (
    normalizeExpressionAst(oxcMetadata.animations) !== normalizeExpressionAst(tsMetadata.animations)
  ) {
    const oxcAnim = truncate(oxcMetadata.animations, 80)
    const tsAnim = truncate(tsMetadata.animations, 80)
    mismatches.push(`animations: Oxc="${oxcAnim}" vs TS="${tsAnim}"`)
  }

  return {
    matches: mismatches.length === 0,
    mismatches,
    className: oxcMetadata.className,
  }
}

/**
 * Normalize a value for comparison.
 */
function normalize(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  return value
}

/**
 * Truncate a string for display.
 */
function truncate(value: string | null | undefined, maxLen: number): string {
  if (!value) return ''
  if (value.length <= maxLen) return value
  return value.substring(0, maxLen) + '...'
}

/**
 * Compare two string arrays for equality.
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Compare two string arrays as sets.
 */
function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setA = new Set(a)
  const setB = new Set(b)
  for (const item of setA) {
    if (!setB.has(item)) return false
  }
  return true
}

/**
 * Check if host metadata is effectively empty.
 * A host is empty if all arrays are empty and no special attributes are set.
 */
function isHostEmpty(
  host:
    | {
        properties: string[][]
        attributes: string[][]
        listeners: string[][]
        classAttr?: string | null
        styleAttr?: string | null
      }
    | null
    | undefined,
): boolean {
  if (!host) return true
  return (
    host.properties.length === 0 &&
    host.attributes.length === 0 &&
    host.listeners.length === 0 &&
    !host.classAttr &&
    !host.styleAttr
  )
}

/**
 * Compare host metadata.
 */
function compareHostMetadata(
  oxcHost:
    | {
        properties: string[][]
        attributes: string[][]
        listeners: string[][]
        classAttr?: string | null
        styleAttr?: string | null
      }
    | null
    | undefined,
  tsHost: TsExtractedHostMetadata | undefined,
): string[] {
  const mismatches: string[] = []

  // Normalize empty host to undefined for comparison
  const oxcHostNorm = isHostEmpty(oxcHost) ? undefined : oxcHost
  const tsHostNorm = isHostEmpty(tsHost) ? undefined : tsHost

  if (!oxcHostNorm && !tsHostNorm) {
    return mismatches
  }

  if (!oxcHostNorm && tsHostNorm) {
    mismatches.push('host: Oxc has none, TS has host metadata')
    return mismatches
  }

  if (oxcHostNorm && !tsHostNorm) {
    mismatches.push('host: Oxc has host metadata, TS has none')
    return mismatches
  }

  // Both exist, compare
  if (!pairsEqual(oxcHostNorm!.properties, tsHostNorm!.properties)) {
    mismatches.push(`host.properties: mismatch`)
  }
  if (!pairsEqual(oxcHostNorm!.attributes, tsHostNorm!.attributes)) {
    mismatches.push(`host.attributes: mismatch`)
  }
  if (!pairsEqual(oxcHostNorm!.listeners, tsHostNorm!.listeners)) {
    mismatches.push(`host.listeners: mismatch`)
  }
  if (normalize(oxcHostNorm!.classAttr) !== normalize(tsHostNorm!.classAttr)) {
    mismatches.push(
      `host.classAttr: Oxc="${oxcHostNorm!.classAttr}" vs TS="${tsHostNorm!.classAttr}"`,
    )
  }
  if (normalize(oxcHostNorm!.styleAttr) !== normalize(tsHostNorm!.styleAttr)) {
    mismatches.push(
      `host.styleAttr: Oxc="${oxcHostNorm!.styleAttr}" vs TS="${tsHostNorm!.styleAttr}"`,
    )
  }

  return mismatches
}

/**
 * Compare arrays of string pairs.
 */
function pairsEqual(a: string[][], b: string[][]): boolean {
  if (a.length !== b.length) return false
  // Sort both for comparison (order may differ)
  const sortedA = [...a].sort((x, y) => x[0].localeCompare(y[0]))
  const sortedB = [...b].sort((x, y) => x[0].localeCompare(y[0]))
  for (let i = 0; i < sortedA.length; i++) {
    if (sortedA[i][0] !== sortedB[i][0] || sortedA[i][1] !== sortedB[i][1]) {
      return false
    }
  }
  return true
}

/**
 * Compare host directives arrays.
 */
function compareHostDirectives(
  oxcHd: Array<{
    directive: string
    inputs: string[][]
    outputs: string[][]
    isForwardReference: boolean
  }>,
  tsHd: TsExtractedHostDirective[],
): string[] {
  const mismatches: string[] = []

  if (oxcHd.length !== tsHd.length) {
    mismatches.push(`hostDirectives: Oxc has ${oxcHd.length}, TS has ${tsHd.length}`)
    return mismatches
  }

  // Compare in order
  for (let i = 0; i < oxcHd.length; i++) {
    const oxc = oxcHd[i]
    const ts = tsHd[i]

    if (oxc.directive !== ts.directive) {
      mismatches.push(
        `hostDirectives[${i}].directive: Oxc="${oxc.directive}" vs TS="${ts.directive}"`,
      )
    }
    if (oxc.isForwardReference !== ts.isForwardReference) {
      mismatches.push(
        `hostDirectives[${i}].isForwardReference: Oxc=${oxc.isForwardReference} vs TS=${ts.isForwardReference}`,
      )
    }
    if (!pairsEqual(oxc.inputs, ts.inputs)) {
      mismatches.push(`hostDirectives[${i}].inputs: mismatch`)
    }
    if (!pairsEqual(oxc.outputs, ts.outputs)) {
      mismatches.push(`hostDirectives[${i}].outputs: mismatch`)
    }
  }

  return mismatches
}
