/**
 * Nested @defer blocks.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'defer-nested-basic',
    category: 'defer',
    description: 'Nested @defer blocks with different triggers',
    className: 'DeferNestedBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-nested-basic',
  standalone: true,
  template: \`
    @defer (on idle) {
      <div class="outer">
        <p>Outer deferred</p>
        @defer (on idle) {
          <div class="inner">Inner deferred</div>
        }
      </div>
    }
  \`,
})
export class DeferNestedBasicComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefer'],
  },
  {
    name: 'defer-in-conditional',
    category: 'defer',
    description: '@defer inside @if block',
    className: 'DeferInConditionalComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-in-conditional',
  standalone: true,
  template: \`
    @if (showContent) {
      @defer (on idle) {
        <div>Conditional deferred content</div>
      }
    }
  \`,
})
export class DeferInConditionalComponent {
  showContent = true;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵconditional'],
  },
  {
    name: 'defer-in-loop',
    category: 'defer',
    description: '@defer inside @for loop',
    className: 'DeferInLoopComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-in-loop',
  standalone: true,
  template: \`
    @for (item of items; track item.id) {
      @defer (on viewport) {
        <div>{{ item.name }}</div>
      } @placeholder {
        <span>Loading {{ $index }}...</span>
      }
    }
  \`,
})
export class DeferInLoopComponent {
  items = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ];
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵrepeaterCreate'],
  },
]
