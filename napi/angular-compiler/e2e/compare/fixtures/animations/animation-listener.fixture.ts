/**
 * Animation event listeners.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'animation-done-listener',
    category: 'animations',
    description: 'Animation done callback',
    className: 'AnimationDoneListenerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-done-listener',
  standalone: true,
  template: \`
    <div [@fadeIn]="state" (@fadeIn.done)="onAnimationDone($event)">Animated</div>
  \`,
})
export class AnimationDoneListenerComponent {
  state = 'initial';

  onAnimationDone(event: any) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty', 'ɵɵsyntheticHostListener'],
  },
  {
    name: 'animation-start-listener',
    category: 'animations',
    description: 'Animation start callback',
    className: 'AnimationStartListenerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-start-listener',
  standalone: true,
  template: \`
    <div [@slide]="state" (@slide.start)="onStart($event)">Sliding</div>
  \`,
})
export class AnimationStartListenerComponent {
  state = 'initial';

  onStart(event: any) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty', 'ɵɵsyntheticHostListener'],
  },
  {
    name: 'animation-both-listeners',
    category: 'animations',
    description: 'Both start and done callbacks',
    className: 'AnimationBothListenersComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-both-listeners',
  standalone: true,
  template: \`
    <div [@expand]="isExpanded"
         (@expand.start)="onStart()"
         (@expand.done)="onDone()">
      Expanding content
    </div>
  \`,
})
export class AnimationBothListenersComponent {
  isExpanded = false;

  onStart() {}
  onDone() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty', 'ɵɵsyntheticHostListener'],
  },
]
