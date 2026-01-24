/**
 * SVG foreignObject element fixtures.
 *
 * Tests namespace handling for foreignObject elements inside SVG.
 * Angular generates function names with `_svg_` prefix for elements inside SVG context,
 * e.g., `Component_svg_foreignObject_5_Template` vs `Component_foreignObject_5_Template`.
 *
 * Issue discovered in clickup comparison: connector-plugin-graphic.component.ts
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    type: 'full-transform',
    name: 'svg-foreign-object-ngif',
    category: 'templates',
    description: 'SVG with foreignObject using *ngIf structural directive',
    className: 'SvgForeignObjectNgIfComponent',
    sourceCode: `
import { Component } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-svg-foreign-object',
  standalone: true,
  imports: [NgIf],
  template: \`
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="50" fill="blue" />
      <foreignObject *ngIf="showContent" x="50" y="50" width="100" height="100">
        <div>Hello World</div>
      </foreignObject>
    </svg>
  \`
})
export class SvgForeignObjectNgIfComponent {
  showContent = true;
}
`.trim(),
    expectedFeatures: ['ɵɵdefineComponent', 'ɵɵtemplate'],
  },

  {
    type: 'full-transform',
    name: 'svg-foreign-object-ngfor',
    category: 'templates',
    description: 'SVG with foreignObject using *ngFor structural directive',
    className: 'SvgForeignObjectNgForComponent',
    sourceCode: `
import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-svg-foreign-object-for',
  standalone: true,
  imports: [NgFor],
  template: \`
    <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
      <foreignObject *ngFor="let item of items" [attr.x]="item.x" [attr.y]="item.y" width="50" height="50">
        <span>{{ item.label }}</span>
      </foreignObject>
    </svg>
  \`
})
export class SvgForeignObjectNgForComponent {
  items = [
    { x: 10, y: 10, label: 'A' },
    { x: 70, y: 10, label: 'B' }
  ];
}
`.trim(),
    expectedFeatures: ['ɵɵdefineComponent', 'ɵɵtemplate'],
  },

  {
    type: 'full-transform',
    name: 'svg-nested-foreign-object',
    category: 'templates',
    description: 'Nested SVG elements with foreignObject and structural directives',
    className: 'SvgNestedForeignObjectComponent',
    sourceCode: `
import { Component } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-svg-nested-foreign',
  standalone: true,
  imports: [NgIf, NgFor],
  template: \`
    <svg viewBox="0 0 200 200">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
      <g *ngFor="let line of lines">
        <path [attr.d]="line.path" stroke="black" />
      </g>
      <foreignObject *ngIf="hasContents" [attr.x]="textX" [attr.y]="textY" width="100" height="50">
        <div #textContent (click)="onClick()">
          <span>{{ contents }}</span>
        </div>
      </foreignObject>
    </svg>
  \`
})
export class SvgNestedForeignObjectComponent {
  lines = [{ path: 'M 10 10 L 100 100' }];
  hasContents = true;
  textX = 50;
  textY = 50;
  contents = 'Label';
  onClick() {}
}
`.trim(),
    expectedFeatures: ['ɵɵdefineComponent', 'ɵɵtemplate'],
  },

  {
    type: 'full-transform',
    name: 'svg-switch-case-elements',
    category: 'templates',
    description: 'SVG with switch/case containing different SVG elements',
    className: 'SvgSwitchCaseComponent',
    sourceCode: `
import { Component } from '@angular/core';
import { NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';

@Component({
  selector: 'app-svg-switch',
  standalone: true,
  imports: [NgSwitch, NgSwitchCase, NgSwitchDefault],
  template: \`
    <svg viewBox="0 0 100 100">
      <g [ngSwitch]="shapeType">
        <circle *ngSwitchCase="'circle'" cx="50" cy="50" r="40" />
        <rect *ngSwitchCase="'rect'" x="10" y="10" width="80" height="80" />
        <foreignObject *ngSwitchCase="'text'" x="0" y="0" width="100" height="100">
          <div>Text content</div>
        </foreignObject>
        <ellipse *ngSwitchDefault cx="50" cy="50" rx="40" ry="20" />
      </g>
    </svg>
  \`
})
export class SvgSwitchCaseComponent {
  shapeType = 'circle';
}
`.trim(),
    expectedFeatures: ['ɵɵdefineComponent', 'ɵɵtemplate'],
  },
]
