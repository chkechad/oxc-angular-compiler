/**
 * Regression: Animation constant pool index.
 *
 * Issue: Animation bindings must use correct indices
 * in the constant pool for trigger references.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'animation-single-trigger',
    category: 'regressions',
    description: 'Single animation trigger indexing',
    className: 'AnimationSingleTriggerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-single-trigger',
  standalone: true,
  template: \`
      <div [@fadeIn]="state">Animated</div>
    \`,
})
export class AnimationSingleTriggerComponent {
  state: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty'],
  },
  {
    name: 'animation-multiple-triggers',
    category: 'regressions',
    description: 'Multiple animation triggers indexing',
    className: 'AnimationMultipleTriggersComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-multiple-triggers',
  standalone: true,
  template: \`
      <div [@fadeIn]="fadeState" [@slideIn]="slideState" [@scaleIn]="scaleState">
        Multi-animated
      </div>
    \`,
})
export class AnimationMultipleTriggersComponent {
  fadeState: any;
  slideState: any;
  scaleState: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty'],
  },
  {
    name: 'animation-in-loop',
    category: 'regressions',
    description: 'Animation trigger in @for loop',
    className: 'AnimationInLoopComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-in-loop',
  standalone: true,
  template: \`
      @for (item of items; track item.id; let i = $index) {
        <div [@listAnim]="{ value: item.state, params: { delay: i * 100 } }">
          {{ item.name }}
        </div>
      }
    \`,
})
export class AnimationInLoopComponent {
  items: any[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty', 'ɵɵrepeaterCreate'],
  },
  {
    name: 'animation-with-listener',
    category: 'regressions',
    description: 'Animation trigger with callback',
    className: 'AnimationWithListenerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-animation-with-listener',
  standalone: true,
  template: \`
      <div [@expand]="isExpanded"
           (@expand.start)="onStart($event)"
           (@expand.done)="onDone($event)">
        Content
      </div>
    \`,
})
export class AnimationWithListenerComponent {
  isExpanded: any;
  onStart($event: any) {}
  onDone($event: any) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵsyntheticHostProperty', 'ɵɵsyntheticHostListener'],
  },
]
