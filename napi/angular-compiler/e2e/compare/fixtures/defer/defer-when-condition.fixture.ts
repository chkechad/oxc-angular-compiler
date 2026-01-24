/**
 * @defer blocks with when condition.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'defer-when-basic',
    category: 'defer',
    description: '@defer with basic when condition',
    className: 'DeferWhenBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-when-basic',
  standalone: true,
  template: \`
    @defer (when isReady) {
      <div>Content loaded when ready</div>
    } @placeholder {
      <span>Waiting...</span>
    }
  \`,
})
export class DeferWhenBasicComponent {
  isReady = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-when-property-access',
    category: 'defer',
    description: '@defer with property access in when condition',
    className: 'DeferWhenPropertyAccessComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-when-property-access',
  standalone: true,
  template: \`
    @defer (when user.isLoggedIn) {
      <div>Welcome, {{ user.name }}!</div>
    } @placeholder {
      <span>Please log in</span>
    }
  \`,
})
export class DeferWhenPropertyAccessComponent {
  user = { isLoggedIn: false, name: 'Guest' };
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-when-comparison',
    category: 'defer',
    description: '@defer with comparison expression in when condition',
    className: 'DeferWhenComparisonComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-when-comparison',
  standalone: true,
  template: \`
    @defer (when count > 0) {
      <div>You have {{ count }} items</div>
    } @placeholder {
      <span>No items yet</span>
    }
  \`,
})
export class DeferWhenComparisonComponent {
  count = 0;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-when-logical-and',
    category: 'defer',
    description: '@defer with logical AND in when condition',
    className: 'DeferWhenLogicalAndComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-when-logical-and',
  standalone: true,
  template: \`
    @defer (when isReady && hasPermission) {
      <div>Access granted</div>
    } @placeholder {
      <span>Checking access...</span>
    }
  \`,
})
export class DeferWhenLogicalAndComponent {
  isReady = false;
  hasPermission = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-when-logical-or',
    category: 'defer',
    description: '@defer with logical OR in when condition',
    className: 'DeferWhenLogicalOrComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-when-logical-or',
  standalone: true,
  template: \`
    @defer (when isAdmin || isOwner) {
      <div>Admin content</div>
    } @placeholder {
      <span>Checking permissions...</span>
    }
  \`,
})
export class DeferWhenLogicalOrComponent {
  isAdmin = false;
  isOwner = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-when-negation',
    category: 'defer',
    description: '@defer with negation in when condition',
    className: 'DeferWhenNegationComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-when-negation',
  standalone: true,
  template: \`
    @defer (when !isLoading) {
      <div>Data loaded</div>
    } @placeholder {
      <span>Loading...</span>
    }
  \`,
})
export class DeferWhenNegationComponent {
  isLoading = true;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-on-idle-when',
    category: 'defer',
    description: '@defer with both on idle trigger and when condition',
    className: 'DeferOnIdleWhenComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-on-idle-when',
  standalone: true,
  template: \`
    @defer (on idle; when isReady) {
      <div>Loaded on idle when ready</div>
    } @placeholder {
      <span>Waiting...</span>
    }
  \`,
})
export class DeferOnIdleWhenComponent {
  isReady = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferOnIdle', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-on-viewport-when',
    category: 'defer',
    description: '@defer with on viewport trigger and when condition',
    className: 'DeferOnViewportWhenComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-on-viewport-when',
  standalone: true,
  template: \`
    @defer (on viewport; when shouldLoad) {
      <div>Visible and should load</div>
    } @placeholder {
      <span>Placeholder</span>
    }
  \`,
})
export class DeferOnViewportWhenComponent {
  shouldLoad = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferOnViewport', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-on-timer-when',
    category: 'defer',
    description: '@defer with on timer trigger and when condition',
    className: 'DeferOnTimerWhenComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-on-timer-when',
  standalone: true,
  template: \`
    @defer (on timer(1000ms); when dataReady) {
      <div>Timer fired and data ready</div>
    } @placeholder {
      <span>Waiting for timer and data</span>
    }
  \`,
})
export class DeferOnTimerWhenComponent {
  dataReady = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferOnTimer', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-on-hover-when',
    category: 'defer',
    description: '@defer with on hover trigger and when condition',
    className: 'DeferOnHoverWhenComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-on-hover-when',
  standalone: true,
  template: \`
    <button #trigger>Hover me</button>
    @defer (on hover(trigger); when isEnabled) {
      <div>Hovered and enabled</div>
    } @placeholder {
      <span>Hover when enabled</span>
    }
  \`,
})
export class DeferOnHoverWhenComponent {
  isEnabled = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferOnHover', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-on-interaction-when',
    category: 'defer',
    description: '@defer with on interaction trigger and when condition',
    className: 'DeferOnInteractionWhenComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-on-interaction-when',
  standalone: true,
  template: \`
    <button #btn>Click me</button>
    @defer (on interaction(btn); when canInteract) {
      <div>Interaction detected and allowed</div>
    } @placeholder {
      <span>Interact when allowed</span>
    }
  \`,
})
export class DeferOnInteractionWhenComponent {
  canInteract = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferOnInteraction', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-when-method-call',
    category: 'defer',
    description: '@defer with method call in when condition',
    className: 'DeferWhenMethodCallComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-when-method-call',
  standalone: true,
  template: \`
    @defer (when isDataLoaded()) {
      <div>Data is loaded</div>
    } @placeholder {
      <span>Checking data...</span>
    }
  \`,
})
export class DeferWhenMethodCallComponent {
  isDataLoaded() {
    return false;
  }
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-when-optional-chaining',
    category: 'defer',
    description: '@defer with optional chaining in when condition',
    className: 'DeferWhenOptionalChainingComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-when-optional-chaining',
  standalone: true,
  template: \`
    @defer (when user?.profile?.isComplete) {
      <div>Profile complete</div>
    } @placeholder {
      <span>Loading profile...</span>
    }
  \`,
})
export class DeferWhenOptionalChainingComponent {
  user: { profile?: { isComplete?: boolean } } | null = null;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-when-with-all-blocks',
    category: 'defer',
    description: '@defer when with loading, error, and placeholder blocks',
    className: 'DeferWhenWithAllBlocksComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-when-with-all-blocks',
  standalone: true,
  template: \`
    @defer (when isReady) {
      <div>Main content</div>
    } @loading {
      <span>Loading content...</span>
    } @error {
      <span>Failed to load</span>
    } @placeholder {
      <span>Waiting for ready state</span>
    }
  \`,
})
export class DeferWhenWithAllBlocksComponent {
  isReady = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferWhen'],
  },
  {
    name: 'defer-prefetch-when',
    category: 'defer',
    description: '@defer with prefetch when condition',
    className: 'DeferPrefetchWhenComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-defer-prefetch-when',
  standalone: true,
  template: \`
    @defer (on idle; prefetch when shouldPrefetch) {
      <div>Prefetched content</div>
    } @placeholder {
      <span>Will prefetch when condition met</span>
    }
  \`,
})
export class DeferPrefetchWhenComponent {
  shouldPrefetch = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵdefer', 'ɵɵdeferOnIdle', 'ɵɵdeferPrefetchWhen'],
  },
]
