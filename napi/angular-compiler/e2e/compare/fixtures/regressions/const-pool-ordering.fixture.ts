/**
 * Regression: Constant pool ordering.
 *
 * Issue: Pure function calls must maintain consistent ordering
 * in the constant pool for semantic equivalence.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'const-pool-pure-pipes',
    category: 'regressions',
    description: 'Multiple pure pipes in same template',
    className: 'ConstPoolPurePipesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-const-pool-pure-pipes',
  standalone: true,
  imports: [DatePipe, CurrencyPipe],
  template: \`
      <div>{{ date1 | date:'short' }}</div>
      <div>{{ date2 | date:'medium' }}</div>
      <div>{{ price | currency:'USD' }}</div>
      <div>{{ date3 | date:'short' }}</div>
    \`,
})
export class ConstPoolPurePipesComponent {
  date1: any;
  date2: any;
  date3: any;
  price: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵpipe', 'ɵɵpureFunctionV'],
  },
  {
    name: 'const-pool-static-arrays',
    category: 'regressions',
    description: 'Static arrays in template',
    className: 'ConstPoolStaticArraysComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-const-pool-static-arrays',
  standalone: true,
  imports: [NgClass],
  template: \`
      @for (item of ['a', 'b', 'c']; track item) {
        <span>{{ item }}</span>
      }
      <div [ngClass]="['class1', 'class2']">Styled</div>
    \`,
})
export class ConstPoolStaticArraysComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵpureFunction1'],
  },
  {
    name: 'const-pool-objects',
    category: 'regressions',
    description: 'Static objects in bindings',
    className: 'ConstPoolObjectsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'app-const-pool-objects',
  standalone: true,
  imports: [NgStyle],
  template: \`
      <div [ngStyle]="{ color: 'red', fontSize: '14px' }">Red text</div>
      <div [ngStyle]="{ color: 'blue', fontSize: '16px' }">Blue text</div>
    \`,
})
export class ConstPoolObjectsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵpureFunction2'],
  },
]
