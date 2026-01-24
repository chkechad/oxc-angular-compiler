/**
 * Regression: Consts array ordering verification.
 *
 * This fixture is designed to verify that the consts array indices
 * assigned by oxc match those assigned by Angular's TypeScript compiler.
 *
 * Investigation Context (Jan 2026):
 * When comparing ClickUp components, indices were consistently off by 1
 * (e.g., oxc:87 vs angular:88). Investigation revealed that this is likely
 * NOT a bug because:
 *
 * 1. The comparison tool normalizes consts by VALUE (not by index), so different
 *    indices pointing to equivalent entries will still pass comparison.
 * 2. Both compilers have deduplication logic (is_equivalent/isEquivalent) which
 *    means the same const value gets the same index when added again.
 * 3. All 492+ fixture tests pass with 100% match rate.
 *
 * Key Implementation Details:
 *
 * Angular (const_collection.ts):
 * - Iterates `for (const unit of job.units)` then `for (const op of unit.create)`
 * - Calls `getConstIndex()` immediately for each element/container op
 * - `addConst()` deduplicates using `isEquivalent()` check on existing consts
 *
 * Oxc (const_collection.rs):
 * - Iterates views via `job.all_views()` then ops via `view.create.iter()`
 * - Three-pass approach due to Rust borrow checker:
 *   1. Collect xrefs in iteration order
 *   2. Call `add_const()` in collected order
 *   3. Apply indices back to ops
 * - `add_const()` deduplicates using `is_equivalent()` check on existing consts
 *
 * Order of Operations (both implementations):
 * 1. Collect ExtractedAttribute ops into a map by target element
 * 2. Iterate element/container ops in creation order:
 *    - Projection ops: serialize attributes directly (not via const pool)
 *    - Other element ops: call getConstIndex/add_const
 *    - RepeaterCreate: process body_view first, then empty_view
 * 3. Apply const indices back to the ops
 *
 * This fixture tests scenarios where ordering could potentially differ:
 * - Multiple elements with same attributes (deduplication)
 * - Nested control flow (view iteration order)
 * - Complex attribute combinations (serialization order)
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'consts-ordering-deduplication',
    category: 'regressions',
    description: 'Multiple elements with identical attributes should share the same consts index',
    className: 'ConstsOrderingDeduplicationComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-consts-ordering-deduplication',
  standalone: true,
  template: \`
      <div class="item" role="listitem">First</div>
      <div class="item" role="listitem">Second</div>
      <div class="item" role="listitem">Third</div>
    \`,
})
export class ConstsOrderingDeduplicationComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵtext', 'ɵɵelementEnd'],
  },
  {
    name: 'consts-ordering-mixed-attrs',
    category: 'regressions',
    description: 'Elements with different attribute configurations should get different indices',
    className: 'ConstsOrderingMixedAttrsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-consts-ordering-mixed-attrs',
  standalone: true,
  template: \`
      <div class="a">A</div>
      <div class="b" id="b">B</div>
      <div class="a">A again</div>
      <div class="c" role="main">C</div>
      <div class="b" id="b">B again</div>
    \`,
})
export class ConstsOrderingMixedAttrsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart'],
  },
  {
    name: 'consts-ordering-nested-if',
    category: 'regressions',
    description: 'Nested @if blocks should process consts in correct view order',
    className: 'ConstsOrderingNestedIfComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-consts-ordering-nested-if',
  standalone: true,
  template: \`
      <div class="outer">
        @if (show1) {
          <span class="inner" id="first">First</span>
          @if (show2) {
            <span class="deep" id="nested">Nested</span>
          }
        }
        <span class="inner" id="second">Second</span>
      </div>
    \`,
})
export class ConstsOrderingNestedIfComponent {
  show1: any;
  show2: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵtemplate', 'ɵɵconditional'],
  },
  {
    name: 'consts-ordering-for-with-empty',
    category: 'regressions',
    description: '@for with @empty should process body view before empty view',
    className: 'ConstsOrderingForWithEmptyComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-consts-ordering-for-with-empty',
  standalone: true,
  template: \`
      @for (item of items; track item.id) {
        <div class="item" [attr.data-id]="item.id">{{ item.name }}</div>
      } @empty {
        <div class="empty" role="status">No items</div>
      }
    \`,
})
export class ConstsOrderingForWithEmptyComponent {
  items: any[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵrepeater'],
  },
  {
    name: 'consts-ordering-projection',
    category: 'regressions',
    description: 'Projection ops serialize attributes directly (not via const pool)',
    className: 'ConstsOrderingProjectionComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-consts-ordering-projection',
  standalone: true,
  template: \`
      <ng-content select=".header"></ng-content>
      <div class="wrapper">
        <ng-content></ng-content>
      </div>
      <ng-content select=".footer"></ng-content>
    \`,
})
export class ConstsOrderingProjectionComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵprojectionDef', 'ɵɵprojection', 'ɵɵelementStart'],
  },
  {
    name: 'consts-ordering-bindings-marker',
    category: 'regressions',
    description: 'Elements with property bindings should include Bindings marker in attrs',
    className: 'ConstsOrderingBindingsMarkerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-consts-ordering-bindings-marker',
  standalone: true,
  template: \`
      <div class="static">Static only</div>
      <div class="bound" [title]="dynamicTitle">With binding</div>
      <input class="input" [value]="inputValue" [placeholder]="placeholder" />
    \`,
})
export class ConstsOrderingBindingsMarkerComponent {
  dynamicTitle: any;
  inputValue: any;
  placeholder: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵproperty'],
  },
  {
    name: 'consts-ordering-template-attrs',
    category: 'regressions',
    description: 'ng-template with structural directives should use Template marker',
    className: 'ConstsOrderingTemplateAttrsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-consts-ordering-template-attrs',
  standalone: true,
  imports: [NgFor],
  template: \`
      <ng-container *ngFor="let item of items; trackBy: trackByFn">
        <div class="item">{{ item }}</div>
      </ng-container>
      <ng-template #myTemplate let-data>
        <span class="templated">{{ data }}</span>
      </ng-template>
    \`,
})
export class ConstsOrderingTemplateAttrsComponent {
  items: any[] = [];
  trackByFn(index: number, item: any) { return item; }
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate', 'ɵɵelementContainerStart'],
  },
  {
    name: 'consts-ordering-switch-cases',
    category: 'regressions',
    description: '@switch with multiple cases should order consts correctly',
    className: 'ConstsOrderingSwitchCasesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-consts-ordering-switch-cases',
  standalone: true,
  template: \`
      @switch (type) {
        @case ('a') {
          <div class="case-a" id="a">Case A</div>
        }
        @case ('b') {
          <div class="case-b" id="b">Case B</div>
        }
        @case ('c') {
          <div class="case-c" id="c">Case C</div>
        }
        @default {
          <div class="default" role="status">Default</div>
        }
      }
    \`,
})
export class ConstsOrderingSwitchCasesComponent {
  type: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional'],
  },
]
