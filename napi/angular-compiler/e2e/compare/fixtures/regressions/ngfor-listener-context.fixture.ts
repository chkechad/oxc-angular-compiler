/**
 * Regression: Loop variables in event handlers.
 *
 * Issue: Variables from @for loop ($index, item, etc.) must be
 * correctly captured in event listener closures.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'for-listener-item',
    category: 'regressions',
    description: 'Loop item in click handler',
    className: 'ForListenerItemComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-for-listener-item',
  standalone: true,
  template: \`
      @for (item of items; track item.id) {
        <button (click)="select(item)">{{ item.name }}</button>
      }
    \`,
})
export class ForListenerItemComponent {
  items: { id: number; name: string }[] = [];
  select(item: { id: number; name: string }) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵlistener'],
  },
  {
    name: 'for-listener-index',
    category: 'regressions',
    description: 'Loop index in event handler',
    className: 'ForListenerIndexComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-for-listener-index',
  standalone: true,
  template: \`
      @for (item of items; track item.id; let idx = $index) {
        <button (click)="remove(idx)">Remove #{{ idx }}</button>
      }
    \`,
})
export class ForListenerIndexComponent {
  items: { id: number }[] = [];
  remove(idx: number) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵlistener'],
  },
  {
    name: 'for-listener-multiple-vars',
    category: 'regressions',
    description: 'Multiple loop variables in handler',
    className: 'ForListenerMultipleVarsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-for-listener-multiple-vars',
  standalone: true,
  template: \`
      @for (item of items; track item.id; let i = $index, first = $first) {
        <div (click)="handleClick(item, i, first)">
          {{ i }}: {{ item.name }}
        </div>
      }
    \`,
})
export class ForListenerMultipleVarsComponent {
  items: { id: number; name: string }[] = [];
  handleClick(item: { id: number; name: string }, i: number, first: boolean) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵlistener'],
  },
  {
    name: 'for-nested-listener',
    category: 'regressions',
    description: 'Nested loop variables in handlers',
    className: 'ForNestedListenerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-for-nested-listener',
  standalone: true,
  template: \`
      @for (group of groups; track group.id; let gi = $index) {
        @for (item of group.items; track item.id; let ii = $index) {
          <button (click)="select(gi, ii, item)">{{ item.name }}</button>
        }
      }
    \`,
})
export class ForNestedListenerComponent {
  groups: { id: number; items: { id: number; name: string }[] }[] = [];
  select(gi: number, ii: number, item: { id: number; name: string }) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵlistener'],
  },
]
