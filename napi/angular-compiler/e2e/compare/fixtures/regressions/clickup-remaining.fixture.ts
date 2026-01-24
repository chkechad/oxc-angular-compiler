/**
 * Regression: Remaining ClickUp comparison mismatches.
 *
 * After fixing major issues, 210 files still have mismatches in the ClickUp comparison.
 * This fixture reproduces the three main patterns of remaining differences:
 *
 * Analysis of mismatched files:
 * - 123 files have ONLY import diffs (no function diffs)
 * - 86 files have ONLY function diffs (no import diffs)
 * - 1 file has class-level diffs
 * - 0 files have both import and function diffs
 *
 * ## 1. Import Differences (123 files)
 *
 * Three types of import discrepancies:
 * - "different" (83): Extra specifiers added to existing import statements
 *   Example: `@angular/forms` has `FormGroup` in actual but not expected
 * - "extra" (45): Entire import statements for unused modules
 *   Example: `import * as moment from "moment"` present in actual only
 * - "missing" (9): Required imports absent from actual output
 *
 * Root cause: Cross-file elision logic is not removing all unused imports.
 * The TypeScript compiler strips imports it detects as unused in the compiled
 * output, but oxc is retaining some that shouldn't be kept.
 *
 * ## 2. Variable Naming Mismatch (761 occurrences in diffs)
 *
 * Variable suffixes differ consistently:
 * - Expected: `ctx_r4`, `i_r6`, `_r19`, `isFormsQuillTextareaEnabled_r8`
 * - Actual:   `ctx_r2`, `i_r5`, `_r18`, `isFormsQuillTextareaEnabled_r7`
 *
 * The counter is shared across all variables in a component's compilation.
 * When early variables in the processing order are numbered differently,
 * all subsequent variables have different suffixes.
 *
 * Root cause: The depth-first traversal order for variable naming in
 * `naming.rs` differs from Angular's TypeScript compiler in subtle ways,
 * particularly around:
 * - Handler ops (Listener variable processing order)
 * - Track-by ops (RepeaterCreate's track_by_ops timing)
 * - Semantic key deduplication (ContextRead, Reference sharing)
 *
 * ## 3. Consts Index Offset (366 occurrences in diffs)
 *
 * Element attribute array indices differ by 1-2:
 * - Expected: `i0.ɵɵelementStart(0, "cu-form-file-field", 88)`
 * - Actual:   `i0.ɵɵelementStart(0, "cu-form-file-field", 87)`
 *
 * This suggests the consts array has different entries, causing all indices
 * to be offset. The output is likely semantically correct (each compiler
 * references its own consts array correctly), but the line-by-line comparison
 * shows differences.
 *
 * Root cause: Ordering or inclusion of entries in the consts array differs.
 * This may be related to:
 * - I18n message constants ordering
 * - Pure function constants ordering
 * - Attribute array deduplication logic
 *
 * ## 4. Extra nextContext() Calls (33 occurrences)
 *
 * Listener handlers have unnecessary standalone nextContext() calls:
 * - Expected: (no standalone call)
 * - Actual:   `i0.ɵɵnextContext();`
 *
 * Example from listener:
 * ```javascript
 * // Expected (Angular)
 * function Component_listener() {
 *   const clipboardHelper_r12 = i0.ɵɵreference(2);
 *   return i0.ɵɵresetView(clipboardHelper_r12.setCopied());
 * }
 *
 * // Actual (oxc) - extra nextContext() call
 * function Component_listener() {
 *   const clipboardHelper_r12 = i0.ɵɵreference(2);
 *   i0.ɵɵnextContext(4);  // <-- extra, unnecessary
 *   return i0.ɵɵresetView(clipboardHelper_r12.setCopied());
 * }
 * ```
 *
 * Root cause: The `save_restore_view.rs` or `next_context_merging.rs` logic
 * is generating context navigation that isn't needed, or failing to merge
 * adjacent nextContext() calls in listener handlers.
 *
 * Related files:
 * - crates/oxc_angular_compiler/src/pipeline/phases/naming.rs (variable naming)
 * - crates/oxc_angular_compiler/src/pipeline/phases/next_context_merging.rs
 * - crates/oxc_angular_compiler/src/pipeline/phases/save_restore_view.rs
 * - crates/oxc_angular_compiler/src/component/cross_file_elision.rs (imports)
 * - crates/oxc_angular_compiler/src/pipeline/emit.rs (consts ordering)
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  // ============================================================================
  // Pattern 1: Variable Naming - Nested @for with listeners
  // ============================================================================
  // This pattern triggers variable naming differences due to:
  // - Multiple nested views with context variables
  // - Listener handlers accessing parent view context
  // - ContextRead variables needing semantic key deduplication
  {
    name: 'variable-naming-nested-for-with-ngfor',
    category: 'regressions',
    description: 'Nested @for inside *ngFor with listeners accessing all contexts',
    className: 'NestedForWithNgForComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-variable-naming-nested-for-with-ngfor',
  standalone: true,
  imports: [NgFor],
  template: \`
      <ng-container *ngFor="let field of fields; let i = index">
        <div class="field-wrapper" [attr.data-index]="i">
          @for (option of field.options; track option.id; let j = $index) {
            <button
              (click)="selectOption(i, j, field, option)"
              [class.selected]="isSelected(field, option)"
            >
              {{ option.label }}
            </button>
          }
        </div>
      </ng-container>
    \`,
})
export class NestedForWithNgForComponent {
  fields: any[] = [];
  selectOption(i: number, j: number, field: any, option: any) {}
  isSelected(field: any, option: any) { return false; }
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵlistener', 'ɵɵtemplate'],
  },

  // ============================================================================
  // Pattern 2: Listener in reference callback
  // ============================================================================
  // This pattern triggers extra nextContext() calls because the listener
  // accesses a template reference variable and needs to navigate contexts
  {
    name: 'listener-with-template-ref-access',
    category: 'regressions',
    description: 'Listener in nested view accessing template reference from parent',
    className: 'ListenerWithTemplateRefComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-listener-with-template-ref-access',
  standalone: true,
  template: \`
      <div #containerRef>
        @if (showItems) {
          @for (item of items; track item.id) {
            <button
              #itemButton
              (click)="handleClick(containerRef, itemButton, item)"
              (cbOnSuccess)="itemButton.focus()"
            >
              {{ item.name }}
            </button>
          }
        }
      </div>
    \`,
})
export class ListenerWithTemplateRefComponent {
  showItems: any;
  items: any[] = [];
  handleClick(container: any, button: any, item: any) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵlistener', 'ɵɵreference'],
  },

  // ============================================================================
  // Pattern 3: Multiple sibling views accessing same parent context
  // ============================================================================
  // This pattern tests semantic variable deduplication for ContextRead variables.
  // Sibling child views accessing the same parent context property should share
  // the same variable name (matching TypeScript's SemanticVariable sharing).
  {
    name: 'sibling-views-shared-context',
    category: 'regressions',
    description: 'Sibling @if branches accessing same parent @for context',
    className: 'SiblingViewsSharedContextComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-sibling-views-shared-context',
  standalone: true,
  template: \`
      @for (item of items; track item.id; let i = $index) {
        @if (item.type === 'text') {
          <input [value]="item.value" (change)="update(i, $event)" />
        }
        @if (item.type === 'number') {
          <input type="number" [value]="item.value" (input)="update(i, $event)" />
        }
        @if (item.type === 'select') {
          <select [value]="item.value" (change)="update(i, $event)">
            @for (opt of item.options; track opt) {
              <option [value]="opt">{{ opt }}</option>
            }
          </select>
        }
      }
    \`,
})
export class SiblingViewsSharedContextComponent {
  items: any[] = [];
  update(i: number, $event: any) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵconditional', 'ɵɵlistener'],
  },

  // ============================================================================
  // Pattern 4: Complex ClickUp-like form pattern
  // ============================================================================
  // This reproduces the FormComponent pattern that has the most diffs:
  // - Deep nesting of control flow
  // - Multiple async pipes in the same view
  // - Listeners accessing variables from multiple ancestor views
  {
    name: 'clickup-form-pattern',
    category: 'regressions',
    description: 'Complex form pattern from ClickUp FormComponent',
    className: 'ClickUpFormPatternComponent',
    type: 'full-transform',
    sourceCode: `
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgIf, NgFor, NgClass, AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-clickup-form-pattern',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, AsyncPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
      <ng-container *ngIf="loaded$ | async">
        <div class="form-body">
          <ng-container *ngFor="let field of formFields; let fieldIdx = index">
            <div
              class="form-field"
              [attr.data-test]="'form__body-item__' + field.display_name"
              [ngClass]="field.class"
            >
              @if (fieldsWithLabels[field.field]) {
                <label [id]="'cu-form-label-' + fieldIdx">{{ field.display_name }}</label>
              }

              @switch (field.field) {
                @case ('name') {
                  <cu-form-field
                    [controlId]="'cu-form-control-' + fieldIdx"
                    [label]="field.display_name"
                    [isRequired]="field.required"
                  >
                    <input
                      [id]="'cu-form-control-' + fieldIdx"
                      [formControlName]="field.field"
                      [placeholder]="fieldPlaceholders[field.field]"
                      [attr.aria-describedby]="'cu-form-control-' + fieldIdx + '-description'"
                    />
                  </cu-form-field>
                }
                @case ('content') {
                  <cu-form-field
                    [controlId]="'cu-form-control-' + fieldIdx"
                    [label]="field.display_name"
                  >
                    @if (isQuillEnabled$ | async; as quillEnabled) {
                      <cu-form-textarea
                        [fieldId]="'cu-form-control-' + fieldIdx"
                        [formControlName]="field.field"
                      ></cu-form-textarea>
                    } @else {
                      <textarea
                        [id]="'cu-form-control-' + fieldIdx"
                        [formControlName]="field.field"
                        [attr.aria-describedby]="'cu-form-control-' + fieldIdx + '-description'"
                      ></textarea>
                    }
                  </cu-form-field>
                }
                @default {
                  <cu-custom-field
                    [field]="field"
                    (fieldValueChange)="onFieldChange(fieldIdx, field, $event)"
                  ></cu-custom-field>
                }
              }
            </div>
          </ng-container>
        </div>
      </ng-container>
    \`,
})
export class ClickUpFormPatternComponent {
  loaded$: any;
  formFields: any[] = [];
  fieldsWithLabels: any = {};
  fieldPlaceholders: any = {};
  isQuillEnabled$: any;
  onFieldChange(idx: number, field: any, $event: any) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵconditional', 'ɵɵpipe', 'ɵɵtemplate'],
  },

  // ============================================================================
  // Pattern 5: Clipboard helper pattern (extra nextContext in listener)
  // ============================================================================
  // This pattern specifically triggers the extra nextContext() issue in listeners
  // where a template reference is accessed and the context navigation is not
  // properly merged.
  {
    name: 'clipboard-helper-pattern',
    category: 'regressions',
    description: 'ClickUp clipboard helper pattern with reference in listener callback',
    className: 'ClipboardHelperPatternComponent',
    type: 'full-transform',
    sourceCode: `
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgIf, AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-clipboard-helper-pattern',
  standalone: true,
  imports: [NgIf, AsyncPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
      <ng-container *ngIf="vm$ | async as vm">
        <div class="field-value">
          @if (vm.canCopy) {
            <button
              #clipboardHelper
              [cbContent]="vm.field.value"
              (cbOnSuccess)="clipboardHelper.setCopied()"
              [cuTooltip]="clipboardHelper.copied ? 'Copied!' : 'Copy to clipboard'"
            >
              <cu3-icon [name]="'copy'"></cu3-icon>
            </button>
          }
          @if (vm.canEdit) {
            <button (click)="toggleEdit()">
              <cu3-icon [name]="'edit'"></cu3-icon>
            </button>
          }
        </div>
      </ng-container>
    \`,
})
export class ClipboardHelperPatternComponent {
  vm$: any;
  toggleEdit() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵlistener', 'ɵɵreference', 'ɵɵpipe'],
  },
]
