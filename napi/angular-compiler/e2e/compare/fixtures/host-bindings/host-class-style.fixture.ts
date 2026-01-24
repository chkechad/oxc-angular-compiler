/**
 * Templates with class and style bindings similar to host bindings.
 *
 * Note: Host class/style bindings are defined in component metadata.
 * These fixtures test similar patterns in templates.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'template-combined-bindings',
    category: 'host-bindings',
    description: 'Combined attribute, class, style, and event bindings',
    className: 'TemplateCombinedBindingsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-combined-bindings',
  standalone: true,
  template: \`
    <div [attr.id]="elementId"
         [class.active]="isActive"
         [class.focus]="hasFocus"
         [style.opacity]="opacity"
         (click)="handleClick()">
      Combined bindings element
    </div>
  \`,
})
export class TemplateCombinedBindingsComponent {
  elementId = 'element-1';
  isActive = false;
  hasFocus = false;
  opacity = 1;
  handleClick() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵattribute', 'ɵɵclassProp', 'ɵɵstyleProp', 'ɵɵlistener'],
  },
  {
    name: 'template-conditional-class',
    category: 'host-bindings',
    description: 'Conditional class expressions',
    className: 'TemplateConditionalClassComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-template-conditional-class',
  standalone: true,
  imports: [NgClass],
  template: \`
    <div [class]="computedClasses"
         [ngClass]="{'active': isActive, 'disabled': isDisabled}">
      Dynamic classes
    </div>
  \`,
})
export class TemplateConditionalClassComponent {
  computedClasses = 'base-class';
  isActive = true;
  isDisabled = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵclassMap'],
  },
  {
    name: 'template-full-featured',
    category: 'host-bindings',
    description: 'Full featured element bindings',
    className: 'TemplateFullFeaturedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-full-featured',
  standalone: true,
  template: \`
    <button role="tab"
            tabindex="0"
            [attr.aria-selected]="isSelected"
            [class.selected]="isSelected"
            [style.zIndex]="zIndex"
            (click)="select()"
            (keydown.enter)="select()"
            (keydown.space)="select()">
      Full featured tab
    </button>
  \`,
})
export class TemplateFullFeaturedComponent {
  isSelected = false;
  zIndex = 1;
  select() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵattribute', 'ɵɵclassProp', 'ɵɵstyleProp', 'ɵɵlistener'],
  },
]
