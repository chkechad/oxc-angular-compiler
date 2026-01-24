/**
 * Regression: UTF-8 characters in template literals.
 *
 * Issue: Unicode characters in templates must be properly encoded
 * in generated JavaScript string literals.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'utf8-basic-text',
    category: 'regressions',
    description: 'Basic UTF-8 text content',
    className: 'Utf8BasicTextComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-utf8-basic-text',
  standalone: true,
  template: \`
      <h1>Welcome \u6b22\u8fce \u0645\u0631\u062d\u0628\u0627 \u3088\u3046\u3053\u305d</h1>
      <p>Emoji: \ud83c\udf89 \ud83d\ude80 \u2728 \ud83d\udca1</p>
    \`,
})
export class Utf8BasicTextComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵtext'],
  },
  {
    name: 'utf8-in-interpolation',
    category: 'regressions',
    description: 'UTF-8 in interpolations',
    className: 'Utf8InInterpolationComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-utf8-in-interpolation',
  standalone: true,
  template: \`
      <div>{{ greeting }} \u4e16\u754c!</div>
      <span>Status: {{ status }} \u2713</span>
    \`,
})
export class Utf8InInterpolationComponent {
  greeting = '';
  status = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
  {
    name: 'utf8-in-attributes',
    category: 'regressions',
    description: 'UTF-8 in attribute values',
    className: 'Utf8InAttributesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-utf8-in-attributes',
  standalone: true,
  template: \`
      <button title="\u70b9\u51fb\u8fd9\u91cc \u25b6">\u6309\u94ae</button>
      <input placeholder="\u641c\u7d22... \ud83d\udd0d">
    \`,
})
export class Utf8InAttributesComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelement'],
  },
  {
    name: 'utf8-special-chars',
    category: 'regressions',
    description: 'Special characters that need escaping',
    className: 'Utf8SpecialCharsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-utf8-special-chars',
  standalone: true,
  template: \`
      <div>Quote: "hello" and 'world'</div>
      <div>Backslash: path\\\\to\\\\file</div>
      <div>Newline chars preserved</div>
    \`,
})
export class Utf8SpecialCharsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵtext'],
  },
]
