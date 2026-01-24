/**
 * Legacy structural directive microsyntax.
 *
 * Tests the *ngIf, *ngFor, *ngSwitch microsyntax which expands
 * to ng-template with the corresponding directive.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'ngif-basic',
    category: 'regressions',
    description: '*ngIf basic condition',
    className: 'NgIfBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ngif-basic',
  standalone: true,
  template: \`
      <div *ngIf="condition">Visible when condition is true</div>
    \`,
})
export class NgIfBasicComponent {
  condition = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate'],
  },
  {
    name: 'ngif-else',
    category: 'regressions',
    description: '*ngIf with else block',
    className: 'NgIfElseComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ngif-else',
  standalone: true,
  template: \`
      <div *ngIf="condition; else elseBlock">Condition is true</div>
      <ng-template #elseBlock>Condition is false</ng-template>
    \`,
})
export class NgIfElseComponent {
  condition = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate'],
  },
  {
    name: 'ngif-then-else',
    category: 'regressions',
    description: '*ngIf with then and else blocks',
    className: 'NgIfThenElseComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ngif-then-else',
  standalone: true,
  template: \`
      <ng-container *ngIf="condition; then thenBlock; else elseBlock"></ng-container>
      <ng-template #thenBlock>Shown when true</ng-template>
      <ng-template #elseBlock>Shown when false</ng-template>
    \`,
})
export class NgIfThenElseComponent {
  condition = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate'],
  },
  {
    name: 'ngif-as',
    category: 'regressions',
    description: '*ngIf with as variable',
    className: 'NgIfAsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-ngif-as',
  standalone: true,
  template: \`
      <div *ngIf="asyncData$ | async as data">{{ data.value }}</div>
    \`,
})
export class NgIfAsComponent {
  asyncData$: Observable<{ value: string }> = of({ value: '' });
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate', 'ɵɵpipe'],
  },
  {
    name: 'ngfor-basic',
    category: 'regressions',
    description: '*ngFor basic iteration',
    className: 'NgForBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ngfor-basic',
  standalone: true,
  template: \`
      <div *ngFor="let item of items">{{ item.name }}</div>
    \`,
})
export class NgForBasicComponent {
  items: { name: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate'],
  },
  {
    name: 'ngfor-trackby',
    category: 'regressions',
    description: '*ngFor with trackBy function',
    className: 'NgForTrackByComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ngfor-trackby',
  standalone: true,
  template: \`
      <div *ngFor="let item of items; trackBy: trackByFn">{{ item.name }}</div>
    \`,
})
export class NgForTrackByComponent {
  items: { id: number; name: string }[] = [];
  trackByFn(index: number, item: { id: number }) { return item.id; }
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate'],
  },
  {
    name: 'ngfor-index',
    category: 'regressions',
    description: '*ngFor with index variable',
    className: 'NgForIndexComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ngfor-index',
  standalone: true,
  template: \`
      <div *ngFor="let item of items; let i = index">{{ i }}: {{ item.name }}</div>
    \`,
})
export class NgForIndexComponent {
  items: { name: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate'],
  },
  {
    name: 'ngfor-all-variables',
    category: 'regressions',
    description: '*ngFor with all context variables',
    className: 'NgForAllVariablesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ngfor-all-variables',
  standalone: true,
  template: \`
      <div *ngFor="let item of items; let i = index; let first = first; let last = last; let even = even; let odd = odd">
        <span [class.first]="first" [class.last]="last" [class.even]="even" [class.odd]="odd">
          {{ i }}: {{ item.name }}
        </span>
      </div>
    \`,
})
export class NgForAllVariablesComponent {
  items: { name: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate'],
  },
  {
    name: 'ngswitch-basic',
    category: 'regressions',
    description: '*ngSwitch with ngSwitchCase and ngSwitchDefault',
    className: 'NgSwitchBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ngswitch-basic',
  standalone: true,
  template: \`
      <div [ngSwitch]="value">
        <span *ngSwitchCase="'A'">Case A</span>
        <span *ngSwitchCase="'B'">Case B</span>
        <span *ngSwitchCase="'C'">Case C</span>
        <span *ngSwitchDefault>Default case</span>
      </div>
    \`,
})
export class NgSwitchBasicComponent {
  value = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate', 'ɵɵproperty'],
  },
  {
    name: 'ngswitch-multiple-cases',
    category: 'regressions',
    description: '*ngSwitch with multiple cases for same value',
    className: 'NgSwitchMultipleCasesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ngswitch-multiple-cases',
  standalone: true,
  template: \`
      <ng-container [ngSwitch]="status">
        <div *ngSwitchCase="'loading'">Loading...</div>
        <div *ngSwitchCase="'error'">Error occurred</div>
        <div *ngSwitchCase="'success'">Operation successful</div>
        <div *ngSwitchDefault>Unknown status</div>
      </ng-container>
    \`,
})
export class NgSwitchMultipleCasesComponent {
  status = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate', 'ɵɵproperty'],
  },
  {
    name: 'ngif-nested',
    category: 'regressions',
    description: 'Nested *ngIf directives',
    className: 'NgIfNestedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ngif-nested',
  standalone: true,
  template: \`
      <div *ngIf="outer">
        <div *ngIf="inner">Both conditions are true</div>
      </div>
    \`,
})
export class NgIfNestedComponent {
  outer = false;
  inner = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate'],
  },
  {
    name: 'ngfor-ngif-combined',
    category: 'regressions',
    description: '*ngFor with *ngIf on ng-container',
    className: 'NgForNgIfCombinedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-ngfor-ngif-combined',
  standalone: true,
  template: \`
      <ng-container *ngFor="let item of items">
        <div *ngIf="item.visible">{{ item.name }}</div>
      </ng-container>
    \`,
})
export class NgForNgIfCombinedComponent {
  items: { name: string; visible: boolean }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate'],
  },
]
