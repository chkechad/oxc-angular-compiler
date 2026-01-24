/**
 * @defer blocks with hydration triggers (SSR).
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'defer-hydrate-idle',
    category: 'defer',
    description: '@defer with hydrate on idle for SSR',
    className: 'DeferHydrateIdleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-hydrate-idle',
  standalone: true,
  template: \`
    @defer (hydrate on idle) {
      <div>Hydrated on idle</div>
    }
  \`,
})
export class DeferHydrateIdleComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefer'],
  },
  {
    name: 'defer-hydrate-viewport',
    category: 'defer',
    description: '@defer with hydrate on viewport for SSR',
    className: 'DeferHydrateViewportComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-hydrate-viewport',
  standalone: true,
  template: \`
    @defer (hydrate on viewport) {
      <div>Hydrated on viewport</div>
    }
  \`,
})
export class DeferHydrateViewportComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefer'],
  },
  {
    name: 'defer-hydrate-interaction',
    category: 'defer',
    description: '@defer with hydrate on interaction for SSR',
    className: 'DeferHydrateInteractionComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-hydrate-interaction',
  standalone: true,
  template: \`
    @defer (hydrate on interaction) {
      <div>Hydrated on interaction</div>
    }
  \`,
})
export class DeferHydrateInteractionComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefer'],
  },
  {
    name: 'defer-hydrate-never',
    category: 'defer',
    description: '@defer with hydrate never for static SSR content',
    className: 'DeferHydrateNeverComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-hydrate-never',
  standalone: true,
  template: \`
    @defer (hydrate never) {
      <div>Never hydrated</div>
    }
  \`,
})
export class DeferHydrateNeverComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdefer'],
  },
]
