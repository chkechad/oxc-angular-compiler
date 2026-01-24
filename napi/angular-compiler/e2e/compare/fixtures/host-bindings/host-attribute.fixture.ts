/**
 * Templates with attribute bindings similar to host attributes.
 *
 * Note: Host attributes are defined in component metadata, not templates.
 * These fixtures test similar attribute binding patterns in templates.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'template-role-attributes',
    category: 'host-bindings',
    description: 'ARIA role attributes in template',
    className: 'TemplateRoleAttributesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-role-attributes',
  standalone: true,
  template: \`
    <div role="button" tabindex="0" [attr.aria-label]="label">
      Accessible element
    </div>
  \`,
})
export class TemplateRoleAttributesComponent {
  label = 'Click me';
}
    `.trim(),
    expectedFeatures: ['ɵɵattribute'],
  },
  {
    name: 'template-data-attributes',
    category: 'host-bindings',
    description: 'Data attributes in template',
    className: 'TemplateDataAttributesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-data-attributes',
  standalone: true,
  template: \`
    <div [attr.data-testid]="testId"
         [attr.data-state]="state"
         data-static="value">
      Data attributed element
    </div>
  \`,
})
export class TemplateDataAttributesComponent {
  testId = 'test-123';
  state = 'active';
}
    `.trim(),
    expectedFeatures: ['ɵɵattribute'],
  },
  {
    name: 'template-static-class',
    category: 'host-bindings',
    description: 'Static and dynamic classes',
    className: 'TemplateStaticClassComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-template-static-class',
  standalone: true,
  imports: [NgClass],
  template: \`
    <div class="base-class static-class"
         [class.dynamic]="isDynamic"
         [ngClass]="classObj">
      Multi-classed element
    </div>
  \`,
})
export class TemplateStaticClassComponent {
  isDynamic = true;
  classObj = { highlight: true };
}
    `.trim(),
    expectedFeatures: ['ɵɵclassProp'],
  },
]
