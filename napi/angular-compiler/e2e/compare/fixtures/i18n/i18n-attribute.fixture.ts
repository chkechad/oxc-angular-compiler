/**
 * i18n attribute bindings.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'i18n-basic',
    category: 'i18n',
    description: 'Basic i18n attribute',
    className: 'I18nBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-basic',
  standalone: true,
  template: \`
      <h1 i18n>Welcome to our application</h1>
    \`,
})
export class I18nBasicComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd'],
  },
  {
    name: 'i18n-with-meaning',
    category: 'i18n',
    description: 'i18n with meaning and description',
    className: 'I18nWithMeaningComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-with-meaning',
  standalone: true,
  template: \`
      <p i18n="site header|Welcome message for users">Hello and welcome!</p>
    \`,
})
export class I18nWithMeaningComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd'],
  },
  {
    name: 'i18n-with-id',
    category: 'i18n',
    description: 'i18n with custom ID',
    className: 'I18nWithIdComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-with-id',
  standalone: true,
  template: \`
      <span i18n="@@customMessageId">Custom ID message</span>
    \`,
})
export class I18nWithIdComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd'],
  },
  {
    name: 'i18n-on-attribute',
    category: 'i18n',
    description: 'i18n on attribute values',
    className: 'I18nOnAttributeComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-on-attribute',
  standalone: true,
  template: \`
      <img src="logo.png" i18n-alt alt="Company Logo" i18n-title title="Click to go home" />
    \`,
})
export class I18nOnAttributeComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵi18nAttributes'],
  },
]
