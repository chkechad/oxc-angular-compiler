/**
 * Regression: Style encapsulation ID should be unique or omitted.
 *
 * BUG: OXC generates `id: "c"` for all components with ViewEncapsulation.Emulated,
 * while Angular either generates unique IDs or omits the field entirely.
 *
 * Expected (Angular): No `id` field or unique ID per component
 * Actual (OXC): `id: "c"` for all components
 *
 * Runtime Impact: Style isolation may not work correctly when multiple components
 * have the same encapsulation ID - styles could leak between components.
 *
 * Found in: ClickUp comparison (138 files)
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'style-encapsulation-emulated-basic',
    category: 'regressions',
    description: 'Emulated encapsulation should have unique or no ID',
    className: 'EmulatedEncapsulationComponent',
    type: 'full-transform',
    sourceCode: `
import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-style-encapsulation-emulated-basic',
  standalone: true,
  template: \`<div class="styled">Content</div>\`,
  encapsulation: ViewEncapsulation.Emulated,
  styles: ['.styled { color: red; }'],
})
export class EmulatedEncapsulationComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefineComponent'],
  },
  {
    name: 'style-encapsulation-emulated-multiple',
    category: 'regressions',
    description: 'Multiple components with emulated encapsulation need unique IDs',
    className: 'FirstEmulatedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-style-encapsulation-emulated-multiple',
  standalone: true,
  template: \`<div class="first">First</div>\`,
  encapsulation: ViewEncapsulation.Emulated,
  styles: ['.first { color: blue; }'],
})
export class FirstEmulatedComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefineComponent'],
  },
  {
    name: 'style-encapsulation-none',
    category: 'regressions',
    description: 'None encapsulation should not have ID',
    className: 'NoneEncapsulationComponent',
    type: 'full-transform',
    sourceCode: `
import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-style-encapsulation-none',
  standalone: true,
  template: \`<div class="global">Global</div>\`,
  encapsulation: ViewEncapsulation.None,
  styles: ['.global { color: green; }'],
})
export class NoneEncapsulationComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefineComponent'],
  },
  {
    name: 'style-encapsulation-shadow-dom',
    category: 'regressions',
    description: 'ShadowDom encapsulation handling',
    className: 'ShadowDomComponent',
    type: 'full-transform',
    sourceCode: `
import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-style-encapsulation-shadow-dom',
  standalone: true,
  template: \`<div class="shadow">Shadow</div>\`,
  encapsulation: ViewEncapsulation.ShadowDom,
  styles: ['.shadow { color: purple; }'],
})
export class ShadowDomComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefineComponent'],
  },
]
