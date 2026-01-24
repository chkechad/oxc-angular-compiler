/**
 * Content projection with ng-content.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'content-projection-basic',
    category: 'templates',
    description: 'Basic ng-content projection',
    className: 'ContentProjectionBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-content-projection-basic',
  standalone: true,
  template: \`
      <div class="container">
        <ng-content></ng-content>
      </div>
    \`,
})
export class ContentProjectionBasicComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'content-projection-select',
    category: 'templates',
    description: 'ng-content with selector',
    className: 'ContentProjectionSelectComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-content-projection-select',
  standalone: true,
  template: \`
      <header>
        <ng-content select="[header]"></ng-content>
      </header>
      <main>
        <ng-content select="[body]"></ng-content>
      </main>
      <footer>
        <ng-content select="[footer]"></ng-content>
      </footer>
    \`,
})
export class ContentProjectionSelectComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'content-projection-multiple',
    category: 'templates',
    description: 'Multiple ng-content slots',
    className: 'ContentProjectionMultipleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-content-projection-multiple',
  standalone: true,
  template: \`
      <div class="card">
        <div class="card-header">
          <ng-content select=".title"></ng-content>
        </div>
        <div class="card-body">
          <ng-content></ng-content>
        </div>
        <div class="card-footer">
          <ng-content select=".actions"></ng-content>
        </div>
      </div>
    \`,
})
export class ContentProjectionMultipleComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef'],
  },
  {
    name: 'content-projection-conditional',
    category: 'templates',
    description: 'Conditional content projection',
    className: 'ContentProjectionConditionalComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-content-projection-conditional',
  standalone: true,
  template: \`
      @if (showContent) {
        <div class="wrapper">
          <ng-content></ng-content>
        </div>
      } @else {
        <div class="placeholder">No content</div>
      }
    \`,
})
export class ContentProjectionConditionalComponent {
  showContent = true;
}
    `.trim(),
    expectedFeatures: ['ɵɵprojection', 'ɵɵprojectionDef', 'ɵɵconditional'],
  },
]
