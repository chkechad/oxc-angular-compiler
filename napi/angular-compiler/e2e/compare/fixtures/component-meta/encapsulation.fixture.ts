/**
 * View encapsulation mode fixtures.
 *
 * Tests different encapsulation strategies:
 * - None: No style scoping (styles apply globally)
 * - Emulated: Default scoping with attribute selectors (default)
 * - ShadowDom: Native shadow DOM encapsulation
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'encapsulation-none',
    category: 'component-meta',
    description: 'ViewEncapsulation.None - no style scoping',
    className: 'EncapsulationNoneComponent',
    type: 'full-transform',
    sourceCode: `
import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-encapsulation-none',
  standalone: true,
  template: \`<div class="container">{{message}}</div>\`,
  encapsulation: ViewEncapsulation.None,
})
export class EncapsulationNoneComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefineComponent'],
  },
  {
    name: 'encapsulation-emulated',
    category: 'component-meta',
    description: 'ViewEncapsulation.Emulated - default scoping with attribute selectors',
    className: 'EncapsulationEmulatedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-encapsulation-emulated',
  standalone: true,
  template: \`<div class="container">{{message}}</div>\`,
  encapsulation: ViewEncapsulation.Emulated,
})
export class EncapsulationEmulatedComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefineComponent'],
  },
  {
    name: 'encapsulation-shadow-dom',
    category: 'component-meta',
    description: 'ViewEncapsulation.ShadowDom - native shadow DOM',
    className: 'EncapsulationShadowDomComponent',
    type: 'full-transform',
    sourceCode: `
import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-encapsulation-shadow-dom',
  standalone: true,
  template: \`<div class="container">{{message}}</div>\`,
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class EncapsulationShadowDomComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefineComponent'],
  },
]
