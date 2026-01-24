/**
 * Regression: Variable naming consistency between oxc and Angular.
 *
 * Issue: Temporary variable names like `ctx_r{N}`, `item_r{N}`, etc. must be
 * numbered consistently with Angular's TypeScript compiler.
 *
 * The naming scheme follows Angular's TemplateDefinitionBuilder compatibility mode:
 * - Context variables: `ctx_r{N}` (post-increment, starts at 0)
 * - Identifier variables: `{identifier}_r{N}` (pre-increment, starts at 1)
 * - SavedView variables: `_r{N}` (pre-increment, starts at 1)
 *
 * The counter is shared across ALL variables in a component, and the numbering
 * depends on the order in which views and listener handlers are processed.
 * This ordering follows a depth-first traversal of the view tree.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'variable-naming-simple-for',
    category: 'regressions',
    description: 'Simple @for loop variable naming',
    className: 'VariableNamingSimpleForComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-variable-naming-simple-for',
  standalone: true,
  template: \`
      @for (item of items; track item.id) {
        <span>{{ item.name }}</span>
      }
    \`,
})
export class VariableNamingSimpleForComponent {
  items: { id: number; name: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate'],
  },
  {
    name: 'variable-naming-for-with-listener',
    category: 'regressions',
    description: '@for loop with event listener variable naming',
    className: 'VariableNamingForWithListenerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-variable-naming-for-with-listener',
  standalone: true,
  template: \`
      @for (item of items; track item.id; let idx = $index) {
        <button (click)="handleClick(item, idx)">{{ item.name }}</button>
      }
    \`,
})
export class VariableNamingForWithListenerComponent {
  items: { id: number; name: string }[] = [];
  handleClick(item: { id: number; name: string }, idx: number) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate'],
  },
  {
    name: 'variable-naming-nested-for',
    category: 'regressions',
    description: 'Nested @for loops with variable naming',
    className: 'VariableNamingNestedForComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-variable-naming-nested-for',
  standalone: true,
  template: \`
      @for (outer of outerItems; track outer.id; let oi = $index) {
        <div>
          @for (inner of outer.children; track inner.id; let ii = $index) {
            <span (click)="select(oi, ii, inner)">{{ inner.name }}</span>
          }
        </div>
      }
    \`,
})
export class VariableNamingNestedForComponent {
  outerItems: { id: number; children: { id: number; name: string }[] }[] = [];
  select(oi: number, ii: number, inner: { id: number; name: string }) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate'],
  },
  {
    name: 'variable-naming-if-with-alias',
    category: 'regressions',
    description: '@if with alias variable naming',
    className: 'VariableNamingIfWithAliasComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-variable-naming-if-with-alias',
  standalone: true,
  template: \`
      @if (data$ | async; as data) {
        <div (click)="handleData(data)">{{ data.value }}</div>
      }
    \`,
})
export class VariableNamingIfWithAliasComponent {
  data$: Observable<{ value: string }> = of({ value: '' });
  handleData(data: { value: string }) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵpipe'],
  },
  {
    name: 'variable-naming-mixed-contexts',
    category: 'regressions',
    description: 'Mixed contexts with shared counter',
    className: 'VariableNamingMixedContextsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-variable-naming-mixed-contexts',
  standalone: true,
  template: \`
      @if (showList) {
        @for (item of items; track item.id; let i = $index) {
          <div (click)="selectItem(i, item)">
            {{ i }}: {{ item.name }}
          </div>
        }
      } @else {
        <button (click)="toggle()">Show List</button>
      }
    \`,
})
export class VariableNamingMixedContextsComponent {
  showList = false;
  items: { id: number; name: string }[] = [];
  selectItem(i: number, item: { id: number; name: string }) {}
  toggle() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵrepeaterCreate'],
  },
  {
    name: 'variable-naming-multiple-listeners',
    category: 'regressions',
    description: 'Multiple listeners with shared counter',
    className: 'VariableNamingMultipleListenersComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-variable-naming-multiple-listeners',
  standalone: true,
  template: \`
      @for (item of items; track item.id) {
        <div>
          <button (click)="onClick(item)">Click</button>
          <button (dblclick)="onDoubleClick(item)">DblClick</button>
          <span (mouseenter)="onHover(item)">{{ item.name }}</span>
        </div>
      }
    \`,
})
export class VariableNamingMultipleListenersComponent {
  items: { id: number; name: string }[] = [];
  onClick(item: { id: number; name: string }) {}
  onDoubleClick(item: { id: number; name: string }) {}
  onHover(item: { id: number; name: string }) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate'],
  },
  {
    name: 'variable-naming-context-read',
    category: 'regressions',
    description: 'Parent context read variable naming',
    className: 'VariableNamingContextReadComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-variable-naming-context-read',
  standalone: true,
  template: \`
      @for (item of items; track item.id; let idx = $index, first = $first, last = $last) {
        <span [class.first]="first" [class.last]="last">
          {{ idx }}: {{ item.name }}
        </span>
      }
    \`,
})
export class VariableNamingContextReadComponent {
  items: { id: number; name: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate'],
  },
]
