/**
 * Multiple class and style bindings.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'class-binding-single',
    category: 'bindings',
    description: 'Single class binding',
    className: 'ClassBindingSingleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-class-binding-single',
  standalone: true,
  template: \`
    <div [class.active]="isActive">Content</div>
  \`,
})
export class ClassBindingSingleComponent {
  isActive = true;
}
    `.trim(),
    expectedFeatures: ['ɵɵclassProp'],
  },
  {
    name: 'class-binding-multiple',
    category: 'bindings',
    description: 'Multiple class bindings on same element',
    className: 'ClassBindingMultipleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-class-binding-multiple',
  standalone: true,
  template: \`
    <div [class.active]="isActive"
         [class.disabled]="isDisabled"
         [class.highlight]="isHighlighted"
         [class.error]="hasError">
      Multiple classes
    </div>
  \`,
})
export class ClassBindingMultipleComponent {
  isActive = true;
  isDisabled = false;
  isHighlighted = true;
  hasError = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵclassProp'],
  },
  {
    name: 'style-binding-single',
    category: 'bindings',
    description: 'Single style binding',
    className: 'StyleBindingSingleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-style-binding-single',
  standalone: true,
  template: \`
    <div [style.color]="textColor">Styled text</div>
  \`,
})
export class StyleBindingSingleComponent {
  textColor = 'red';
}
    `.trim(),
    expectedFeatures: ['ɵɵstyleProp'],
  },
  {
    name: 'style-binding-unit',
    category: 'bindings',
    description: 'Style binding with unit suffix',
    className: 'StyleBindingUnitComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-style-binding-unit',
  standalone: true,
  template: \`
    <div [style.width.px]="width"
         [style.height.%]="heightPercent"
         [style.margin.rem]="marginRem">
      Sized element
    </div>
  \`,
})
export class StyleBindingUnitComponent {
  width = 100;
  heightPercent = 50;
  marginRem = 1;
}
    `.trim(),
    expectedFeatures: ['ɵɵstyleProp'],
  },
  {
    name: 'class-style-combined',
    category: 'bindings',
    description: 'Combined class and style bindings',
    className: 'ClassStyleCombinedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-class-style-combined',
  standalone: true,
  template: \`
    <div [class.featured]="isFeatured"
         [class.hidden]="!isVisible"
         [style.backgroundColor]="bgColor"
         [style.fontSize.px]="fontSize">
      Combined bindings
    </div>
  \`,
})
export class ClassStyleCombinedComponent {
  isFeatured = true;
  isVisible = true;
  bgColor = 'yellow';
  fontSize = 16;
}
    `.trim(),
    expectedFeatures: ['ɵɵclassProp', 'ɵɵstyleProp'],
  },
  {
    name: 'class-map-binding',
    category: 'bindings',
    description: 'Class map binding with [class]',
    className: 'ClassMapBindingComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-class-map-binding',
  standalone: true,
  template: \`
    <div [class]="classMap">Dynamic classes</div>
  \`,
})
export class ClassMapBindingComponent {
  classMap = { active: true, disabled: false };
}
    `.trim(),
    expectedFeatures: ['ɵɵclassMap'],
  },
  {
    name: 'style-map-binding',
    category: 'bindings',
    description: 'Style map binding with [style]',
    className: 'StyleMapBindingComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-style-map-binding',
  standalone: true,
  template: \`
    <div [style]="styleMap">Dynamic styles</div>
  \`,
})
export class StyleMapBindingComponent {
  styleMap = { color: 'red', fontSize: '14px' };
}
    `.trim(),
    expectedFeatures: ['ɵɵstyleMap'],
  },
]
