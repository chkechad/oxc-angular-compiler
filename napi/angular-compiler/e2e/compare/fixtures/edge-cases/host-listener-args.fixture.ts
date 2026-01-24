/**
 * Host listeners with multiple arguments.
 *
 * Tests the host metadata with event listeners that access multiple
 * event properties like $event, $event.target, $event.key, etc.
 * These are defined in the component's host metadata object.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'host-listener-event-target',
    category: 'edge-cases',
    description: 'Host listener accessing $event.target',
    className: 'HostListenerEventTargetComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-listener-event-target',
  standalone: true,
  template: \`<div>Click anywhere on the host</div>\`,
  host: {
    '(click)': 'onClick($event, $event.target)',
  },
})
export class HostListenerEventTargetComponent {
  onClick(event: Event, target: EventTarget | null) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵelement'],
  },
  {
    name: 'host-listener-multiple-properties',
    category: 'edge-cases',
    description: 'Host listener accessing multiple event properties',
    className: 'HostListenerMultiplePropertiesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-listener-multiple-properties',
  standalone: true,
  template: \`<div>Press keys on the host</div>\`,
  host: {
    '(keydown)': 'onKeyDown($event, $event.key, $event.code, $event.shiftKey)',
  },
})
export class HostListenerMultiplePropertiesComponent {
  onKeyDown(event: KeyboardEvent, key: string, code: string, shiftKey: boolean) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵelement'],
  },
  {
    name: 'host-listener-nested-properties',
    category: 'edge-cases',
    description: 'Host listener accessing nested event properties',
    className: 'HostListenerNestedPropertiesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-listener-nested-properties',
  standalone: true,
  template: \`<div>Mouse events</div>\`,
  host: {
    '(mousemove)': 'onMouseMove($event.clientX, $event.clientY, $event.target.id)',
  },
})
export class HostListenerNestedPropertiesComponent {
  onMouseMove(clientX: number, clientY: number, targetId: string) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵelement'],
  },
  {
    name: 'host-listener-with-modifiers',
    category: 'edge-cases',
    description: 'Host listeners with key modifiers',
    className: 'HostListenerWithModifiersComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-listener-with-modifiers',
  standalone: true,
  template: \`<div>Keyboard shortcuts</div>\`,
  host: {
    '(keydown.enter)': 'onEnter()',
    '(keydown.escape)': 'onEscape()',
    '(keydown.shift.tab)': 'onShiftTab()',
    '(keydown.control.s)': 'onSave($event)',
    '(keydown.meta.z)': 'onUndo($event)',
  },
})
export class HostListenerWithModifiersComponent {
  onEnter() {}
  onEscape() {}
  onShiftTab() {}
  onSave(event: KeyboardEvent) {}
  onUndo(event: KeyboardEvent) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵelement'],
  },
  {
    name: 'host-listener-window-document',
    category: 'edge-cases',
    description: 'Host listeners on window and document',
    className: 'HostListenerWindowDocumentComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-listener-window-document',
  standalone: true,
  template: \`<div>Global event listeners</div>\`,
  host: {
    '(window:resize)': 'onResize($event)',
    '(window:scroll)': 'onScroll($event.target.scrollTop)',
    '(document:click)': 'onDocumentClick($event.target)',
    '(document:keydown.escape)': 'onGlobalEscape()',
  },
})
export class HostListenerWindowDocumentComponent {
  onResize(event: Event) {}
  onScroll(scrollTop: number) {}
  onDocumentClick(target: EventTarget | null) {}
  onGlobalEscape() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵelement'],
  },
  {
    name: 'host-listener-combined-bindings',
    category: 'edge-cases',
    description: 'Host listeners combined with host property bindings',
    className: 'HostListenerCombinedBindingsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-listener-combined-bindings',
  standalone: true,
  template: \`<span>Interactive host element</span>\`,
  host: {
    '[class.focused]': 'isFocused',
    '[class.hovered]': 'isHovered',
    '[attr.tabindex]': 'tabIndex',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
  },
})
export class HostListenerCombinedBindingsComponent {
  isFocused = false;
  isHovered = false;
  tabIndex = 0;

  onFocus() {
    this.isFocused = true;
  }

  onBlur() {
    this.isFocused = false;
  }

  onMouseEnter() {
    this.isHovered = true;
  }

  onMouseLeave() {
    this.isHovered = false;
  }
}
    `.trim(),
    expectedFeatures: ['ɵɵelement'],
  },
  {
    name: 'host-listener-prevent-default',
    category: 'edge-cases',
    description: 'Host listeners that prevent default',
    className: 'HostListenerPreventDefaultComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-listener-prevent-default',
  standalone: true,
  template: \`<div>Form element</div>\`,
  host: {
    '(submit)': 'onSubmit($event); $event.preventDefault()',
    '(dragover)': '$event.preventDefault()',
    '(drop)': 'onDrop($event); $event.preventDefault(); $event.stopPropagation()',
  },
})
export class HostListenerPreventDefaultComponent {
  onSubmit(event: Event) {}
  onDrop(event: DragEvent) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵelement'],
  },
  {
    name: 'host-listener-touch-events',
    category: 'edge-cases',
    description: 'Host listeners for touch events',
    className: 'HostListenerTouchEventsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-listener-touch-events',
  standalone: true,
  template: \`<div>Touch-enabled area</div>\`,
  host: {
    '(touchstart)': 'onTouchStart($event, $event.touches[0])',
    '(touchmove)': 'onTouchMove($event.touches[0].clientX, $event.touches[0].clientY)',
    '(touchend)': 'onTouchEnd($event.changedTouches)',
  },
})
export class HostListenerTouchEventsComponent {
  onTouchStart(event: TouchEvent, touch: Touch) {}
  onTouchMove(clientX: number, clientY: number) {}
  onTouchEnd(changedTouches: TouchList) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵelement'],
  },
]
