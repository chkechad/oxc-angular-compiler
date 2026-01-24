/**
 * Mixed control flow: Combining new @if/@for syntax with legacy *ngIf/*ngFor.
 *
 * Tests templates that use both the new built-in control flow syntax (@if, @for, @switch)
 * alongside the legacy structural directive microsyntax (*ngIf, *ngFor, *ngSwitch).
 * This is a valid pattern during migration from legacy to modern control flow.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'mixed-new-if-legacy-for',
    category: 'edge-cases',
    description: 'New @if with legacy *ngFor',
    className: 'MixedNewIfLegacyForComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-mixed-new-if-legacy-for',
  standalone: true,
  imports: [NgFor],
  template: \`
      @if (showItems) {
        <div *ngFor="let item of items">{{ item.name }}</div>
      }
    \`,
})
export class MixedNewIfLegacyForComponent {
  showItems = true;
  items: { name: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵtemplate'],
  },
  {
    name: 'mixed-legacy-if-new-for',
    category: 'edge-cases',
    description: 'Legacy *ngIf with new @for',
    className: 'MixedLegacyIfNewForComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-mixed-legacy-if-new-for',
  standalone: true,
  imports: [NgIf],
  template: \`
      <div *ngIf="showItems">
        @for (item of items; track item.id) {
          <span>{{ item.name }}</span>
        }
      </div>
    \`,
})
export class MixedLegacyIfNewForComponent {
  showItems = true;
  items: { id: number; name: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate', 'ɵɵrepeaterCreate'],
  },
  {
    name: 'mixed-sibling-control-flow',
    category: 'edge-cases',
    description: 'Sibling elements with mixed control flow',
    className: 'MixedSiblingControlFlowComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-mixed-sibling-control-flow',
  standalone: true,
  imports: [NgIf],
  template: \`
      <div *ngIf="showHeader">Header</div>
      @if (showContent) {
        <main>Content</main>
      }
      <footer *ngIf="showFooter">Footer</footer>
    \`,
})
export class MixedSiblingControlFlowComponent {
  showHeader = true;
  showContent = true;
  showFooter = true;
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵtemplate'],
  },
  {
    name: 'mixed-nested-control-flow',
    category: 'edge-cases',
    description: 'Deeply nested mixed control flow',
    className: 'MixedNestedControlFlowComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-mixed-nested-control-flow',
  standalone: true,
  imports: [NgIf, NgFor],
  template: \`
      <div *ngIf="level1">
        @if (level2) {
          <div *ngFor="let item of items">
            @for (subItem of item.children; track subItem.id) {
              <span>{{ subItem.value }}</span>
            }
          </div>
        }
      </div>
    \`,
})
export class MixedNestedControlFlowComponent {
  level1 = true;
  level2 = true;
  items: { children: { id: number; value: string }[] }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate', 'ɵɵconditional', 'ɵɵrepeaterCreate'],
  },
  {
    name: 'mixed-switch-variants',
    category: 'edge-cases',
    description: 'New @switch alongside legacy ngSwitch',
    className: 'MixedSwitchVariantsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';

@Component({
  selector: 'app-mixed-switch-variants',
  standalone: true,
  imports: [NgSwitch, NgSwitchCase, NgSwitchDefault],
  template: \`
      <div [ngSwitch]="legacyValue">
        <span *ngSwitchCase="'a'">Legacy A</span>
        <span *ngSwitchCase="'b'">Legacy B</span>
        <span *ngSwitchDefault>Legacy Default</span>
      </div>
      @switch (modernValue) {
        @case ('x') { <span>Modern X</span> }
        @case ('y') { <span>Modern Y</span> }
        @default { <span>Modern Default</span> }
      }
    \`,
})
export class MixedSwitchVariantsComponent {
  legacyValue = 'a';
  modernValue = 'x';
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate', 'ɵɵconditional', 'ɵɵproperty'],
  },
  {
    name: 'mixed-control-flow-with-else',
    category: 'edge-cases',
    description: 'Mixed control flow with else blocks',
    className: 'MixedControlFlowWithElseComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-mixed-control-flow-with-else',
  standalone: true,
  imports: [NgIf],
  template: \`
      <div *ngIf="condition; else legacyElse">Legacy If</div>
      <ng-template #legacyElse>Legacy Else</ng-template>
      @if (otherCondition) {
        <span>Modern If</span>
      } @else {
        <span>Modern Else</span>
      }
    \`,
})
export class MixedControlFlowWithElseComponent {
  condition = true;
  otherCondition = true;
}
    `.trim(),
    expectedFeatures: ['ɵɵtemplate', 'ɵɵconditional'],
  },
]
