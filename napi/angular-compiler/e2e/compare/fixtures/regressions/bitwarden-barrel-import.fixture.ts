/**
 * Regression fixture: Barrel import vs direct import for host directives
 *
 * This tests the difference in how oxc and ng resolve imports for host directives.
 * The difference is cosmetic - both produce working code, but:
 *
 * - oxc: Uses barrel imports (e.g., import * as i1 from "../a11y")
 * - ng: Uses direct file imports (e.g., import * as i1 from "../a11y/aria-disable.directive")
 *
 * Found in bitwarden-clients project in files like:
 * - button.component.ts
 * - icon-button.component.ts
 * - switch.component.ts
 *
 * Both import styles resolve to the same directive at runtime since
 * barrel files re-export the directive.
 */
import type { Fixture } from '../types.js'

const sourceCode = `
import { Component, Directive } from '@angular/core';

// Simulating a directive that would typically come from a barrel export
@Directive({
  selector: '[appHighlight]',
  standalone: true,
})
export class HighlightDirective {}

// Re-export barrel (in real code this would be in index.ts)
// export { HighlightDirective } from './highlight.directive';

@Component({
  selector: 'app-button',
  standalone: true,
  template: '<button>Click me</button>',
  hostDirectives: [HighlightDirective],
})
export class ButtonComponent {}
`.trim()

const fixture: Fixture = {
  type: 'full-transform',
  name: 'bitwarden-barrel-import',
  category: 'regressions',
  description:
    'Host directive import path differs between oxc (barrel) and ng (direct file) - cosmetic',
  className: 'ButtonComponent',
  sourceCode,
  expectedFeatures: ['ɵɵdefineComponent', 'ɵɵHostDirectivesFeature'],
  // This is a cosmetic difference - both outputs work correctly at runtime
  skip: false,
}

export const fixtures = [fixture]
