/**
 * @defer blocks with @loading and @placeholder timing modifiers.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'defer-placeholder-minimum',
    category: 'defer',
    description: '@placeholder with minimum display time',
    className: 'DeferPlaceholderMinimumComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-placeholder-minimum',
  standalone: true,
  template: \`
    @defer (on idle) {
      <div>Deferred content</div>
    } @placeholder (minimum 500ms) {
      <span>Loading placeholder...</span>
    }
  \`,
})
export class DeferPlaceholderMinimumComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferOnIdle'],
  },
  {
    name: 'defer-loading-after',
    category: 'defer',
    description: '@loading with after delay',
    className: 'DeferLoadingAfterComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-loading-after',
  standalone: true,
  template: \`
    @defer (on idle) {
      <div>Deferred content</div>
    } @loading (after 200ms) {
      <span>Loading...</span>
    } @placeholder {
      <span>Placeholder</span>
    }
  \`,
})
export class DeferLoadingAfterComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferOnIdle'],
  },
  {
    name: 'defer-loading-after-minimum',
    category: 'defer',
    description: '@loading with both after delay and minimum display time',
    className: 'DeferLoadingAfterMinimumComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-loading-after-minimum',
  standalone: true,
  template: \`
    @defer (on idle) {
      <div>Deferred content</div>
    } @loading (after 500ms; minimum 1s) {
      <span>Loading content...</span>
    } @placeholder {
      <span>Placeholder</span>
    }
  \`,
})
export class DeferLoadingAfterMinimumComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferOnIdle'],
  },
  {
    name: 'defer-all-timing-modifiers',
    category: 'defer',
    description: '@loading and @placeholder both with timing modifiers',
    className: 'DeferAllTimingModifiersComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-all-timing-modifiers',
  standalone: true,
  template: \`
    @defer (on viewport) {
      <div>Main deferred content</div>
    } @loading (after 100ms; minimum 500ms) {
      <div class="spinner">Loading...</div>
    } @placeholder (minimum 300ms) {
      <div class="skeleton">Skeleton placeholder</div>
    } @error {
      <div>Error loading content</div>
    }
  \`,
})
export class DeferAllTimingModifiersComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferOnViewport'],
  },
]
