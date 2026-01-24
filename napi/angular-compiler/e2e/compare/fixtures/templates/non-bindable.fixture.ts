/**
 * ngNonBindable directive for preserving literal Angular syntax.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'non-bindable-basic',
    category: 'templates',
    description: 'Basic ngNonBindable usage on a div',
    className: 'NonBindableBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-non-bindable-basic',
  standalone: true,
  template: \`
      <div ngNonBindable>
        {{expression}}
      </div>
    \`,
})
export class NonBindableBasicComponent {}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomElement instead of ɵɵelement
    expectedFeatures: ['ɵɵdomElement', 'ɵɵtext'],
  },
  {
    name: 'non-bindable-nested',
    category: 'templates',
    description: 'ngNonBindable with nested elements containing interpolation',
    className: 'NonBindableNestedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-non-bindable-nested',
  standalone: true,
  template: \`
      <div ngNonBindable>
        <p>{{user.name}}</p>
        <span>{{user.email}}</span>
        <div>
          <strong>{{nested.value}}</strong>
        </div>
      </div>
    \`,
})
export class NonBindableNestedComponent {}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomElement* instead of ɵɵelement*
    expectedFeatures: ['ɵɵdomElement', 'ɵɵdomElementStart', 'ɵɵdomElementEnd', 'ɵɵtext'],
  },
  {
    name: 'non-bindable-preserves-syntax',
    category: 'templates',
    description: 'ngNonBindable preserves {{expression}} as literal text',
    className: 'NonBindablePreservesSyntaxComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-non-bindable-preserves-syntax',
  standalone: true,
  template: \`
      <div>
        <p>Bound: {{value}}</p>
        <div ngNonBindable>
          <p>Literal: {{value}}</p>
          <span [class]="className">This binding is literal</span>
          <button (click)="onClick()">This event is literal</button>
        </div>
      </div>
    \`,
})
export class NonBindablePreservesSyntaxComponent {
  value = '';
}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomElement instead of ɵɵelement
    expectedFeatures: ['ɵɵtextInterpolate', 'ɵɵdomElement', 'ɵɵtext'],
  },
  {
    name: 'non-bindable-with-code-example',
    category: 'templates',
    description: 'ngNonBindable for displaying Angular code examples',
    className: 'NonBindableCodeExampleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-non-bindable-with-code-example',
  standalone: true,
  template: \`
      <h3>Angular Template Syntax Example:</h3>
      <pre ngNonBindable>
        <code>
          &lt;div *ngFor="let item of items"&gt;
            {{item.name}}
          &lt;/div&gt;
        </code>
      </pre>
    \`,
})
export class NonBindableCodeExampleComponent {}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomElement instead of ɵɵelement
    expectedFeatures: ['ɵɵdomElement', 'ɵɵtext'],
  },
]
