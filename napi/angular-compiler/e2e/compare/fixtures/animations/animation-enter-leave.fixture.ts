/**
 * Enter/leave animations with control flow.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'animation-enter-if',
    category: 'animations',
    description: 'Enter animation with @if',
    className: 'AnimationEnterIfComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-enter-if',
  standalone: true,
  template: \`
    @if (visible) {
      <div [@enterAnimation]>Entering content</div>
    }
  \`,
})
export class AnimationEnterIfComponent {
  visible = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty', 'ɵɵconditional'],
  },
  {
    name: 'animation-leave-if',
    category: 'animations',
    description: 'Leave animation with @if',
    className: 'AnimationLeaveIfComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-leave-if',
  standalone: true,
  template: \`
    @if (visible) {
      <div [@leaveAnimation]="'active'">Will animate out</div>
    }
  \`,
})
export class AnimationLeaveIfComponent {
  visible = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty', 'ɵɵconditional'],
  },
  {
    name: 'animation-for-items',
    category: 'animations',
    description: 'Staggered animations in @for',
    className: 'AnimationForItemsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-for-items',
  standalone: true,
  template: \`
    @for (item of items; track item.id) {
      <div [@listItem]="item.state">{{ item.name }}</div>
    }
  \`,
})
export class AnimationForItemsComponent {
  items: { id: number; name: string; state: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty', 'ɵɵrepeaterCreate'],
  },
  // Tests for plain animate.enter and animate.leave attributes (without brackets)
  // These should emit ɵɵanimateEnter / ɵɵanimateLeave instructions
  {
    name: 'animation-plain-enter-string',
    category: 'animations',
    description: 'Plain animate.enter with string value',
    className: 'AnimationPlainEnterComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-plain-enter-string',
  standalone: true,
  template: \`<p animate.enter="slide">Sliding Content</p>\`,
})
export class AnimationPlainEnterComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵanimateEnter'],
  },
  {
    name: 'animation-plain-leave-string',
    category: 'animations',
    description: 'Plain animate.leave with string value',
    className: 'AnimationPlainLeaveComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-plain-leave-string',
  standalone: true,
  template: \`<p animate.leave="fade">Fading Content</p>\`,
})
export class AnimationPlainLeaveComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵanimateLeave'],
  },
  {
    name: 'animation-plain-enter-with-if',
    category: 'animations',
    description: 'Plain animate.enter inside @if',
    className: 'AnimationPlainEnterIfComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-plain-enter-with-if',
  standalone: true,
  template: \`
    @if (visible) {
      <p animate.enter="slide">Conditional sliding content</p>
    }
  \`,
})
export class AnimationPlainEnterIfComponent {
  visible = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵanimateEnter', 'ɵɵconditional'],
  },
  {
    name: 'animation-plain-leave-with-if',
    category: 'animations',
    description: 'Plain animate.leave inside @if',
    className: 'AnimationPlainLeaveIfComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-plain-leave-with-if',
  standalone: true,
  template: \`
    @if (visible) {
      <p animate.leave="fade">Conditional fading content</p>
    }
  \`,
})
export class AnimationPlainLeaveIfComponent {
  visible = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵanimateLeave', 'ɵɵconditional'],
  },
  {
    name: 'animation-plain-both-enter-leave',
    category: 'animations',
    description: 'Both animate.enter and animate.leave on same element',
    className: 'AnimationPlainBothComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-plain-both-enter-leave',
  standalone: true,
  template: \`<div animate.enter="slideIn" animate.leave="slideOut">Animated</div>\`,
})
export class AnimationPlainBothComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵanimateEnter', 'ɵɵanimateLeave'],
  },
]
