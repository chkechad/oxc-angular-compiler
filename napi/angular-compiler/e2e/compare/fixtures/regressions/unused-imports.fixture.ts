/**
 * Regression: Unused imports not being tree-shaken.
 *
 * ## The Issue
 *
 * OXC retains imports that Angular's TypeScript compiler removes because they
 * are only used as decorators (which are compiled away) or type annotations.
 *
 * ## Examples from ClickUp Comparison
 *
 * ### Extra @angular/core imports (80 files)
 *
 * Common extra imports in OXC output:
 * - `Input` - 59 occurrences (decorator compiled into inputs: {} metadata)
 * - `ViewChild` - 16 occurrences (decorator compiled into viewQuery)
 * - `OnInit` - 4 occurrences (lifecycle interface, type-only)
 * - `OnChanges` - 3 occurrences (lifecycle interface, type-only)
 * - `ElementRef` - 2 occurrences (when only used in read: option)
 * - `AfterViewInit` - 1 occurrence
 *
 * ### Extra module imports (44 files)
 *
 * OXC retains imports for modules that are only used for type annotations:
 * - `moment` (namespace import for types)
 * - Type-only imports from internal modules
 *
 * ## Impact
 *
 * This is classified as COSMETIC because:
 * - The extra imports don't affect runtime behavior
 * - The decorators are still properly compiled
 * - The bundle may be slightly larger but functionally identical
 *
 * However, it indicates a gap in the import elision logic that should be fixed
 * to match Angular's output exactly.
 *
 * ## Root Cause
 *
 * The cross-file elision or import tracking logic is not detecting that these
 * imports are only used in decorator expressions that get compiled away.
 *
 * When Angular compiles `@Input() value = ''`:
 * - The decorator is transformed into `inputs: { value: 'value' }` in defineComponent
 * - The `Input` import is no longer referenced in the output
 * - TypeScript/Angular removes the unused import
 *
 * OXC needs to track which imports are only used in decorators and remove them.
 *
 * ## Files to Fix
 *
 * - crates/oxc_angular_compiler/src/component/cross_file_elision.rs
 * - crates/oxc_angular_compiler/src/transform/... (import tracking)
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  // ==========================================================================
  // Pattern 1: @Input decorator should not keep Input import
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'unused-import-input-decorator',
    category: 'regressions',
    description: 'Input decorator compiles away, Input import should be removed',
    className: 'InputDecoratorComponent',
    sourceCode: `
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-input-decorator',
  standalone: true,
  template: \`<div>{{ value }}</div>\`,
})
export class InputDecoratorComponent {
  @Input() value = '';
  @Input('alias') aliasedValue = '';
  @Input({ required: true }) requiredValue!: string;
}
`.trim(),
    // Expected: Input should NOT be in the output imports
    // The inputs are compiled into: inputs: { value: 'value', aliasedValue: ['aliasedValue', 'alias'], requiredValue: ['requiredValue', void 0, { required: true }] }
    expectedFeatures: ['ɵɵdefineComponent', 'inputs:'],
  },

  // ==========================================================================
  // Pattern 2: @ViewChild decorator should not keep ViewChild import
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'unused-import-viewchild-decorator',
    category: 'regressions',
    description: 'ViewChild decorator compiles away, ViewChild import should be removed',
    className: 'ViewChildDecoratorComponent',
    sourceCode: `
import { Component, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-viewchild-decorator',
  standalone: true,
  template: \`<div #myDiv>Content</div>\`,
})
export class ViewChildDecoratorComponent {
  @ViewChild('myDiv') myDiv!: ElementRef;
  @ViewChild('myDiv', { static: true }) staticDiv!: ElementRef;
}
`.trim(),
    // Expected: ViewChild should NOT be in the output imports (only ElementRef may be kept if used at runtime)
    expectedFeatures: ['ɵɵviewQuery'],
  },

  // ==========================================================================
  // Pattern 3: Lifecycle interfaces are type-only
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'unused-import-lifecycle-interfaces',
    category: 'regressions',
    description: 'Lifecycle interfaces (OnInit, OnDestroy, etc.) are type-only',
    className: 'LifecycleComponent',
    sourceCode: `
import { Component, OnInit, OnDestroy, OnChanges, AfterViewInit, SimpleChanges, Input } from '@angular/core';

@Component({
  selector: 'app-lifecycle',
  standalone: true,
  template: \`<div>{{ value }}</div>\`,
})
export class LifecycleComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() value = '';

  ngOnInit() {
    console.log('init');
  }

  ngOnDestroy() {
    console.log('destroy');
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('changes', changes);
  }

  ngAfterViewInit() {
    console.log('afterViewInit');
  }
}
`.trim(),
    // Expected: OnInit, OnDestroy, OnChanges, AfterViewInit, SimpleChanges, Input should NOT be in output
    // These are only used as types/interfaces
    expectedFeatures: ['ɵɵdefineComponent'],
  },

  // ==========================================================================
  // Pattern 4: @Output decorator should not keep Output import
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'unused-import-output-decorator',
    category: 'regressions',
    description: 'Output decorator compiles away, Output import should be removed',
    className: 'OutputDecoratorComponent',
    sourceCode: `
import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-output-decorator',
  standalone: true,
  template: \`<button (click)="onClick()">Click</button>\`,
})
export class OutputDecoratorComponent {
  @Output() clicked = new EventEmitter<void>();
  @Output('aliasEvent') aliasedEvent = new EventEmitter<string>();

  onClick() {
    this.clicked.emit();
  }
}
`.trim(),
    // Expected: Output should NOT be in output (EventEmitter IS needed at runtime)
    expectedFeatures: ['ɵɵdefineComponent', 'outputs:', 'EventEmitter'],
  },

  // ==========================================================================
  // Pattern 5: @HostBinding/@HostListener decorators
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'unused-import-host-decorators',
    category: 'regressions',
    description: 'Host decorators compile away, imports should be removed',
    className: 'HostDecoratorComponent',
    sourceCode: `
import { Component, HostBinding, HostListener } from '@angular/core';

@Component({
  selector: 'app-host-decorator',
  standalone: true,
  template: \`<div>Content</div>\`,
})
export class HostDecoratorComponent {
  @HostBinding('class.active') isActive = true;
  @HostBinding('style.color') color = 'red';
  @HostBinding('attr.role') role = 'button';

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    console.log('clicked', event);
  }
}
`.trim(),
    // Expected: HostBinding, HostListener should NOT be in output
    expectedFeatures: ['ɵɵdefineComponent', 'hostBindings:'],
  },

  // ==========================================================================
  // Pattern 6: Combined - Real-world component with many decorators
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'unused-import-combined-decorators',
    category: 'regressions',
    description: 'Component with many decorator types, all decorator imports should be removed',
    className: 'CombinedDecoratorsComponent',
    sourceCode: `
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ContentChild,
  HostBinding,
  HostListener,
  OnInit,
  OnDestroy,
  ElementRef,
  TemplateRef,
} from '@angular/core';

@Component({
  selector: 'app-combined',
  standalone: true,
  template: \`
    <div #container>
      <ng-content></ng-content>
    </div>
  \`,
})
export class CombinedDecoratorsComponent implements OnInit, OnDestroy {
  @Input() value = '';
  @Input({ required: true }) requiredValue!: string;

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('container') container!: ElementRef;
  @ContentChild('projected') projectedContent!: TemplateRef<any>;

  @HostBinding('class.active') isActive = false;

  @HostListener('click')
  onClick() {
    this.valueChange.emit(this.value);
  }

  ngOnInit() {}
  ngOnDestroy() {}
}
`.trim(),
    // Expected: Only keep imports that are used at runtime:
    // - Component (used in decorator metadata)
    // - EventEmitter (instantiated)
    // - ElementRef, TemplateRef (used as type but also in read: options)
    // Remove: Input, Output, ViewChild, ContentChild, HostBinding, HostListener, OnInit, OnDestroy
    expectedFeatures: ['ɵɵdefineComponent', 'EventEmitter'],
  },

  // ==========================================================================
  // Pattern 7: Type-only imports from external modules
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'unused-import-type-only-external',
    category: 'regressions',
    description: 'Type-only imports from external modules should be removed',
    className: 'TypeOnlyExternalComponent',
    sourceCode: `
import { Component, Input } from '@angular/core';
import type { Observable } from 'rxjs';

// Type-only usage
interface UserData {
  name: string;
  data$: Observable<any>;
}

@Component({
  selector: 'app-type-only',
  standalone: true,
  template: \`<div>{{ user?.name }}</div>\`,
})
export class TypeOnlyExternalComponent {
  @Input() user: UserData | null = null;
}
`.trim(),
    // Expected: rxjs import should NOT be in output (type-only)
    expectedFeatures: ['ɵɵdefineComponent'],
  },

  // ==========================================================================
  // Control: Imports that SHOULD be kept
  // ==========================================================================
  {
    type: 'full-transform',
    name: 'kept-import-runtime-usage',
    category: 'regressions',
    description: 'Imports used at runtime should be kept',
    className: 'RuntimeUsageComponent',
    sourceCode: `
import { Component, ElementRef, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-runtime',
  standalone: true,
  imports: [AsyncPipe],
  template: \`<div>{{ value$ | async }}</div>\`,
})
export class RuntimeUsageComponent {
  // ElementRef is injected - must be kept
  private elementRef = inject(ElementRef);

  // BehaviorSubject is instantiated - must be kept
  value$ = new BehaviorSubject('hello');
}
`.trim(),
    // Expected: ElementRef, AsyncPipe, BehaviorSubject should all be in output
    expectedFeatures: ['ɵɵdefineComponent', 'ElementRef', 'BehaviorSubject', 'AsyncPipe'],
  },
]
