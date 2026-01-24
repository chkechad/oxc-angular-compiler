/**
 * Exact reproduction of the ClickUp theme-switcher mismatch.
 *
 * This fixture reproduces the EXACT difference found in compare-report.json.
 *
 * ## The Specific Issue
 *
 * In the `ThemeSwitcherPatternComponent_For_1_Template` function, the
 * `conditionalCreate` call for SVG elements has incorrect tag names:
 *
 * Expected (TypeScript Angular):
 * ```javascript
 * i0.ɵɵconditionalCreate(2, ..._Case_2_Template, 2, 0, ":svg:svg", 2)
 * ```
 *
 * Actual (OXC):
 * ```javascript
 * i0.ɵɵconditionalCreate(2, ..._Case_2_Template, 2, 0, "svg", 2)
 * ```
 *
 * ## Root Cause
 *
 * When an SVG element is the root of a conditional branch template inside
 * `@switch/@case` that is NESTED within a `@for` loop, the tag argument to
 * `conditionalCreate` should include the `:svg:` namespace prefix (`:svg:svg`),
 * but OXC is emitting just `svg`.
 *
 * ## Key Finding
 *
 * The issue is ONLY triggered when:
 * 1. SVG is inside `@switch/@case`, AND
 * 2. That `@switch` is nested inside a `@for` loop
 *
 * The following do NOT reproduce the issue (they all pass):
 * - SVG in `@if` (without nesting in `@for`)
 * - SVG in `@if/@else` (without nesting in `@for`)
 * - SVG in `@switch` at root level (without `@for`)
 * - SVG directly in `@for` (without `@switch`)
 *
 * ## Template Structure That Triggers This
 *
 * ```html
 * @for (item of items; track item.id) {
 *   @switch (item.type) {
 *     @case ('x') {
 *       <svg>...</svg>  <!-- This gets wrong tag: "svg" instead of ":svg:svg" -->
 *     }
 *   }
 * }
 * ```
 *
 * ## Files to Fix
 *
 * - crates/oxc_angular_compiler/src/pipeline/phases/reify/mod.rs
 *   (where ConditionalOp/ConditionalBranchCreateOp emits the tag)
 * - The `tag` field for these ops needs to include the namespace prefix
 *   specifically when processing conditional branches inside repeaters
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  // ==========================================================================
  // Minimal Reproduction: SVG inside @for/@switch
  // ==========================================================================
  // This is the minimal version of clickup-theme-switcher-pattern
  {
    name: 'clickup-exact-minimal',
    category: 'regressions',
    description: 'Minimal reproduction: SVG root element in @switch/@case inside @for',
    className: 'SvgInSwitchCaseComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-clickup-exact-minimal',
  standalone: true,
  template: \`
      @for (item of items; track item.id) {
        @switch (item.type) {
          @case ('circle') {
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" />
            </svg>
          }
          @case ('rect') {
            <svg viewBox="0 0 100 100">
              <rect width="80" height="80" />
            </svg>
          }
        }
      }
    \`,
})
export class SvgInSwitchCaseComponent {
  items: any[] = [];
}
    `.trim(),
    // The tag argument to conditionalCreate should be ":svg:svg", not "svg"
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵconditionalCreate'],
  },

  // ==========================================================================
  // Exact ClickUp Pattern
  // ==========================================================================
  // This matches the exact template from appearance-theme-switcher.component
  {
    name: 'clickup-exact-theme-switcher',
    category: 'regressions',
    description: 'Exact ClickUp appearance-theme-switcher.component pattern',
    className: 'ThemeSwitcherExactComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-clickup-exact-theme-switcher',
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
export class ThemeSwitcherExactComponent {
  themes: any[] = [];
  selectedTheme: any;
  select(id: any) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵconditionalCreate'],
  },

  // ==========================================================================
  // Control Test: SVG in @if (NOT nested in @for - should PASS)
  // ==========================================================================
  // This is a control test. SVG in @if at root level works correctly.
  // The issue is specific to @switch inside @for.
  {
    name: 'clickup-exact-svg-in-if',
    category: 'regressions',
    description: 'Control: SVG in @if (not in @for) - should pass',
    className: 'SvgInIfComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-clickup-exact-svg-in-if',
  standalone: true,
  template: \`
      @if (showIcon) {
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
        </svg>
      }
    \`,
})
export class SvgInIfComponent {
  showIcon: any;
}
    `.trim(),
    // This should pass - the issue only occurs with @switch inside @for
    expectedFeatures: ['ɵɵconditionalCreate'],
  },

  // ==========================================================================
  // Control Test: SVG in @if/@else (NOT nested in @for - should PASS)
  // ==========================================================================
  {
    name: 'clickup-exact-svg-in-if-else',
    category: 'regressions',
    description: 'Control: SVG in @if/@else (not in @for) - should pass',
    className: 'SvgInIfElseComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-clickup-exact-svg-in-if-else',
  standalone: true,
  template: \`
      @if (isDark) {
        <svg class="dark-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
        </svg>
      } @else {
        <svg class="light-icon" viewBox="0 0 24 24">
          <rect width="20" height="20" x="2" y="2" />
        </svg>
      }
    \`,
})
export class SvgInIfElseComponent {
  isDark: any;
}
    `.trim(),
    // This should pass - the issue only occurs with @switch inside @for
    expectedFeatures: ['ɵɵconditionalCreate'],
  },
]
