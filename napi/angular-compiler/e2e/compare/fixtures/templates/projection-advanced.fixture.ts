/**
 * Advanced content projection with ngProjectAs.
 *
 * Tests the ngProjectAs attribute which allows elements to be projected
 * into ng-content slots that they wouldn't normally match.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'ng-project-as-attribute',
    category: 'templates',
    description: 'ngProjectAs with attribute selector',
    className: 'NgProjectAsAttributeComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ng-project-as-attribute',
  standalone: true,
  template: \`
      <div class="card">
        <ng-content select="[header]"></ng-content>
        <ng-content></ng-content>
      </div>
    \`,
})
export class NgProjectAsAttributeComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'ng-project-as-class',
    category: 'templates',
    description: 'ngProjectAs with class selector',
    className: 'NgProjectAsClassComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ng-project-as-class',
  standalone: true,
  template: \`
      <div class="layout">
        <aside>
          <ng-content select=".sidebar"></ng-content>
        </aside>
        <main>
          <ng-content select=".main-content"></ng-content>
        </main>
      </div>
    \`,
})
export class NgProjectAsClassComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'ng-project-as-element',
    category: 'templates',
    description: 'ngProjectAs with element selector',
    className: 'NgProjectAsElementComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ng-project-as-element',
  standalone: true,
  template: \`
      <header>
        <ng-content select="app-header"></ng-content>
      </header>
      <section>
        <ng-content select="app-content"></ng-content>
      </section>
    \`,
})
export class NgProjectAsElementComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'ng-project-as-complex',
    category: 'templates',
    description: 'ngProjectAs with complex compound selector',
    className: 'NgProjectAsComplexComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ng-project-as-complex',
  standalone: true,
  template: \`
      <div class="container">
        <ng-content select="[slot='header']"></ng-content>
        <ng-content select="[slot='body']"></ng-content>
        <ng-content select="[slot='footer']"></ng-content>
        <ng-content></ng-content>
      </div>
    \`,
})
export class NgProjectAsComplexComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'ng-project-as-multiple-slots',
    category: 'templates',
    description: 'Multiple ng-content slots with various selectors',
    className: 'NgProjectAsMultipleSlotsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ng-project-as-multiple-slots',
  standalone: true,
  template: \`
      <article>
        <header>
          <ng-content select="h1,h2,h3"></ng-content>
        </header>
        <div class="meta">
          <ng-content select=".author"></ng-content>
          <ng-content select=".date"></ng-content>
        </div>
        <div class="body">
          <ng-content></ng-content>
        </div>
      </article>
    \`,
})
export class NgProjectAsMultipleSlotsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'ng-project-as-nested',
    category: 'templates',
    description: 'Nested components with content projection',
    className: 'NgProjectAsNestedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ng-project-as-nested',
  standalone: true,
  template: \`
      <div class="outer">
        <ng-content select="[outer-slot]"></ng-content>
        <div class="inner">
          <ng-content select="[inner-slot]"></ng-content>
        </div>
      </div>
    \`,
})
export class NgProjectAsNestedComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
]
