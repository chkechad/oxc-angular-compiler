/**
 * Regression: Variable naming suffix divergence between oxc and Angular.
 *
 * INVESTIGATION SUMMARY (2026-02-03):
 * ===================================
 * Despite reports of ~82 files with variable naming differences in ClickUp,
 * extensive testing shows that all standard patterns produce MATCHING variable names.
 *
 * Tested patterns (all matched):
 * - Nested @if with listeners (`_r1`, `_r3`, `ctx_r1` identical)
 * - @for with nested @if and listeners (`item_r3`, `ɵ$index_1_r4`, `ctx_r4` identical)
 * - @if/@else with listeners in both branches
 * - @switch with listeners in each case
 * - Async pipe aliases with listeners
 * - Triple nested @if blocks
 * - Double nested @for with cross-context access
 * - ng-template with listeners inside @if
 *
 * The reported ClickUp mismatches were found to be:
 * - Import differences (type-only imports like `TrackEventData` not preserved)
 * - NOT variable naming differences
 *
 * These fixtures verify variable naming continues to work correctly.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'variable-naming-divergence-nested-if-listener',
    category: 'regressions',
    description: 'Nested @if with event listener - tests counter allocation order',
    className: 'NestedIfListenerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-test',
  standalone: true,
  template: \`
    @if (showOuter) {
      <div>
        @if (showInner) {
          <button (click)="onClick()">Click</button>
        }
      </div>
    }
  \`
})
export class NestedIfListenerComponent {
  showOuter = true;
  showInner = true;
  onClick() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵlistener'],
  },
  {
    name: 'variable-naming-divergence-if-else-with-listeners',
    category: 'regressions',
    description: '@if/@else with listeners in both branches',
    className: 'IfElseListenersComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-test',
  standalone: true,
  template: \`
    @if (showA) {
      <button (click)="onA()">A</button>
    } @else {
      <button (click)="onB()">B</button>
    }
  \`
})
export class IfElseListenersComponent {
  showA = true;
  onA() {}
  onB() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵlistener'],
  },
  {
    name: 'variable-naming-divergence-for-with-nested-if',
    category: 'regressions',
    description: '@for with nested @if containing listener',
    className: 'ForWithNestedIfComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-test',
  standalone: true,
  template: \`
    @for (item of items; track item.id) {
      @if (item.show) {
        <button (click)="onClick(item)">{{ item.name }}</button>
      }
    }
  \`
})
export class ForWithNestedIfComponent {
  items: { id: number; name: string; show: boolean }[] = [];
  onClick(item: any) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵconditional', 'ɵɵlistener'],
  },
  {
    name: 'variable-naming-divergence-switch',
    category: 'regressions',
    description: '@switch with listeners in each case',
    className: 'SwitchWithListenersComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-test',
  standalone: true,
  template: \`
    @switch (mode) {
      @case ('a') {
        <button (click)="onA()">A</button>
      }
      @case ('b') {
        <button (click)="onB()">B</button>
      }
      @default {
        <button (click)="onDefault()">Default</button>
      }
    }
  \`
})
export class SwitchWithListenersComponent {
  mode = 'a';
  onA() {}
  onB() {}
  onDefault() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener'],
  },
  {
    name: 'variable-naming-divergence-pipe-in-if',
    category: 'regressions',
    description: '@if with async pipe alias and listener',
    className: 'PipeInIfComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { of, Observable } from 'rxjs';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [AsyncPipe],
  template: \`
    @if (data$ | async; as data) {
      <button (click)="onClick(data)">{{ data }}</button>
    }
  \`
})
export class PipeInIfComponent {
  data$: Observable<string> = of('test');
  onClick(data: string) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵpipe', 'ɵɵlistener'],
  },
  {
    name: 'variable-naming-divergence-triple-nested-if',
    category: 'regressions',
    description: 'Triple nested @if blocks with listener at deepest level',
    className: 'TripleNestedIfComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-test',
  standalone: true,
  template: \`
    @if (a) {
      @if (b) {
        @if (c) {
          <button (click)="onClick()">Click</button>
        }
      }
    }
  \`
})
export class TripleNestedIfComponent {
  a = true;
  b = true;
  c = true;
  onClick() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵlistener'],
  },
  {
    name: 'variable-naming-divergence-for-for-listener',
    category: 'regressions',
    description: 'Double nested @for with listener accessing outer context',
    className: 'DoubleForListenerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-test',
  standalone: true,
  template: \`
    @for (outer of outerList; track outer.id; let oi = $index) {
      @for (inner of outer.items; track inner.id; let ii = $index) {
        <button (click)="onClick(outer, inner, oi, ii)">
          {{ outer.name }}: {{ inner.name }}
        </button>
      }
    }
  \`
})
export class DoubleForListenerComponent {
  outerList: { id: number; name: string; items: { id: number; name: string }[] }[] = [];
  onClick(outer: any, inner: any, oi: number, ii: number) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵlistener'],
  },
  {
    name: 'variable-naming-divergence-template-ref',
    category: 'regressions',
    description: 'ng-template with listeners inside @if',
    className: 'TemplateRefListenerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: \`
    @if (show) {
      <ng-container *ngTemplateOutlet="buttonTpl; context: { $implicit: 'test' }"></ng-container>
    }
    <ng-template #buttonTpl let-label>
      <button (click)="onClick(label)">{{ label }}</button>
    </ng-template>
  \`
})
export class TemplateRefListenerComponent {
  show = true;
  onClick(label: string) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener'],
  },
]
