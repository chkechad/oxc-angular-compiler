/**
 * Regression: Extra `signals: true` flag in component definition.
 *
 * BUG: OXC adds `signals: true` to component definitions that Angular does not emit.
 *
 * Expected (Angular): No `signals` field in defineComponent
 * Actual (OXC): `signals: true` added to defineComponent
 *
 * Runtime Impact: May affect how Angular's runtime handles change detection or
 * signal-related optimizations.
 *
 * Found in: ClickUp comparison (12 occurrences)
 *
 * Note: The `signals` flag should only be present when the component uses
 * signal-based inputs/outputs with the new signal input/output functions.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'no-signals-basic',
    category: 'regressions',
    description: 'Basic component without signals should not have signals flag',
    className: 'NoSignalsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-no-signals-basic',
  standalone: true,
  template: \`<div>{{ message }}</div>\`,
})
export class NoSignalsComponent {
  message = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵdefineComponent'],
  },
  {
    type: 'full-transform',
    name: 'no-signals-with-input',
    category: 'regressions',
    description: 'Component with @Input decorator should not have signals flag',
    className: 'InputDecoratorComponent',
    sourceCode: `
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-input-decorator',
  standalone: true,
  template: \`<div>{{ value }}</div>\`,
})
export class InputDecoratorComponent {
  @Input() value: string = '';
}
`.trim(),
    expectedFeatures: ['ɵɵdefineComponent'],
  },
]

/**
 * Full transform fixture to test signal input/output functions.
 */
export const signalInputFixture: Fixture = {
  type: 'full-transform',
  name: 'signal-input-output',
  category: 'regressions',
  description: 'Component with signal-based input() and output() should have signals flag',
  className: 'SignalInputComponent',
  sourceCode: `
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-signal-input',
  standalone: true,
  template: \`
    <div>{{ name() }}</div>
    <button (click)="clicked.emit()">Click</button>
  \`,
})
export class SignalInputComponent {
  name = input('default');
  required = input.required<string>();
  clicked = output();
}
`.trim(),
  expectedFeatures: ['ɵɵdefineComponent', 'input', 'output'],
}
