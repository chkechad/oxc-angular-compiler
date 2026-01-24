/**
 * Structural directives on SVG elements.
 * Tests namespace handling for SVG elements with *ngIf, *ngFor, etc.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'svg-structural-if',
    category: 'templates',
    description: 'Structural directive (*ngIf) on SVG element',
    className: 'SvgStructuralIfComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-svg-structural-if',
  standalone: true,
  template: \`
      <svg *ngIf="showSvg" width="100" height="100">
        <circle cx="50" cy="50" r="40" fill="red" />
      </svg>
    \`,
})
export class SvgStructuralIfComponent {
  showSvg = true;
}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomTemplate instead of ɵɵtemplate
    expectedFeatures: ['ɵɵdomTemplate'],
  },
  {
    name: 'svg-structural-for',
    category: 'templates',
    description: 'Structural directive (*ngFor) on SVG element',
    className: 'SvgStructuralForComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-svg-structural-for',
  standalone: true,
  template: \`
      <svg *ngFor="let item of items" [attr.width]="item.width">
        <rect [attr.height]="item.height" />
      </svg>
    \`,
})
export class SvgStructuralForComponent {
  items: { width: number; height: number }[] = [];
}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomTemplate instead of ɵɵtemplate
    expectedFeatures: ['ɵɵdomTemplate'],
  },
  {
    name: 'svg-nested-structural',
    category: 'templates',
    description: 'Nested SVG with structural directive',
    className: 'SvgNestedStructuralComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-svg-nested-structural',
  standalone: true,
  template: \`
      <div>
        <svg *ngIf="visible" viewBox="0 0 100 100">
          <g *ngFor="let shape of shapes">
            <circle [attr.cx]="shape.x" [attr.cy]="shape.y" [attr.r]="shape.radius" />
          </g>
        </svg>
      </div>
    \`,
})
export class SvgNestedStructuralComponent {
  visible = true;
  shapes: { x: number; y: number; radius: number }[] = [];
}
    `.trim(),
    // Standalone components without directive imports use DomOnly mode,
    // which emits ɵɵdomTemplate instead of ɵɵtemplate
    expectedFeatures: ['ɵɵdomTemplate'],
  },
]
