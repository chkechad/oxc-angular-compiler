/**
 * ngTemplateOutlet for dynamic template instantiation.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'template-outlet-basic',
    category: 'templates',
    description: 'Basic ngTemplateOutlet usage',
    className: 'TemplateOutletBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-outlet-basic',
  standalone: true,
  template: \`
      <ng-template #myTemplate>
        <div>Template content</div>
      </ng-template>
      <ng-container *ngTemplateOutlet="myTemplate"></ng-container>
    \`,
})
export class TemplateOutletBasicComponent {}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomTemplate instead of ɵɵtemplate
    expectedFeatures: ['ɵɵdomTemplate'],
  },
  {
    name: 'template-outlet-context',
    category: 'templates',
    description: 'ngTemplateOutlet with context',
    className: 'TemplateOutletContextComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-outlet-context',
  standalone: true,
  template: \`
      <ng-template #greetTemplate let-name let-greeting="greeting">
        <p>{{ greeting }}, {{ name }}!</p>
      </ng-template>
      <ng-container *ngTemplateOutlet="greetTemplate; context: { $implicit: 'World', greeting: 'Hello' }"></ng-container>
    \`,
})
export class TemplateOutletContextComponent {}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomTemplate instead of ɵɵtemplate
    expectedFeatures: ['ɵɵdomTemplate'],
  },
  {
    name: 'template-outlet-dynamic',
    category: 'templates',
    description: 'Dynamic template selection',
    className: 'TemplateOutletDynamicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-outlet-dynamic',
  standalone: true,
  template: \`
      <ng-template #templateA>Template A</ng-template>
      <ng-template #templateB>Template B</ng-template>
      <ng-container *ngTemplateOutlet="useA ? templateA : templateB"></ng-container>
    \`,
})
export class TemplateOutletDynamicComponent {
  useA = true;
}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomTemplate instead of ɵɵtemplate
    expectedFeatures: ['ɵɵdomTemplate'],
  },
  {
    name: 'template-outlet-in-loop',
    category: 'templates',
    description: 'ngTemplateOutlet inside @for',
    className: 'TemplateOutletInLoopComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-outlet-in-loop',
  standalone: true,
  template: \`
      <ng-template #itemTemplate let-item>
        <li>{{ item.name }}</li>
      </ng-template>
      <ul>
        @for (item of items; track item.id) {
          <ng-container *ngTemplateOutlet="itemTemplate; context: { $implicit: item }"></ng-container>
        }
      </ul>
    \`,
})
export class TemplateOutletInLoopComponent {
  items: { id: number; name: string }[] = [];
}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomTemplate instead of ɵɵtemplate
    expectedFeatures: ['ɵɵdomTemplate', 'ɵɵrepeaterCreate'],
  },
]
