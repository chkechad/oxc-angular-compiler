/**
 * Template reference variables and let declarations.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'template-ref-basic',
    category: 'templates',
    description: 'Basic template reference variable',
    className: 'TemplateRefBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-ref-basic',
  standalone: true,
  template: \`
      <input #nameInput type="text" />
      <button (click)="greet(nameInput.value)">Greet</button>
    \`,
})
export class TemplateRefBasicComponent {
  greet(name: string) {}
}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomElement and ɵɵdomListener instead of ɵɵelement and ɵɵlistener
    expectedFeatures: ['ɵɵdomElement', 'ɵɵdomListener'],
  },
  {
    name: 'template-ref-multiple',
    category: 'templates',
    description: 'Multiple template references',
    className: 'TemplateRefMultipleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-ref-multiple',
  standalone: true,
  template: \`
      <input #firstName type="text" placeholder="First name" />
      <input #lastName type="text" placeholder="Last name" />
      <p>{{ firstName.value }} {{ lastName.value }}</p>
    \`,
})
export class TemplateRefMultipleComponent {}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomElement instead of ɵɵelement
    expectedFeatures: ['ɵɵdomElement'],
  },
  {
    name: 'template-let-variable',
    category: 'templates',
    description: 'Template let variable declaration',
    className: 'TemplateLetVariableComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-let-variable',
  standalone: true,
  template: \`
      <ng-template #tmpl let-data>
        <div>{{ data.title }}</div>
        <p>{{ data.content }}</p>
      </ng-template>
    \`,
})
export class TemplateLetVariableComponent {}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomTemplate instead of ɵɵtemplate
    expectedFeatures: ['ɵɵdomTemplate'],
  },
  {
    name: 'template-let-in-for',
    category: 'templates',
    description: 'Let variables in @for loop',
    className: 'TemplateLetInForComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-let-in-for',
  standalone: true,
  template: \`
      @for (item of items; track item.id; let i = $index, isFirst = $first, isLast = $last) {
        <div [class.first]="isFirst" [class.last]="isLast">
          {{ i + 1 }}. {{ item.name }}
        </div>
      }
    \`,
})
export class TemplateLetInForComponent {
  items: { id: number; name: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate'],
  },
]
