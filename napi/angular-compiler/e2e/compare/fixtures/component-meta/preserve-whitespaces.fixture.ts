/**
 * Whitespace preservation fixtures.
 *
 * Tests the preserveWhitespaces option:
 * - true: Keep all whitespace as-is
 * - false: Collapse/normalize whitespace (default behavior)
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'preserve-whitespaces-true',
    category: 'component-meta',
    description: 'preserveWhitespaces: true - keep all whitespace',
    className: 'PreserveWhitespacesTrueComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-preserve-whitespaces-true',
  standalone: true,
  template: \`<div>
  Hello   World
</div>\`,
  preserveWhitespaces: true,
})
export class PreserveWhitespacesTrueComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefineComponent', 'ɵɵtext'],
  },
  {
    name: 'preserve-whitespaces-false',
    category: 'component-meta',
    description: 'preserveWhitespaces: false - collapse whitespace',
    className: 'PreserveWhitespacesFalseComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-preserve-whitespaces-false',
  standalone: true,
  template: \`<div>
  Hello   World
</div>\`,
  preserveWhitespaces: false,
})
export class PreserveWhitespacesFalseComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefineComponent', 'ɵɵtext'],
  },
  {
    name: 'preserve-whitespaces-nested',
    category: 'component-meta',
    description: 'Whitespace preservation with nested elements',
    className: 'PreserveWhitespacesNestedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-preserve-whitespaces-nested',
  standalone: true,
  template: \`<div>
  <span>  First  </span>
  <span>  Second  </span>
</div>\`,
  preserveWhitespaces: true,
})
export class PreserveWhitespacesNestedComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefineComponent', 'ɵɵtext', 'ɵɵelementStart'],
  },
  {
    name: 'preserve-whitespaces-interpolation',
    category: 'component-meta',
    description: 'Whitespace preservation with interpolations',
    className: 'PreserveWhitespacesInterpolationComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-preserve-whitespaces-interpolation',
  standalone: true,
  template: \`<div>
  Hello   {{ name }}   World
</div>\`,
  preserveWhitespaces: true,
})
export class PreserveWhitespacesInterpolationComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefineComponent', 'ɵɵtextInterpolate'],
  },
]
