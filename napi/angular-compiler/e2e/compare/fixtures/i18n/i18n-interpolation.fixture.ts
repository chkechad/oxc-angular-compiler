/**
 * i18n with interpolations and expressions.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'i18n-interpolation-basic',
    category: 'i18n',
    description: 'i18n with basic interpolation',
    className: 'I18nInterpolationBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-interpolation-basic',
  standalone: true,
  template: \`
      <p i18n>Hello, {{ userName }}! Welcome back.</p>
    \`,
})
export class I18nInterpolationBasicComponent {
  userName = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd', 'ɵɵi18nExp'],
  },
  {
    name: 'i18n-interpolation-multiple',
    category: 'i18n',
    description: 'i18n with multiple interpolations',
    className: 'I18nInterpolationMultipleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-interpolation-multiple',
  standalone: true,
  template: \`
      <div i18n>
        User {{ firstName }} {{ lastName }} logged in at {{ loginTime }}.
      </div>
    \`,
})
export class I18nInterpolationMultipleComponent {
  firstName = '';
  lastName = '';
  loginTime = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd', 'ɵɵi18nExp'],
  },
  {
    name: 'i18n-interpolation-expression',
    category: 'i18n',
    description: 'i18n with expression interpolation',
    className: 'I18nInterpolationExpressionComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-i18n-interpolation-expression',
  standalone: true,
  imports: [CurrencyPipe],
  template: \`
      <span i18n>Your balance is {{ balance | currency }}</span>
    \`,
})
export class I18nInterpolationExpressionComponent {
  balance = 0;
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd', 'ɵɵi18nExp', 'ɵɵpipe'],
  },
  {
    name: 'i18n-interpolation-in-attr',
    category: 'i18n',
    description: 'i18n attribute with interpolation',
    className: 'I18nInterpolationInAttrComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-interpolation-in-attr',
  standalone: true,
  template: \`
      <button i18n-title title="Click to greet {{ name }}">Greet</button>
    \`,
})
export class I18nInterpolationInAttrComponent {
  name = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nAttributes', 'ɵɵi18nExp'],
  },
]
