/**
 * Regression: Context alias inlining.
 *
 * Issue: @if (x; as alias) must correctly inline the alias
 * reference in the generated code.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'if-as-alias-basic',
    category: 'regressions',
    description: 'Basic @if with as alias',
    className: 'IfAsAliasBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-if-as-alias-basic',
  standalone: true,
  imports: [AsyncPipe],
  template: \`
      @if (user$ | async; as user) {
        <div>Hello, {{ user.name }}</div>
      }
    \`,
})
export class IfAsAliasBasicComponent {
  user$: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵpipe'],
  },
  {
    name: 'if-as-alias-nested-access',
    category: 'regressions',
    description: 'Alias with nested property access',
    className: 'IfAsAliasNestedAccessComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-if-as-alias-nested-access',
  standalone: true,
  imports: [AsyncPipe],
  template: \`
      @if (data$ | async; as data) {
        <div>{{ data.user.profile.name }}</div>
        <span>{{ data.settings.theme }}</span>
      }
    \`,
})
export class IfAsAliasNestedAccessComponent {
  data$: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵpipe'],
  },
  {
    name: 'if-as-alias-in-binding',
    category: 'regressions',
    description: 'Alias used in property binding',
    className: 'IfAsAliasInBindingComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-if-as-alias-in-binding',
  standalone: true,
  imports: [AsyncPipe],
  template: \`
      @if (config$ | async; as config) {
        <div [class.active]="config.isActive"
             [style.color]="config.theme.color">
          {{ config.title }}
        </div>
      }
    \`,
})
export class IfAsAliasInBindingComponent {
  config$: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵpipe', 'ɵɵclassProp', 'ɵɵstyleProp'],
  },
  {
    name: 'if-as-alias-in-event',
    category: 'regressions',
    description: 'Alias used in event handler',
    className: 'IfAsAliasInEventComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-if-as-alias-in-event',
  standalone: true,
  imports: [AsyncPipe],
  template: \`
      @if (item$ | async; as item) {
        <button (click)="select(item)">Select {{ item.name }}</button>
      }
    \`,
})
export class IfAsAliasInEventComponent {
  item$: any;
  select(item: any) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵpipe', 'ɵɵlistener'],
  },
]
