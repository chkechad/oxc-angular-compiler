/**
 * Fixtures that test actual host metadata compilation.
 *
 * These fixtures include host: { ... } metadata to test the host bindings
 * compilation path in both Angular and Oxc compilers.
 *
 * Note: Expected features use "_HostBindings" (function name suffix) not
 * "ɵɵHostBindings" (which doesn't exist as an Angular instruction).
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'host-property-binding',
    category: 'host-bindings',
    description: 'Host property binding with [disabled]',
    className: 'HostPropertyBindingComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-property-binding',
  standalone: true,
  template: '<ng-content></ng-content>',
  host: {
    '[disabled]': 'isDisabled',
  },
})
export class HostPropertyBindingComponent {
  isDisabled = false;
}
    `.trim(),
    expectedFeatures: ['_HostBindings'],
  },
  {
    name: 'host-class-binding',
    category: 'host-bindings',
    description: 'Host class binding with [class.active]',
    className: 'HostClassBindingComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-class-binding',
  standalone: true,
  template: '<ng-content></ng-content>',
  host: {
    '[class.active]': 'isActive',
    '[class.disabled]': 'isDisabled',
  },
})
export class HostClassBindingComponent {
  isActive = false;
  isDisabled = false;
}
    `.trim(),
    expectedFeatures: ['_HostBindings', 'ɵɵclassProp'],
  },
  {
    name: 'host-style-binding',
    category: 'host-bindings',
    description: 'Host style binding with [style.width]',
    className: 'HostStyleBindingComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-style-binding',
  standalone: true,
  template: '<ng-content></ng-content>',
  host: {
    '[style.width.px]': 'width',
    '[style.height.px]': 'height',
  },
})
export class HostStyleBindingComponent {
  width = 100;
  height = 100;
}
    `.trim(),
    expectedFeatures: ['_HostBindings', 'ɵɵstyleProp'],
  },
  {
    name: 'host-listener',
    category: 'host-bindings',
    description: 'Host listener with (click)',
    className: 'HostListenerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-listener',
  standalone: true,
  template: '<ng-content></ng-content>',
  host: {
    '(click)': 'onClick($event)',
    '(keydown.enter)': 'onEnter()',
  },
})
export class HostListenerComponent {
  onClick(event: Event) {}
  onEnter() {}
}
    `.trim(),
    expectedFeatures: ['_HostBindings'],
  },
  {
    name: 'host-attribute',
    category: 'host-bindings',
    description: 'Static host attribute',
    className: 'HostAttributeComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-attribute',
  standalone: true,
  template: '<ng-content></ng-content>',
  host: {
    'role': 'button',
    'tabindex': '0',
  },
})
export class HostAttributeComponent {}
    `.trim(),
    expectedFeatures: ['_HostBindings'],
  },
  {
    name: 'host-combined',
    category: 'host-bindings',
    description: 'Combined host bindings: properties, classes, listeners, and attributes',
    className: 'HostCombinedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-host-combined',
  standalone: true,
  template: '<ng-content></ng-content>',
  host: {
    '[class.active]': 'isActive',
    '[disabled]': 'isDisabled',
    '(click)': 'onClick()',
    'role': 'button',
  },
})
export class HostCombinedComponent {
  isActive = false;
  isDisabled = false;
  onClick() {}
}
    `.trim(),
    expectedFeatures: ['_HostBindings', 'ɵɵclassProp'],
  },
]
