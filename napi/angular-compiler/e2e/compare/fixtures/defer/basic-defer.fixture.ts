/**
 * Basic @defer block with idle trigger.
 */
import type { Fixture } from '../types.js'

export const fixture: Fixture = {
  name: 'basic-defer',
  category: 'defer',
  description: 'Basic @defer block with on idle trigger',
  className: 'BasicDeferComponent',
  type: 'full-transform',
  sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-basic-defer',
  standalone: true,
  template: \`
    @defer (on idle) {
      <div>Deferred content</div>
    } @loading {
      <span>Loading...</span>
    } @error {
      <span>Error occurred</span>
    } @placeholder {
      <span>Placeholder</span>
    }
  \`,
})
export class BasicDeferComponent {}
  `.trim(),
  expectedFeatures: ['ɵɵdefer', 'ɵɵdeferOnIdle'],
}
