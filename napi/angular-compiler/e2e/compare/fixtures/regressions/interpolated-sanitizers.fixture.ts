/**
 * Regression: Sanitizers for interpolated URLs.
 *
 * Issue: href="{{ url }}" and similar security-sensitive attributes
 * must use the correct sanitization functions.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'sanitizer-href-interpolation',
    category: 'regressions',
    description: 'Sanitized href with interpolation',
    className: 'SanitizerHrefInterpolationComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-sanitizer-href-interpolation',
  standalone: true,
  template: \`
      <a href="{{ url }}">Link</a>
      <a href="/path/{{ segment }}">Partial</a>
    \`,
})
export class SanitizerHrefInterpolationComponent {
  url = '';
  segment = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵpropertyInterpolate'],
  },
  {
    name: 'sanitizer-src-interpolation',
    category: 'regressions',
    description: 'Sanitized src attribute',
    className: 'SanitizerSrcInterpolationComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-sanitizer-src-interpolation',
  standalone: true,
  template: \`
      <img src="{{ imageUrl }}" alt="Image">
      <iframe src="{{ frameUrl }}"></iframe>
    \`,
})
export class SanitizerSrcInterpolationComponent {
  imageUrl = '';
  frameUrl = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵpropertyInterpolate'],
  },
  {
    name: 'sanitizer-style-binding',
    category: 'regressions',
    description: 'Sanitized style binding',
    className: 'SanitizerStyleBindingComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-sanitizer-style-binding',
  standalone: true,
  template: \`
      <div [style.backgroundImage]="'url(' + imageUrl + ')'">Styled</div>
    \`,
})
export class SanitizerStyleBindingComponent {
  imageUrl = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵstyleProp'],
  },
  {
    name: 'sanitizer-srcset',
    category: 'regressions',
    description: 'Sanitized srcset attribute',
    className: 'SanitizerSrcsetComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-sanitizer-srcset',
  standalone: true,
  template: \`
      <img [srcset]="imageSrcset" [src]="imageSrc" alt="Responsive">
    \`,
})
export class SanitizerSrcsetComponent {
  imageSrcset = '';
  imageSrc = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵproperty'],
  },
]
