/**
 * Regression: Template literal with loop aliases.
 *
 * Issue: {{ item.icon }} in @for must correctly reference
 * the loop variable through the template context.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'for-item-property-access',
    category: 'regressions',
    description: 'Accessing item properties in @for',
    className: 'ForItemPropertyAccessComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-for-item-property-access',
  standalone: true,
  template: \`
      @for (item of items; track item.id) {
        <span class="{{ item.icon }}">{{ item.label }}</span>
      }
    \`,
})
export class ForItemPropertyAccessComponent {
  items: { id: number; icon: string; label: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate'],
  },
  {
    name: 'for-nested-property',
    category: 'regressions',
    description: 'Nested property access in @for',
    className: 'ForNestedPropertyComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-for-nested-property',
  standalone: true,
  template: \`
      @for (user of users; track user.id) {
        <div>{{ user.profile.avatar }}</div>
        <span>{{ user.settings.theme }}</span>
      }
    \`,
})
export class ForNestedPropertyComponent {
  users: { id: number; profile: { avatar: string }; settings: { theme: string } }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate'],
  },
  {
    name: 'for-computed-expression',
    category: 'regressions',
    description: 'Computed expression with loop variable',
    className: 'ForComputedExpressionComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-for-computed-expression',
  standalone: true,
  template: \`
      @for (item of items; track item.id; let i = $index) {
        <div [id]="'item-' + i" class="{{ item.type + '-class' }}">
          {{ item.prefix + item.name }}
        </div>
      }
    \`,
})
export class ForComputedExpressionComponent {
  items: { id: number; type: string; prefix: string; name: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate'],
  },
]
