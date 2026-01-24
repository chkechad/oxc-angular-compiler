/**
 * Host animation bindings (component-level).
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'animation-on-component',
    category: 'animations',
    description: 'Animation on child component',
    className: 'AnimationOnComponentComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-on-component',
  standalone: true,
  template: \`
    <app-child [@componentAnim]="state"></app-child>
  \`,
})
export class AnimationOnComponentComponent {
  state = 'initial';
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty'],
  },
  {
    name: 'animation-with-property',
    category: 'animations',
    description: 'Animation combined with property binding',
    className: 'AnimationWithPropertyComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-with-property',
  standalone: true,
  template: \`
    <div [@highlight]="isHighlighted" [class.active]="isActive">Combined</div>
  \`,
})
export class AnimationWithPropertyComponent {
  isHighlighted = false;
  isActive = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty', 'ɵɵclassProp'],
  },
  {
    name: 'animation-params',
    category: 'animations',
    description: 'Animation with params object',
    className: 'AnimationParamsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-params',
  standalone: true,
  template: \`
    <div [@fade]="{ value: state, params: { duration: 500 } }">Parameterized</div>
  \`,
})
export class AnimationParamsComponent {
  state = 'initial';
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty'],
  },
]
