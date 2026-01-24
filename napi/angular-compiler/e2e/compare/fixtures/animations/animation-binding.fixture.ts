/**
 * Animation trigger bindings.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'animation-trigger-basic',
    category: 'animations',
    description: 'Basic animation trigger binding',
    className: 'AnimationTriggerBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-trigger-basic',
  standalone: true,
  template: \`
    <div [@fadeIn]="animationState">Animated content</div>
  \`,
})
export class AnimationTriggerBasicComponent {
  animationState = 'initial';
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty'],
  },
  {
    name: 'animation-trigger-expression',
    category: 'animations',
    description: 'Animation trigger with expression',
    className: 'AnimationTriggerExpressionComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-trigger-expression',
  standalone: true,
  template: \`
    <div [@slide]="isOpen ? 'open' : 'closed'">Slide panel</div>
  \`,
})
export class AnimationTriggerExpressionComponent {
  isOpen = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty'],
  },
  {
    name: 'animation-trigger-conditional',
    category: 'animations',
    description: 'Animation trigger with conditional state',
    className: 'AnimationTriggerConditionalComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-trigger-conditional',
  standalone: true,
  template: \`
    <div [@expandCollapse]="expanded">
      @if (expanded) {
        <p>Expanded content here</p>
      }
    </div>
  \`,
})
export class AnimationTriggerConditionalComponent {
  expanded = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty', 'ɵɵconditional'],
  },
  {
    name: 'animation-multiple-triggers',
    category: 'animations',
    description: 'Multiple animation triggers on same element',
    className: 'AnimationMultipleTriggersComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-multiple-triggers',
  standalone: true,
  template: \`
    <div [@fadeIn]="fadeState" [@slideIn]="slideState">Multi-animated</div>
  \`,
})
export class AnimationMultipleTriggersComponent {
  fadeState = 'initial';
  slideState = 'initial';
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty'],
  },
]
