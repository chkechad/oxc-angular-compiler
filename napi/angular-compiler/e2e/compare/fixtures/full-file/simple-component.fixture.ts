/**
 * Simple component with inline template.
 *
 * Tests basic full-file transformation with a minimal Angular component.
 */
import type { Fixture } from '../types.js'

export const fixture: Fixture = {
  type: 'full-transform',
  name: 'simple-component',
  category: 'full-file',
  description: 'Simple component with inline template',
  className: 'SimpleComponent',
  sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-simple',
  standalone: true,
  template: \`
    <div class="container">
      <h1>{{ title }}</h1>
      <p>{{ message }}</p>
    </div>
  \`,
})
export class SimpleComponent {
  title = 'Hello World';
  message = 'Welcome to Angular';
}
`.trim(),
  expectedFeatures: [
    // DomOnly mode uses ɵɵdomElementStart for standalone components without directive dependencies
    // Note: Text uses ɵɵtext (not ɵɵdomText) even in DomOnly mode
    'ɵɵdomElementStart',
    'ɵɵdomElementEnd',
    'ɵɵtext',
    'ɵɵtextInterpolate',
  ],
}
