/**
 * Regression: ClickUp comparison function diffs.
 *
 * These fixtures reproduce the three main patterns of function differences
 * found in the ClickUp frontend comparison (210 mismatched files):
 *
 * 1. SVG Namespace Prefix Missing (11 occurrences)
 *    - Expected: `:svg:svg` in conditionalCreate tag argument
 *    - Actual: `svg` (missing namespace prefix)
 *    - Root cause: The `tag` field in ConditionalOp/ConditionalBranchCreateOp
 *      stores the tag name without the namespace prefix
 *
 * 2. Pipe Slot Index Wrong (52 occurrences)
 *    - Expected: `i0.ɵɵpipeBind1(1, 5, ...)` using the actual pipe slot
 *    - Actual: `i0.ɵɵpipeBind1(0, 5, ...)` always using 0
 *    - Root cause: The first argument to pipeBind should be the pipe slot index,
 *      not hardcoded 0
 *
 * 3. Safe Navigation with Array Index (7 occurrences)
 *    - Expected: `(ctx.item?.list)[0]` wraps the safe-nav before array access
 *    - Actual: `ctx.item?.list[0]` applies array index inside safe-nav
 *    - Root cause: Array access after optional chaining should wrap the entire
 *      safe navigation expression in parentheses
 *
 * Related files:
 * - Rust: crates/oxc_angular_compiler/src/pipeline/ingest.rs (namespace handling)
 * - Rust: crates/oxc_angular_compiler/src/pipeline/conversion.rs (prefix_with_namespace)
 * - Rust: crates/oxc_angular_compiler/src/pipeline/phases/reify/mod.rs (tag emission)
 * - Rust: crates/oxc_angular_compiler/src/pipeline/phases/reify/statements/pipes.rs
 * - Rust: crates/oxc_angular_compiler/src/ast/transform/safe_nav.rs
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  // ============================================================================
  // Issue 1: SVG Namespace Prefix Missing
  // ============================================================================
  {
    name: 'svg-in-conditional-branch',
    category: 'regressions',
    description: 'SVG element inside @switch/@case should include :svg: namespace prefix',
    className: 'SvgConditionalComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-svg-in-conditional-branch',
  standalone: true,
  template: \`
      @switch (theme) {
        @case ('light') {
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" />
          </svg>
        }
        @case ('dark') {
          <svg viewBox="0 0 100 100">
            <rect width="80" height="80" x="10" y="10" />
          </svg>
        }
      }
    \`,
})
export class SvgConditionalComponent {
  theme: any;
}
    `.trim(),
    // The tag argument to conditionalCreate should be ":svg:svg", not "svg"
    expectedFeatures: ['ɵɵconditionalCreate', 'ɵɵconditionalBranchCreate'],
  },
  {
    name: 'svg-in-if-else',
    category: 'regressions',
    description: 'SVG element inside @if/@else should include :svg: namespace prefix',
    className: 'SvgIfElseComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-svg-in-if-else',
  standalone: true,
  template: \`
      @if (showIcon) {
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
        </svg>
      } @else {
        <svg class="placeholder" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
        </svg>
      }
    \`,
})
export class SvgIfElseComponent {
  showIcon: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵconditionalCreate'],
  },
  {
    name: 'svg-nested-in-for',
    category: 'regressions',
    description: 'SVG element inside @for should include :svg: namespace prefix',
    className: 'SvgInForComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-svg-nested-in-for',
  standalone: true,
  template: \`
      @for (icon of icons; track icon.id) {
        <svg [attr.viewBox]="icon.viewBox" class="icon">
          <use [attr.href]="icon.href" />
        </svg>
      }
    \`,
})
export class SvgInForComponent {
  icons: any[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate'],
  },

  // ============================================================================
  // Issue 2: Pipe Slot Index Wrong
  // ============================================================================
  {
    name: 'pipe-slot-index-basic',
    category: 'regressions',
    description: 'Pipe binding should use correct slot index (not 0)',
    className: 'PipeSlotBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-pipe-slot-index-basic',
  standalone: true,
  imports: [AsyncPipe],
  template: \`
      <div>{{ value | async }}</div>
    \`,
})
export class PipeSlotBasicComponent {
  value: any;
}
    `.trim(),
    // The first argument to pipeBind1 should be the pipe's slot index
    expectedFeatures: ['ɵɵpipeBind1', 'ɵɵpipe'],
  },
  {
    name: 'pipe-slot-index-multiple',
    category: 'regressions',
    description: 'Multiple pipes should each use their own slot index',
    className: 'PipeSlotMultipleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-pipe-slot-index-multiple',
  standalone: true,
  imports: [AsyncPipe],
  template: \`
      <div>{{ data | async }}</div>
      <div>{{ items | async }}</div>
      <div>{{ status | async }}</div>
    \`,
})
export class PipeSlotMultipleComponent {
  data: any;
  items: any;
  status: any;
}
    `.trim(),
    // Each pipeBind1 should reference the correct pipe slot (1, 2, 3, etc.)
    expectedFeatures: ['ɵɵpipeBind1', 'ɵɵpipe'],
  },
  {
    name: 'pipe-slot-index-in-property',
    category: 'regressions',
    description: 'Pipe in property binding should use correct slot index',
    className: 'PipeSlotPropertyComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-pipe-slot-index-in-property',
  standalone: true,
  imports: [AsyncPipe],
  template: \`
      <div [class.active]="isActive$ | async"
           [style.color]="color$ | async"
           [title]="title$ | async">
        Content
      </div>
    \`,
})
export class PipeSlotPropertyComponent {
  isActive$: any;
  color$: any;
  title$: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵpipeBind1', 'ɵɵpipe', 'ɵɵclassProp', 'ɵɵstyleProp'],
  },
  {
    name: 'pipe-slot-index-nested',
    category: 'regressions',
    description: 'Nested templates with pipes should use correct slot indices',
    className: 'PipeSlotNestedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-pipe-slot-index-nested',
  standalone: true,
  imports: [AsyncPipe],
  template: \`
      @if (show) {
        <div>{{ innerData | async }}</div>
        <span>{{ innerStatus | async }}</span>
      }
    \`,
})
export class PipeSlotNestedComponent {
  show: any;
  innerData: any;
  innerStatus: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵpipeBind1', 'ɵɵpipe', 'ɵɵconditional'],
  },

  // ============================================================================
  // Issue 3: Safe Navigation with Array Index
  // ============================================================================
  {
    name: 'safe-nav-array-index',
    category: 'regressions',
    description: 'Array index after safe navigation should wrap the entire expression',
    className: 'SafeNavArrayIndexComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-array-index',
  standalone: true,
  template: \`
      <div>{{ items?.list[0] }}</div>
      <div>{{ data?.array[0]?.name }}</div>
    \`,
})
export class SafeNavArrayIndexComponent {
  items: any;
  data: any;
}
    `.trim(),
    // Expected: (items?.list)[0]
    // Actual: items?.list[0] (incorrect)
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
  {
    name: 'safe-nav-array-index-in-binding',
    category: 'regressions',
    description: 'Array index after safe navigation in property binding',
    className: 'SafeNavArrayIndexBindingComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-array-index-in-binding',
  standalone: true,
  template: \`
      <div [title]="user?.addresses[0]?.city"
           [attr.data-id]="items?.ids[0]">
        Content
      </div>
    \`,
})
export class SafeNavArrayIndexBindingComponent {
  user: any;
  items: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵproperty', 'ɵɵattribute'],
  },
  {
    name: 'safe-nav-array-index-method-call',
    category: 'regressions',
    description: 'Method call on array element after safe navigation',
    className: 'SafeNavArrayMethodComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-array-index-method-call',
  standalone: true,
  template: \`
      <div (click)="handleClick($event, data?.items[0])">
        {{ result?.values[0]?.toString() }}
      </div>
    \`,
})
export class SafeNavArrayMethodComponent {
  data: any;
  result: any;
  handleClick($event: any, item: any) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener', 'ɵɵtextInterpolate1'],
  },
  {
    name: 'safe-nav-array-index-chained',
    category: 'regressions',
    description: 'Multiple chained array accesses after safe navigation',
    className: 'SafeNavArrayChainedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-array-index-chained',
  standalone: true,
  template: \`
      <div>{{ matrix?.rows[0]?.cells[0]?.value }}</div>
      <div>{{ nested?.data?.items[0]?.children[0]?.name }}</div>
    \`,
})
export class SafeNavArrayChainedComponent {
  matrix: any;
  nested: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },

  // ============================================================================
  // Combined Issues (realistic ClickUp-like scenarios)
  // ============================================================================
  {
    name: 'clickup-theme-switcher-pattern',
    category: 'regressions',
    description: 'Pattern from appearance-theme-switcher.component: SVG in @for/@switch',
    className: 'ThemeSwitcherPatternComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-clickup-theme-switcher-pattern',
  standalone: true,
  template: \`
      @for (theme of themes; track theme.id) {
        <label [class.selected]="selectedTheme === theme.id">
          <input type="radio" [checked]="selectedTheme === theme.id" (click)="select(theme.id)" />
          @switch (theme.id) {
            @case ('light') {
              <svg class="theme-illustration" viewBox="0 0 116 60">
                <rect width="100" height="50" fill="#fff" />
              </svg>
            }
            @case ('dark') {
              <svg class="theme-illustration" viewBox="0 0 116 60">
                <rect width="100" height="50" fill="#1a1a1a" />
              </svg>
            }
          }
          <span>{{ theme.label }}</span>
        </label>
      }
    \`,
})
export class ThemeSwitcherPatternComponent {
  themes: any[] = [];
  selectedTheme: any;
  select(id: any) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵconditionalCreate'],
  },
  {
    name: 'clickup-live-user-card-pattern',
    category: 'regressions',
    description: 'Pattern from live-user-card.component: safe nav with array index',
    className: 'LiveUserCardPatternComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-clickup-live-user-card-pattern',
  standalone: true,
  template: \`
      @if (item?.activity?.currently_viewing) {
        <div class="viewing-task"
             [title]="viewingText + ': ' + item?.activity?.currently_viewing[0]?.name"
             (click)="handleOpenTask($event, item?.activity?.currently_viewing[0])">
          <div class="task-text">
            {{ viewingText }}: {{ item?.activity?.currently_viewing[0]?.name }}
          </div>
        </div>
      }
    \`,
})
export class LiveUserCardPatternComponent {
  item: any;
  viewingText: any;
  handleOpenTask($event: any, task: any) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵlistener', 'ɵɵproperty'],
  },
  {
    name: 'clickup-dashboard-box-pattern',
    category: 'regressions',
    description: 'Pattern from dashboard-box.component: multiple async pipes with safe nav',
    className: 'DashboardBoxPatternComponent',
    type: 'full-transform',
    sourceCode: `
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-clickup-dashboard-box-pattern',
  standalone: true,
  imports: [AsyncPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
      <div class="box-content">
        <div class="settings"
             [customField]="(boxSettings$ | async)?.workload?.field"
             [disableTimeEstimate]="(isGuestTeam$ | async) && !((team$ | async)?.guest_settings?.can_see_time_estimated)">
        </div>
        <div class="workload"
             [user]="user$ | async"
             [team]="team$ | async"
             [divisions]="divisionsAllSorted$ | async"
             [workloadField]="(boxSettings$ | async)?.workload?.field">
        </div>
      </div>
    \`,
})
export class DashboardBoxPatternComponent {
  boxSettings$: any;
  isGuestTeam$: any;
  team$: any;
  user$: any;
  divisionsAllSorted$: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵpipeBind1', 'ɵɵpipe', 'ɵɵproperty'],
  },
]
