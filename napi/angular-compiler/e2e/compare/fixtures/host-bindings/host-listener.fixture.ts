/**
 * Templates with event listeners similar to host listeners.
 *
 * Note: Host listeners are defined in component metadata, not templates.
 * These fixtures test similar event binding patterns in templates.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'template-click-listener',
    category: 'host-bindings',
    description: 'Click event listener',
    className: 'TemplateClickListenerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-click-listener',
  standalone: true,
  template: \`
    <button (click)="onClick($event)">Click me</button>
  \`,
})
export class TemplateClickListenerComponent {
  onClick(event: Event) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener'],
  },
  {
    name: 'template-keyboard-listeners',
    category: 'host-bindings',
    description: 'Keyboard event listeners',
    className: 'TemplateKeyboardListenersComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-keyboard-listeners',
  standalone: true,
  template: \`
    <input (keydown)="onKeyDown($event)"
           (keyup.enter)="onEnter()"
           (keydown.escape)="onEscape()"
           (keydown.shift.tab)="onShiftTab()">
  \`,
})
export class TemplateKeyboardListenersComponent {
  onKeyDown(event: KeyboardEvent) {}
  onEnter() {}
  onEscape() {}
  onShiftTab() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener'],
  },
  {
    name: 'template-focus-listeners',
    category: 'host-bindings',
    description: 'Focus and blur event listeners',
    className: 'TemplateFocusListenersComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-focus-listeners',
  standalone: true,
  template: \`
    <input (focus)="onFocus()"
           (blur)="onBlur()"
           (focusin)="onFocusIn()"
           (focusout)="onFocusOut()">
  \`,
})
export class TemplateFocusListenersComponent {
  onFocus() {}
  onBlur() {}
  onFocusIn() {}
  onFocusOut() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener'],
  },
  {
    name: 'template-mouse-listeners',
    category: 'host-bindings',
    description: 'Mouse event listeners',
    className: 'TemplateMouseListenersComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-mouse-listeners',
  standalone: true,
  template: \`
    <div (mouseenter)="onEnter()"
         (mouseleave)="onLeave()"
         (mousemove)="onMove($event)"
         (mousedown)="onDown($event)">
      Mouse target
    </div>
  \`,
})
export class TemplateMouseListenersComponent {
  onEnter() {}
  onLeave() {}
  onMove(event: MouseEvent) {}
  onDown(event: MouseEvent) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener'],
  },
]
