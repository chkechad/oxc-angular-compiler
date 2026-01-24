/**
 * @defer blocks with prefetch triggers.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'defer-prefetch-idle',
    category: 'defer',
    description: '@defer with prefetch on idle',
    className: 'DeferPrefetchIdleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-prefetch-idle',
  standalone: true,
  template: \`
    @defer (on viewport; prefetch on idle) {
      <div>Prefetched on idle</div>
    } @placeholder {
      <span>Loading...</span>
    }
  \`,
})
export class DeferPrefetchIdleComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferPrefetchOnIdle'],
  },
  {
    name: 'defer-prefetch-viewport',
    category: 'defer',
    description: '@defer with prefetch on viewport',
    className: 'DeferPrefetchViewportComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-prefetch-viewport',
  standalone: true,
  template: \`
    <button #btn>Click to load</button>
    @defer (on interaction(btn); prefetch on viewport) {
      <div>Prefetched on viewport</div>
    } @placeholder {
      <span>Loading...</span>
    }
  \`,
})
export class DeferPrefetchViewportComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferPrefetchOnViewport'],
  },
  {
    name: 'defer-prefetch-timer',
    category: 'defer',
    description: '@defer with prefetch on timer',
    className: 'DeferPrefetchTimerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-prefetch-timer',
  standalone: true,
  template: \`
    <button #btn>Click to load</button>
    @defer (on interaction(btn); prefetch on timer(1s)) {
      <div>Prefetched after timer</div>
    } @placeholder {
      <span>Loading...</span>
    }
  \`,
})
export class DeferPrefetchTimerComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferPrefetchOnTimer'],
  },
  {
    name: 'defer-prefetch-immediate',
    category: 'defer',
    description: '@defer with prefetch on immediate',
    className: 'DeferPrefetchImmediateComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-prefetch-immediate',
  standalone: true,
  template: \`
    @defer (on viewport; prefetch on immediate) {
      <div>Prefetched immediately</div>
    } @placeholder {
      <span>Loading...</span>
    }
  \`,
})
export class DeferPrefetchImmediateComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferPrefetchOnImmediate'],
  },
]
