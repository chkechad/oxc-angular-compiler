/**
 * Regression: domElementStart vs elementStart instruction selection.
 *
 * Angular uses different element instructions based on compilation mode:
 *
 * - DomOnly mode (domElementStart): When component is standalone with NO directive dependencies.
 *   This is an optimization that skips directive matching at runtime.
 *
 * - Full mode (elementStart): When component is NOT standalone OR has directive dependencies.
 *   This requires runtime directive matching.
 *
 * The decision is made in Angular's compiler.ts (lines 229-232):
 * ```
 * const compilationMode =
 *   meta.isStandalone && !meta.hasDirectiveDependencies
 *     ? TemplateCompilationMode.DomOnly
 *     : TemplateCompilationMode.Full;
 * ```
 *
 * Related files:
 * - Angular TS: compiler/src/render3/view/compiler.ts
 * - Angular TS: compiler/src/template/pipeline/src/phases/reify.ts
 * - Rust: crates/oxc_angular_compiler/src/pipeline/phases/reify/mod.rs
 * - Rust: crates/oxc_angular_compiler/src/pipeline/compilation.rs
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  // DomOnly mode fixtures - these should use domElementStart
  {
    name: 'dom-element-standalone-no-imports',
    category: 'regressions',
    description: 'Standalone component with no imports uses domElementStart',
    className: 'StandaloneNoImportsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-dom-element-standalone-no-imports',
  standalone: true,
  template: \`
      <div class="container">
        <span>Hello</span>
        <p>World</p>
      </div>
    \`,
})
export class StandaloneNoImportsComponent {}
    `.trim(),
    // standalone: true is the default for template-only fixtures
    // No imports means DomOnly mode
    expectedFeatures: ['ɵɵdomElementStart', 'ɵɵdomElementEnd'],
  },
  {
    name: 'dom-element-with-text-interpolation',
    category: 'regressions',
    description: 'DomOnly mode with text interpolation',
    className: 'DomElementWithTextComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-dom-element-with-text-interpolation',
  standalone: true,
  template: \`
      <div>{{ message }}</div>
      <span>Count: {{ count }}</span>
    \`,
})
export class DomElementWithTextComponent {
  message = '';
  count = 0;
}
    `.trim(),
    expectedFeatures: ['ɵɵdomElementStart', 'ɵɵtextInterpolate1'],
  },
  {
    name: 'dom-element-with-property-binding',
    category: 'regressions',
    description: 'DomOnly mode with property binding uses domProperty',
    className: 'DomElementWithPropertyComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-dom-element-with-property-binding',
  standalone: true,
  template: \`
      <div [id]="myId" [class]="myClass">Content</div>
    \`,
})
export class DomElementWithPropertyComponent {
  myId = '';
  myClass = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵdomElementStart', 'ɵɵdomProperty'],
  },
  {
    name: 'dom-element-in-control-flow',
    category: 'regressions',
    description: 'Elements in control flow blocks use domElementStart (blocks are always DomOnly)',
    className: 'DomElementInControlFlowComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-dom-element-in-control-flow',
  standalone: true,
  template: \`
      @if (show) {
        <div class="visible">Shown</div>
      }
      @for (item of items; track item.id) {
        <span>{{ item.name }}</span>
      }
    \`,
})
export class DomElementInControlFlowComponent {
  show = false;
  items: { id: number; name: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵdomElementStart', 'ɵɵconditional', 'ɵɵrepeaterCreate'],
  },

  // Full mode fixtures - these would use elementStart if the component had directive imports
  // Note: Template-only fixtures can't easily test Full mode since they don't compile imports
  // These fixtures document the expected behavior for reference
  {
    name: 'full-element-with-directive-import',
    category: 'regressions',
    description: 'Component with directive imports should use elementStart (Full mode)',
    className: 'FullElementWithDirectiveComponent',
    type: 'full-transform',
    sourceCode: `
import { Component, Directive } from '@angular/core';

@Directive({
  selector: '[myHighlight]',
  standalone: true
})
export class MyHighlightDirective {}

@Component({
  selector: 'app-full-element',
  standalone: true,
  imports: [MyHighlightDirective],
  template: \`
    <div myHighlight>Highlighted content</div>
    <p>Regular paragraph</p>
  \`
})
export class FullElementWithDirectiveComponent {}
    `.trim(),
    // When component has directive imports, Angular uses Full mode -> elementStart
    expectedFeatures: ['ɵɵelement'],
  },
  {
    name: 'full-element-non-standalone',
    category: 'regressions',
    description: 'Non-standalone component uses elementStart (Full mode)',
    className: 'NonStandaloneComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-non-standalone',
  standalone: false,
  template: \`<div class="content">Non-standalone</div>\`
})
export class NonStandaloneComponent {}
    `.trim(),
    // Non-standalone components use Full mode -> elementStart
    expectedFeatures: ['ɵɵelementStart'],
  },
]
