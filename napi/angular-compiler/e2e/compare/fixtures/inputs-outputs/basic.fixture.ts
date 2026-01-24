/**
 * Component with @Input and @Output decorators.
 *
 * Tests that the Angular compiler correctly generates input and output
 * metadata in the defineComponent call, and that the compare tool
 * properly validates these against the Oxc compiler output.
 */
import type { Fixture } from '../types.js'

export const fixture: Fixture = {
  type: 'full-transform',
  name: 'inputs-outputs-basic',
  category: 'inputs-outputs',
  description: 'Component with @Input and @Output decorators',
  className: 'InputOutputComponent',
  sourceCode: `
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-input-output',
  standalone: true,
  template: \`
    <div>
      <span>{{ name }}</span>
      <span>{{ count }}</span>
      <button (click)="onClick()">Click</button>
    </div>
  \`,
})
export class InputOutputComponent {
  @Input() name: string = '';
  @Input('itemCount') count: number = 0;
  @Output() clicked = new EventEmitter<void>();
  @Output('valueChanged') changed = new EventEmitter<string>();

  onClick() {
    this.clicked.emit();
    this.changed.emit('clicked');
  }
}
`.trim(),
  expectedFeatures: ['ɵɵdomElementStart', 'ɵɵtext', 'ɵɵdomListener'],
}
