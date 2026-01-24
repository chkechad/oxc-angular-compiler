/**
 * Regression: Method binding target resolution.
 *
 * Issue: this.method.bind(this) must correctly resolve the method
 * reference and binding context.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'bind-method-simple',
    category: 'regressions',
    description: 'Simple method binding in event',
    className: 'BindMethodSimpleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-bind-method-simple',
  standalone: true,
  template: \`
      <button (click)="onClick()">Click</button>
    \`,
})
export class BindMethodSimpleComponent {
  onClick() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener'],
  },
  {
    name: 'bind-method-with-args',
    category: 'regressions',
    description: 'Method binding with arguments',
    className: 'BindMethodWithArgsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-bind-method-with-args',
  standalone: true,
  template: \`
      <button (click)="handleAction('save', item)">Save</button>
      <button (click)="handleAction('delete', item)">Delete</button>
    \`,
})
export class BindMethodWithArgsComponent {
  item: any;
  handleAction(action: string, item: any) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener'],
  },
  {
    name: 'bind-method-chained',
    category: 'regressions',
    description: 'Chained method call in event',
    className: 'BindMethodChainedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-bind-method-chained',
  standalone: true,
  template: \`
      <button (click)="service.handler.process($event)">Process</button>
    \`,
})
export class BindMethodChainedComponent {
  service: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener'],
  },
  {
    name: 'bind-method-conditional',
    category: 'regressions',
    description: 'Conditional method in event',
    className: 'BindMethodConditionalComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-bind-method-conditional',
  standalone: true,
  template: \`
      <button (click)="enabled && handleClick()">Conditional</button>
      <button (click)="enabled ? onEnabled() : onDisabled()">Ternary</button>
    \`,
})
export class BindMethodConditionalComponent {
  enabled: any;
  handleClick() {}
  onEnabled() {}
  onDisabled() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener'],
  },
]
