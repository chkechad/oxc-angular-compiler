/**
 * Advanced content projection with ng-content selectors.
 *
 * Tests various ng-content selector patterns including:
 * - Attribute selectors ([header], [slot="name"])
 * - Class selectors (.footer, .nav-item)
 * - Element selectors (app-header, custom-element)
 * - Compound selectors (button.primary, div[role="alert"])
 * - Multiple selectors (h1,h2,h3)
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'content-projection-named-slots',
    category: 'edge-cases',
    description: 'Named slots with slot attribute selector',
    className: 'ContentProjectionNamedSlotsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-content-projection-named-slots',
  standalone: true,
  template: \`
      <div class="modal">
        <div class="modal-header">
          <ng-content select="[slot='header']"></ng-content>
        </div>
        <div class="modal-body">
          <ng-content select="[slot='body']"></ng-content>
        </div>
        <div class="modal-footer">
          <ng-content select="[slot='footer']"></ng-content>
        </div>
        <ng-content></ng-content>
      </div>
    \`,
})
export class ContentProjectionNamedSlotsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'content-projection-class-selectors',
    category: 'edge-cases',
    description: 'Class-based content slot selectors',
    className: 'ContentProjectionClassSelectorsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-content-projection-class-selectors',
  standalone: true,
  template: \`
      <nav>
        <ng-content select=".nav-brand"></ng-content>
        <ng-content select=".nav-items"></ng-content>
        <ng-content select=".nav-actions"></ng-content>
      </nav>
    \`,
})
export class ContentProjectionClassSelectorsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'content-projection-element-selectors',
    category: 'edge-cases',
    description: 'Element tag name selectors',
    className: 'ContentProjectionElementSelectorsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-content-projection-element-selectors',
  standalone: true,
  template: \`
      <article>
        <ng-content select="app-article-header"></ng-content>
        <ng-content select="app-article-meta"></ng-content>
        <ng-content select="app-article-content"></ng-content>
        <ng-content select="app-article-footer"></ng-content>
      </article>
    \`,
})
export class ContentProjectionElementSelectorsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'content-projection-compound-selectors',
    category: 'edge-cases',
    description: 'Compound CSS selectors for ng-content',
    className: 'ContentProjectionCompoundSelectorsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-content-projection-compound-selectors',
  standalone: true,
  template: \`
      <div class="button-group">
        <ng-content select="button.primary"></ng-content>
        <ng-content select="button.secondary"></ng-content>
        <ng-content select="a[role='button']"></ng-content>
        <ng-content select="button:not(.primary):not(.secondary)"></ng-content>
      </div>
    \`,
})
export class ContentProjectionCompoundSelectorsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'content-projection-multi-selectors',
    category: 'edge-cases',
    description: 'Multiple selectors in single ng-content',
    className: 'ContentProjectionMultiSelectorsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-content-projection-multi-selectors',
  standalone: true,
  template: \`
      <header>
        <ng-content select="h1,h2,h3,h4,h5,h6"></ng-content>
      </header>
      <main>
        <ng-content select="p,div,section,article"></ng-content>
      </main>
      <aside>
        <ng-content select="nav,menu,aside"></ng-content>
      </aside>
    \`,
})
export class ContentProjectionMultiSelectorsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'content-projection-data-attributes',
    category: 'edge-cases',
    description: 'Data attribute selectors for slots',
    className: 'ContentProjectionDataAttributesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-content-projection-data-attributes',
  standalone: true,
  template: \`
      <div class="grid">
        <div class="grid-area-1">
          <ng-content select="[data-grid-area='header']"></ng-content>
        </div>
        <div class="grid-area-2">
          <ng-content select="[data-grid-area='sidebar']"></ng-content>
        </div>
        <div class="grid-area-3">
          <ng-content select="[data-grid-area='main']"></ng-content>
        </div>
        <ng-content></ng-content>
      </div>
    \`,
})
export class ContentProjectionDataAttributesComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'content-projection-in-control-flow',
    category: 'edge-cases',
    description: 'ng-content inside control flow blocks',
    className: 'ContentProjectionInControlFlowComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-content-projection-in-control-flow',
  standalone: true,
  template: \`
      @if (showHeader) {
        <header>
          <ng-content select="[header]"></ng-content>
        </header>
      }
      @for (slot of dynamicSlots; track slot) {
        <section>
          <ng-content></ng-content>
        </section>
      }
    \`,
})
export class ContentProjectionInControlFlowComponent {
  showHeader = true;
  dynamicSlots: string[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef', 'ɵɵconditional', 'ɵɵrepeaterCreate'],
  },
  {
    name: 'content-projection-nested-components',
    category: 'edge-cases',
    description: 'Nested components with multiple projection levels',
    className: 'ContentProjectionNestedComponentsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-content-projection-nested-components',
  standalone: true,
  template: \`
      <div class="outer-wrapper">
        <div class="inner-header">
          <ng-content select="[outer-header]"></ng-content>
        </div>
        <div class="inner-body">
          <ng-content select="[outer-body]"></ng-content>
          <div class="nested">
            <ng-content select="[nested-content]"></ng-content>
          </div>
        </div>
        <ng-content></ng-content>
      </div>
    \`,
})
export class ContentProjectionNestedComponentsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
]
