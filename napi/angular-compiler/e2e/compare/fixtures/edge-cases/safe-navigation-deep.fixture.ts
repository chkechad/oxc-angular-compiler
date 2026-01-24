/**
 * Deep safe navigation chains.
 *
 * Tests deeply nested optional chaining (a?.b?.c?.d?.e) and various
 * combinations with method calls, array access, and complex expressions.
 * These patterns stress-test the null check code generation.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'safe-nav-very-deep',
    category: 'edge-cases',
    description: 'Very deep safe navigation chain (8+ levels)',
    className: 'SafeNavVeryDeepComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-very-deep',
  standalone: true,
  template: \`
      <div>{{ a?.b?.c?.d?.e?.f?.g?.h }}</div>
      <span>{{ root?.level1?.level2?.level3?.level4?.level5?.level6?.value }}</span>
    \`,
})
export class SafeNavVeryDeepComponent {
  a: any;
  root: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
  {
    name: 'safe-nav-with-array-access',
    category: 'edge-cases',
    description: 'Safe navigation with array indexing',
    className: 'SafeNavWithArrayAccessComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-with-array-access',
  standalone: true,
  template: \`
      <div>{{ items?.[0]?.name }}</div>
      <div>{{ data?.users?.[selectedIndex]?.profile?.avatar }}</div>
      <div>{{ matrix?.[row]?.[col]?.value }}</div>
    \`,
})
export class SafeNavWithArrayAccessComponent {
  items: any[] | null = null;
  data: any;
  selectedIndex = 0;
  matrix: any[][] | null = null;
  row = 0;
  col = 0;
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
  {
    name: 'safe-nav-with-computed-property',
    category: 'edge-cases',
    description: 'Safe navigation with computed property names',
    className: 'SafeNavWithComputedPropertyComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-with-computed-property',
  standalone: true,
  template: \`
      <div>{{ obj?.[key]?.value }}</div>
      <div>{{ config?.[section]?.[option]?.enabled }}</div>
    \`,
})
export class SafeNavWithComputedPropertyComponent {
  obj: any;
  key = 'test';
  config: any;
  section = 'general';
  option = 'theme';
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
  {
    name: 'safe-nav-mixed-call-and-property',
    category: 'edge-cases',
    description: 'Safe navigation mixing method calls and property access',
    className: 'SafeNavMixedCallAndPropertyComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-mixed-call-and-property',
  standalone: true,
  template: \`
      <div>{{ service?.getData()?.items?.[0]?.getName?.()?.trim?.() }}</div>
      <div>{{ user?.getProfile?.()?.settings?.getTheme?.()?.name }}</div>
    \`,
})
export class SafeNavMixedCallAndPropertyComponent {
  service: any;
  user: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
  {
    name: 'safe-nav-in-structural-directive',
    category: 'edge-cases',
    description: 'Safe navigation inside structural directive expressions',
    className: 'SafeNavInStructuralDirectiveComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-in-structural-directive',
  standalone: true,
  template: \`
      @if (user?.profile?.settings?.isActive) {
        <div>User is active</div>
      }
      @for (item of container?.data?.items; track item?.id) {
        <span>{{ item?.details?.label }}</span>
      }
    \`,
})
export class SafeNavInStructuralDirectiveComponent {
  user: any;
  container: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵrepeaterCreate'],
  },
  {
    name: 'safe-nav-with-pipe',
    category: 'edge-cases',
    description: 'Safe navigation combined with pipes',
    className: 'SafeNavWithPipeComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { UpperCasePipe, DatePipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-safe-nav-with-pipe',
  standalone: true,
  imports: [UpperCasePipe, DatePipe, DecimalPipe],
  template: \`
      <div>{{ user?.profile?.name | uppercase }}</div>
      <div>{{ (data?.timestamp | date:'short') ?? 'No date' }}</div>
      <div>{{ list?.items?.[0]?.value | number:'1.2-2' }}</div>
    \`,
})
export class SafeNavWithPipeComponent {
  user: any;
  data: any;
  list: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵpipe', 'ɵɵpipeBind1', 'ɵɵpipeBind2'],
  },
  {
    name: 'safe-nav-ternary-complex',
    category: 'edge-cases',
    description: 'Safe navigation in complex ternary expressions',
    className: 'SafeNavTernaryComplexComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-ternary-complex',
  standalone: true,
  template: \`
      <div>{{ a?.b?.c ? x?.y?.z : p?.q?.r }}</div>
      <div>{{ (user?.role?.name === 'admin' ? user?.adminSettings?.theme : user?.userSettings?.theme) ?? 'default' }}</div>
    \`,
})
export class SafeNavTernaryComplexComponent {
  a: any;
  x: any;
  p: any;
  user: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
  {
    name: 'safe-nav-all-binding-types',
    category: 'edge-cases',
    description: 'Safe navigation in all binding types',
    className: 'SafeNavAllBindingTypesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-all-binding-types',
  standalone: true,
  template: \`
      <div
        [title]="data?.meta?.title"
        [class.active]="item?.state?.flags?.isActive"
        [style.color]="theme?.colors?.primary?.main"
        [attr.data-id]="record?.info?.id"
        (click)="handler?.callback?.($event)">
        {{ content?.body?.text }}
      </div>
    \`,
})
export class SafeNavAllBindingTypesComponent {
  data: any;
  item: any;
  theme: any;
  record: any;
  handler: any;
  content: any;
}
    `.trim(),
    expectedFeatures: ['ɵɵproperty', 'ɵɵclassProp', 'ɵɵstyleProp', 'ɵɵattribute', 'ɵɵlistener'],
  },
]
