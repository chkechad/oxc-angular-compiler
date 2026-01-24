/**
 * Regression: ViewChild/ViewChildren query ordering mismatch.
 *
 * ## The Issue
 *
 * OXC produces ViewQuery calls in a different order than Angular's TypeScript compiler.
 * This causes the wrong property to receive each query result, which is RUNTIME_AFFECTING.
 *
 * ## Example from ClickUp's custom-field.component.ts
 *
 * Source class has @ViewChild declarations in this order:
 * 1. @ViewChild('editPopover') editPopover
 * 2. @ViewChild('customFieldContentWrapper') customFieldContentWrapper
 * 3. @ViewChild(EditTaskCustomFieldValueComponent) editor
 * 4. @ViewChild('generatingAiContentPopover') generatingAiContentPopover
 * 5. @ViewChild('customFieldType', { read: ElementRef }) customFieldTypeElementRef
 *
 * ## OXC Output (INCORRECT):
 * ```javascript
 * viewQuery: function CustomFieldComponent_Query(rf, ctx) {
 *   if (rf & 1) {
 *     i0.ɵɵviewQuery(_c0, 5)(_c1, 5)(_c2, 5)(_c3, 5, ElementRef)(EditTaskCustomFieldValueComponent, 5);
 *   }
 *   if (rf & 2) {
 *     let _t;
 *     i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.editPopover = _t.first);
 *     i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.customFieldContentWrapper = _t.first);
 *     i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.generatingAiContentPopover = _t.first);  // WRONG!
 *     i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.customFieldTypeElementRef = _t.first);  // WRONG!
 *     i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.editor = _t.first);  // WRONG!
 *   }
 * }
 * ```
 *
 * ## Angular TypeScript Output (CORRECT):
 * ```javascript
 * viewQuery: function CustomFieldComponent_Query(rf, ctx) {
 *   if (rf & 1) {
 *     i0.ɵɵviewQuery(_c0, 5)(_c1, 5)(EditTaskCustomFieldValueComponent, 5)(_c2, 5)(_c3, 5, ElementRef);
 *   }
 *   if (rf & 2) {
 *     let _t;
 *     i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.editPopover = _t.first);
 *     i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.customFieldContentWrapper = _t.first);
 *     i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.editor = _t.first);  // CORRECT
 *     i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.generatingAiContentPopover = _t.first);  // CORRECT
 *     i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.customFieldTypeElementRef = _t.first);  // CORRECT
 *   }
 * }
 * ```
 *
 * ## Impact
 *
 * This is RUNTIME_AFFECTING because:
 * - Properties receive wrong DOM elements/component instances
 * - Type mismatches can cause runtime errors
 * - Component functionality breaks when accessing wrong references
 *
 * ## Root Cause
 *
 * The ViewChild declarations are being processed in a different order.
 * Specifically, string selectors ('editPopover', 'customFieldContentWrapper', etc.)
 * and component type selectors (EditTaskCustomFieldValueComponent) are being
 * ordered differently relative to each other.
 *
 * ## Files to Fix
 *
 * - crates/oxc_angular_compiler/src/pipeline/... (query processing logic)
 * - The order should match source file declaration order
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  // ==========================================================================
  // Minimal reproduction: Mixed string and type selectors
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'viewchild-ordering-mixed-selectors',
    category: 'regressions',
    description: 'ViewChild with mixed string and component type selectors',
    className: 'ViewChildMixedSelectorsComponent',
    sourceCode: `
import { Component, ViewChild, ElementRef } from '@angular/core';

// Simulated imported component type
class ChildComponent {}

@Component({
  selector: 'app-mixed-selectors',
  standalone: true,
  template: \`
    <div #firstRef>First</div>
    <child-component></child-component>
    <div #secondRef>Second</div>
  \`,
})
export class ViewChildMixedSelectorsComponent {
  @ViewChild('firstRef') firstRef!: ElementRef;
  @ViewChild(ChildComponent) childComp!: ChildComponent;
  @ViewChild('secondRef') secondRef!: ElementRef;
}
`.trim(),
    expectedFeatures: ['ɵɵviewQuery', 'ɵɵqueryRefresh', 'ɵɵloadQuery'],
  },

  // ==========================================================================
  // Multiple ViewChild with read option
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'viewchild-ordering-read-option',
    category: 'regressions',
    description: 'ViewChild with read option should maintain declaration order',
    className: 'ViewChildReadOptionComponent',
    sourceCode: `
import { Component, ViewChild, ElementRef, TemplateRef, ViewContainerRef } from '@angular/core';

@Component({
  selector: 'app-read-option',
  standalone: true,
  template: \`
    <div #container>
      <ng-template #template></ng-template>
    </div>
    <div #elementOnly>Element</div>
  \`,
})
export class ViewChildReadOptionComponent {
  @ViewChild('container') containerDefault!: ElementRef;
  @ViewChild('container', { read: ViewContainerRef }) containerVcr!: ViewContainerRef;
  @ViewChild('template') templateRef!: TemplateRef<any>;
  @ViewChild('elementOnly', { read: ElementRef }) element!: ElementRef;
}
`.trim(),
    expectedFeatures: ['ɵɵviewQuery', 'ɵɵqueryRefresh'],
  },

  // ==========================================================================
  // ClickUp exact pattern: Multiple mixed ViewChild declarations
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'viewchild-ordering-clickup-pattern',
    category: 'regressions',
    description: 'ClickUp custom-field.component pattern with 5 ViewChild declarations',
    className: 'CustomFieldLikeComponent',
    sourceCode: `
import { Component, ViewChild, ElementRef } from '@angular/core';

// Simulated imported component (like EditTaskCustomFieldValueComponent)
class EditorComponent {}

@Component({
  selector: 'app-custom-field-like',
  standalone: true,
  template: \`
    <div #editPopover>Edit Popover</div>
    <div #customFieldContentWrapper>Content</div>
    <editor-component></editor-component>
    <div #generatingAiContentPopover>AI Popover</div>
    <div #customFieldType>Type Element</div>
  \`,
})
export class CustomFieldLikeComponent {
  @ViewChild('editPopover', { static: false }) editPopover: any;
  @ViewChild('customFieldContentWrapper', { static: false }) customFieldContentWrapper: ElementRef;
  @ViewChild(EditorComponent, { static: false }) editor: EditorComponent;
  @ViewChild('generatingAiContentPopover', { static: false }) generatingAiContentPopover: any;
  @ViewChild('customFieldType', { static: false, read: ElementRef }) customFieldTypeElementRef: ElementRef;
}
`.trim(),
    expectedFeatures: ['ɵɵviewQuery', 'ɵɵqueryRefresh', 'ɵɵloadQuery'],
  },

  // ==========================================================================
  // ViewChildren ordering
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'viewchildren-ordering',
    category: 'regressions',
    description: 'ViewChildren should maintain declaration order',
    className: 'ViewChildrenOrderingComponent',
    sourceCode: `
import { Component, ViewChildren, QueryList, ElementRef } from '@angular/core';

class ItemComponent {}

@Component({
  selector: 'app-viewchildren-order',
  standalone: true,
  template: \`
    <div #items *ngFor="let item of list">{{ item }}</div>
    <item-component *ngFor="let item of list"></item-component>
  \`,
})
export class ViewChildrenOrderingComponent {
  list = [1, 2, 3];

  @ViewChildren('items') itemElements!: QueryList<ElementRef>;
  @ViewChildren(ItemComponent) itemComponents!: QueryList<ItemComponent>;
}
`.trim(),
    expectedFeatures: ['ɵɵviewQuery', 'ɵɵqueryRefresh'],
  },

  // ==========================================================================
  // ContentChild ordering
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'contentchild-ordering',
    category: 'regressions',
    description: 'ContentChild should maintain declaration order',
    className: 'ContentChildOrderingComponent',
    sourceCode: `
import { Component, ContentChild, ContentChildren, QueryList, TemplateRef, ElementRef } from '@angular/core';

class ProjectedComponent {}

@Component({
  selector: 'app-contentchild-order',
  standalone: true,
  template: \`<ng-content></ng-content>\`,
})
export class ContentChildOrderingComponent {
  @ContentChild('headerTpl') headerTemplate!: TemplateRef<any>;
  @ContentChild(ProjectedComponent) projectedComp!: ProjectedComponent;
  @ContentChild('footerTpl') footerTemplate!: TemplateRef<any>;
  @ContentChildren('item') items!: QueryList<ElementRef>;
}
`.trim(),
    expectedFeatures: ['ɵɵcontentQuery', 'ɵɵqueryRefresh'],
  },

  // ==========================================================================
  // Static vs Non-static ordering
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'viewchild-static-ordering',
    category: 'regressions',
    description: 'Static and non-static ViewChild should maintain declaration order',
    className: 'ViewChildStaticOrderingComponent',
    sourceCode: `
import { Component, ViewChild, ElementRef, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-static-order',
  standalone: true,
  template: \`
    <div #staticDiv>Static</div>
    <div #dynamicDiv *ngIf="show">Dynamic</div>
    <ng-template #templateRef></ng-template>
    <div #anotherStatic>Another</div>
  \`,
})
export class ViewChildStaticOrderingComponent {
  show = true;

  @ViewChild('staticDiv', { static: true }) staticDiv!: ElementRef;
  @ViewChild('dynamicDiv', { static: false }) dynamicDiv!: ElementRef;
  @ViewChild('templateRef', { static: true }) templateRef!: TemplateRef<any>;
  @ViewChild('anotherStatic', { static: true }) anotherStatic!: ElementRef;
}
`.trim(),
    expectedFeatures: ['ɵɵviewQuery', 'ɵɵqueryRefresh'],
  },
]
