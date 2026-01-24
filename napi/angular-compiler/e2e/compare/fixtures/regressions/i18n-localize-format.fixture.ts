/**
 * Regression: i18n $localize tagged template literal format.
 *
 * CRITICAL BUG: OXC generates empty strings in $localize calls instead of
 * the actual i18n message content and ID.
 *
 * Expected (Angular):
 *   i18n_0 = $localize `:@@message-id:Message text`;
 *
 * Actual (OXC):
 *   i18n_0 = $localize((this && this.__makeTemplateObject || function(e, t) {
 *     return Object.defineProperty ? ... })([""], [""]));
 *
 * Runtime Impact: All i18n text renders as empty strings instead of localized content.
 *
 * Found in: ClickUp comparison (101 files, 1472 occurrences)
 * Example file: forgot-password-button.component.ts
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'i18n-basic-with-id',
    category: 'regressions',
    description: 'Basic i18n with custom ID should emit tagged template literal',
    className: 'I18nBasicIdComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-basic-with-id',
  standalone: true,
  template: \`
      <span i18n="@@my-message-id">Hello World</span>
    \`,
})
export class I18nBasicIdComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵi18n', '$localize'],
  },
  {
    name: 'i18n-multiple-messages',
    category: 'regressions',
    description: 'Multiple i18n messages in same template',
    className: 'I18nMultipleMessagesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-multiple-messages',
  standalone: true,
  template: \`
      <h1 i18n="@@page-title">Welcome</h1>
      <p i18n="@@page-description">This is a description</p>
      <button i18n="@@submit-button">Submit</button>
    \`,
})
export class I18nMultipleMessagesComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵi18n', '$localize'],
  },
  {
    name: 'i18n-with-meaning-description',
    category: 'regressions',
    description: 'i18n with meaning and description metadata',
    className: 'I18nMeaningDescComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-with-meaning-description',
  standalone: true,
  template: \`
      <span i18n="login form|Link text for forgot password@@forgot-password-link">Forgot Password?</span>
    \`,
})
export class I18nMeaningDescComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵi18n', '$localize'],
  },
  {
    name: 'i18n-in-conditional',
    category: 'regressions',
    description: 'i18n inside @if conditional block',
    className: 'I18nConditionalComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-in-conditional',
  standalone: true,
  template: \`
      @if (showMessage) {
        <span i18n="@@conditional-message">Conditional text</span>
      } @else {
        <span i18n="@@alternative-message">Alternative text</span>
      }
    \`,
})
export class I18nConditionalComponent {
  showMessage = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵi18n', 'ɵɵconditional', '$localize'],
  },
  {
    name: 'i18n-attribute-binding',
    category: 'regressions',
    description: 'i18n on attribute values',
    className: 'I18nAttributeComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-attribute-binding',
  standalone: true,
  template: \`
      <input i18n-placeholder="@@input-placeholder" placeholder="Enter your name" />
      <img i18n-alt="@@image-alt" alt="Company logo" src="logo.png" />
    \`,
})
export class I18nAttributeComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵi18nAttributes', '$localize'],
  },
  {
    name: 'i18n-with-interpolation',
    category: 'regressions',
    description: 'i18n with interpolation expressions',
    className: 'I18nInterpolationComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-with-interpolation',
  standalone: true,
  template: \`
      <span i18n="@@greeting">Hello, {{ userName }}!</span>
      <p i18n="@@item-count">You have {{ count }} items in your cart.</p>
    \`,
})
export class I18nInterpolationComponent {
  userName = '';
  count = 0;
}
    `.trim(),
    expectedFeatures: ['ɵɵi18n', 'ɵɵi18nExp', '$localize'],
  },
]
