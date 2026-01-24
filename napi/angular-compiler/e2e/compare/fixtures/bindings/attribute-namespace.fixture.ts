/**
 * Namespaced attribute bindings (SVG, MathML).
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'svg-basic',
    category: 'bindings',
    description: 'Basic SVG element bindings',
    className: 'SvgBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-svg-basic',
  standalone: true,
  template: \`
    <svg width="100" height="100">
      <circle [attr.cx]="cx" [attr.cy]="cy" [attr.r]="radius" [attr.fill]="color" />
    </svg>
  \`,
})
export class SvgBasicComponent {
  cx = 50;
  cy = 50;
  radius = 40;
  color = 'blue';
}
    `.trim(),
    expectedFeatures: ['ɵɵattribute'],
  },
  {
    name: 'svg-xlink',
    category: 'bindings',
    description: 'SVG xlink namespace binding',
    className: 'SvgXlinkComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-svg-xlink',
  standalone: true,
  template: \`
    <svg>
      <use [attr.xlink:href]="iconRef"></use>
    </svg>
  \`,
})
export class SvgXlinkComponent {
  iconRef = '#icon-star';
}
    `.trim(),
    expectedFeatures: ['ɵɵattribute'],
  },
  {
    name: 'svg-viewbox',
    category: 'bindings',
    description: 'SVG viewBox binding',
    className: 'SvgViewBoxComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-svg-viewbox',
  standalone: true,
  template: \`
    <svg [attr.viewBox]="viewBox">
      <rect x="0" y="0" [attr.width]="width" [attr.height]="height" />
    </svg>
  \`,
})
export class SvgViewBoxComponent {
  viewBox = '0 0 100 100';
  width = 100;
  height = 100;
}
    `.trim(),
    expectedFeatures: ['ɵɵattribute'],
  },
  {
    name: 'mathml-basic',
    category: 'bindings',
    description: 'Basic MathML element',
    className: 'MathmlBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-mathml-basic',
  standalone: true,
  template: \`
    <math>
      <mfrac>
        <mi>{{ numerator }}</mi>
        <mi>{{ denominator }}</mi>
      </mfrac>
    </math>
  \`,
})
export class MathmlBasicComponent {
  numerator = 'x';
  denominator = 'y';
}
    `.trim(),
    expectedFeatures: ['ɵɵelement'],
  },
  {
    name: 'attr-binding-various',
    category: 'bindings',
    description: 'Various attribute bindings',
    className: 'AttrBindingVariousComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-attr-binding-various',
  standalone: true,
  template: \`
    <a [attr.href]="url"
       [attr.target]="target"
       [attr.rel]="rel"
       [attr.aria-label]="label"
       [attr.data-id]="dataId">
      Link
    </a>
  \`,
})
export class AttrBindingVariousComponent {
  url = 'https://example.com';
  target = '_blank';
  rel = 'noopener';
  label = 'Example link';
  dataId = '123';
}
    `.trim(),
    expectedFeatures: ['ɵɵattribute'],
  },
  {
    name: 'attr-interpolation',
    category: 'bindings',
    description: 'Attribute with interpolation',
    className: 'AttrInterpolationComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-attr-interpolation',
  standalone: true,
  template: \`
    <img src="/images/{{ imageName }}.png" alt="Image: {{ imageName }}" />
  \`,
})
export class AttrInterpolationComponent {
  imageName = 'logo';
}
    `.trim(),
    expectedFeatures: ['ɵɵpropertyInterpolate'],
  },
]
