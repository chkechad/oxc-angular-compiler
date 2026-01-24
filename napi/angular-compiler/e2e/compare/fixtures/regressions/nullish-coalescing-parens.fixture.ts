/**
 * Regression: Nullish coalescing operator parentheses.
 *
 * Issue: (a?.b ?? c) needs proper parenthesization to avoid
 * operator precedence issues in generated code.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'nullish-coalescing-basic',
    category: 'regressions',
    description: 'Nullish coalescing with optional chaining',
    className: 'NullishCoalescingBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-nullish-coalescing-basic',
  standalone: true,
  template: \`
      <div>{{ user?.name ?? 'Anonymous' }}</div>
    \`,
})
export class NullishCoalescingBasicComponent {
  user: { name: string } | null = null;
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
  {
    name: 'nullish-coalescing-nested',
    category: 'regressions',
    description: 'Nested nullish coalescing expressions',
    className: 'NullishCoalescingNestedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-nullish-coalescing-nested',
  standalone: true,
  template: \`
      <div>{{ (a?.b ?? c)?.d ?? 'default' }}</div>
    \`,
})
export class NullishCoalescingNestedComponent {
  a: { b: { d: string } } | null = null;
  c: { d: string } | null = null;
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
  {
    name: 'nullish-coalescing-in-binding',
    category: 'regressions',
    description: 'Nullish coalescing in property binding',
    className: 'NullishCoalescingInBindingComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-nullish-coalescing-in-binding',
  standalone: true,
  template: \`
      <div [title]="item?.tooltip ?? 'No tooltip'"></div>
      <input [value]="form?.value ?? ''">
    \`,
})
export class NullishCoalescingInBindingComponent {
  item: { tooltip: string } | null = null;
  form: { value: string } | null = null;
}
    `.trim(),
    expectedFeatures: ['ɵɵproperty'],
  },
  {
    name: 'nullish-coalescing-complex',
    category: 'regressions',
    description: 'Complex nullish coalescing with ternary',
    className: 'NullishCoalescingComplexComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-nullish-coalescing-complex',
  standalone: true,
  template: \`
      <div>{{ isActive ? (user?.role ?? 'guest') : 'inactive' }}</div>
    \`,
})
export class NullishCoalescingComplexComponent {
  isActive = false;
  user: { role: string } | null = null;
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
]
