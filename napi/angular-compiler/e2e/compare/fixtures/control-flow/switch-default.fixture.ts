/**
 * @switch with @case and @default blocks.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'switch-basic',
    category: 'control-flow',
    description: 'Basic @switch with @case blocks',
    className: 'SwitchBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-switch-basic',
  standalone: true,
  template: \`
    @switch (status) {
      @case ('loading') {
        <div>Loading...</div>
      }
      @case ('success') {
        <div>Success!</div>
      }
      @case ('error') {
        <div>Error occurred</div>
      }
    }
  \`,
})
export class SwitchBasicComponent {
  status: 'loading' | 'success' | 'error' = 'loading';
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional'],
  },
  {
    name: 'switch-with-default',
    category: 'control-flow',
    description: '@switch with @default block',
    className: 'SwitchWithDefaultComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-switch-with-default',
  standalone: true,
  template: \`
    @switch (color) {
      @case ('red') {
        <div class="red">Red</div>
      }
      @case ('blue') {
        <div class="blue">Blue</div>
      }
      @default {
        <div class="unknown">Unknown color</div>
      }
    }
  \`,
})
export class SwitchWithDefaultComponent {
  color = 'green';
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional'],
  },
  {
    name: 'switch-numeric',
    category: 'control-flow',
    description: '@switch with numeric cases',
    className: 'SwitchNumericComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-switch-numeric',
  standalone: true,
  template: \`
    @switch (count) {
      @case (0) {
        <div>Zero items</div>
      }
      @case (1) {
        <div>One item</div>
      }
      @default {
        <div>{{ count }} items</div>
      }
    }
  \`,
})
export class SwitchNumericComponent {
  count = 5;
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional'],
  },
  {
    name: 'switch-expression',
    category: 'control-flow',
    description: '@switch with expression',
    className: 'SwitchExpressionComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-switch-expression',
  standalone: true,
  template: \`
    @switch (user?.role) {
      @case ('admin') {
        <div>Admin panel</div>
      }
      @case ('user') {
        <div>User dashboard</div>
      }
      @default {
        <div>Guest view</div>
      }
    }
  \`,
})
export class SwitchExpressionComponent {
  user: { role: string } | null = { role: 'admin' };
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional'],
  },
  {
    name: 'switch-default-first',
    category: 'control-flow',
    description: '@switch with @default appearing first (order test)',
    className: 'SwitchDefaultFirstComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-switch-default-first',
  standalone: true,
  template: \`
    @switch (value) {
      @default {
        <div>Default</div>
      }
      @case (1) {
        <div>One</div>
      }
      @case (2) {
        <div>Two</div>
      }
    }
  \`,
})
export class SwitchDefaultFirstComponent {
  value = 3;
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional'],
  },
]
