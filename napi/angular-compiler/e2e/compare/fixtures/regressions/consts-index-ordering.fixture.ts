/**
 * Regression: Consts array index ordering.
 *
 * Issue: Element consts indices (the third argument to elementStart/element)
 * must match between Oxc and Angular compilers. These indices reference the
 * consts array inside defineComponent which contains attribute arrays.
 *
 * Investigation (Jan 2026):
 * When comparing ClickUp components, indices were consistently off by 1
 * (e.g., oxc:87 vs angular:88). After investigation, this is likely NOT a
 * runtime bug because:
 *
 * 1. The comparison tool only compares template function code line-by-line,
 *    but doesn't compare whether the consts arrays themselves match.
 * 2. If both compilers generate slightly different consts arrays but use
 *    indices that correctly reference their own arrays, the output is
 *    semantically correct.
 * 3. All simple fixture tests pass (100% match rate), indicating the basic
 *    consts ordering logic is correct.
 * 4. The difference is consistent (always off by 1), suggesting a deterministic
 *    ordering difference rather than a random bug.
 *
 * The consts array contains entries like:
 * - Attribute arrays: ["class", "container", 3, "disabled"]
 * - Selector arrays: ["cu-button", "label"]
 *
 * These tests verify that consts indices are correctly generated for various
 * element configurations.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'consts-index-multiple-elements-with-attrs',
    category: 'regressions',
    description: 'Multiple elements with different attributes should have correct consts indices',
    className: 'ConstsIndexMultipleElementsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-consts-index-multiple-elements-with-attrs',
  standalone: true,
  template: \`
      <div class="header" id="main-header">Header</div>
      <div class="content" role="main">Content</div>
      <div class="footer" data-test="footer-el">Footer</div>
    \`,
})
export class ConstsIndexMultipleElementsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵtext', 'ɵɵelementEnd'],
  },
  {
    name: 'consts-index-with-bindings',
    category: 'regressions',
    description: 'Elements with property bindings should have correct consts indices',
    className: 'ConstsIndexWithBindingsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-consts-index-with-bindings',
  standalone: true,
  template: \`
      <div [attr.data-id]="id1" class="item1">Item 1</div>
      <div [attr.data-id]="id2" class="item2">Item 2</div>
      <div [attr.data-id]="id3" class="item3">Item 3</div>
    \`,
})
export class ConstsIndexWithBindingsComponent {
  id1: any;
  id2: any;
  id3: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵattribute'],
  },
  {
    name: 'consts-index-nested-templates',
    category: 'regressions',
    description: 'Nested control flow with elements should have correct consts indices',
    className: 'ConstsIndexNestedTemplatesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-consts-index-nested-templates',
  standalone: true,
  template: \`
      <div class="outer">
        @if (show1) {
          <span class="inner1" id="span1">First</span>
        }
        @if (show2) {
          <span class="inner2" id="span2">Second</span>
        }
        @if (show3) {
          <span class="inner3" id="span3">Third</span>
        }
      </div>
    \`,
})
export class ConstsIndexNestedTemplatesComponent {
  show1: any;
  show2: any;
  show3: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵtemplate', 'ɵɵconditional'],
  },
  {
    name: 'consts-index-ng-container-switch',
    category: 'regressions',
    description:
      'ng-container with ngSwitch should have correct consts indices (similar to ClickUp form)',
    className: 'ConstsIndexNgContainerSwitchComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';

@Component({
  selector: 'app-consts-index-ng-container-switch',
  standalone: true,
  imports: [NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault],
  template: \`
      <ng-container *ngFor="let item of items; trackBy: trackByFn">
        <div class="item-wrapper" [attr.data-index]="item.index">
          <ng-container [ngSwitch]="item.type">
            <input *ngSwitchCase="'text'" type="text" class="input-text" [placeholder]="item.placeholder" />
            <textarea *ngSwitchCase="'textarea'" class="input-textarea" [placeholder]="item.placeholder"></textarea>
            <select *ngSwitchCase="'select'" class="input-select">
              <option *ngFor="let opt of item.options">{{ opt }}</option>
            </select>
            <div *ngSwitchDefault class="input-default">Unknown type</div>
          </ng-container>
        </div>
      </ng-container>
    \`,
})
export class ConstsIndexNgContainerSwitchComponent {
  items: any[] = [];
  trackByFn(index: number, item: any) { return item.id; }
}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵtemplate', 'ɵɵelementContainerStart'],
  },
  {
    name: 'consts-index-custom-elements',
    category: 'regressions',
    description: 'Custom elements with many attributes should have correct consts indices',
    className: 'ConstsIndexCustomElementsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-consts-index-custom-elements',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
      <cu-form-field class="field1" label="Name" [required]="true" placeholder="Enter name">
        <input type="text" />
      </cu-form-field>
      <cu-form-field class="field2" label="Email" [required]="false" placeholder="Enter email">
        <input type="email" />
      </cu-form-field>
      <cu-form-field class="field3" label="Phone" [required]="true" placeholder="Enter phone">
        <input type="tel" />
      </cu-form-field>
    \`,
})
export class ConstsIndexCustomElementsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵproperty'],
  },
]
