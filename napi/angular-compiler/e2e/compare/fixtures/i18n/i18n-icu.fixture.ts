/**
 * ICU expressions (plural, select).
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'i18n-plural-basic',
    category: 'i18n',
    description: 'Basic plural ICU expression',
    className: 'I18nPluralBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-plural-basic',
  standalone: true,
  template: \`
      <span i18n>{count, plural,
        =0 {No items}
        =1 {One item}
        other {{{count}} items}
      }</span>
    \`,
})
export class I18nPluralBasicComponent {
  count = 0;
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd'],
  },
  {
    name: 'i18n-plural-extended',
    category: 'i18n',
    description: 'Plural with more categories',
    className: 'I18nPluralExtendedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-plural-extended',
  standalone: true,
  template: \`
      <div i18n>{messages, plural,
        =0 {No new messages}
        =1 {You have one new message}
        =2 {You have two new messages}
        few {You have a few messages}
        many {You have many messages}
        other {You have {{messages}} new messages}
      }</div>
    \`,
})
export class I18nPluralExtendedComponent {
  messages = 0;
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd'],
  },
  {
    name: 'i18n-select-basic',
    category: 'i18n',
    description: 'Basic select ICU expression',
    className: 'I18nSelectBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-select-basic',
  standalone: true,
  template: \`
      <span i18n>{gender, select,
        male {He is online}
        female {She is online}
        other {They are online}
      }</span>
    \`,
})
export class I18nSelectBasicComponent {
  gender = 'other';
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd'],
  },
  {
    name: 'i18n-nested-icu',
    category: 'i18n',
    description: 'Nested plural and select',
    className: 'I18nNestedIcuComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-nested-icu',
  standalone: true,
  template: \`
      <div i18n>{gender, select,
        male {{count, plural, =1 {He has one friend} other {He has {{count}} friends}}}
        female {{count, plural, =1 {She has one friend} other {She has {{count}} friends}}}
        other {{count, plural, =1 {They have one friend} other {They have {{count}} friends}}}
      }</div>
    \`,
})
export class I18nNestedIcuComponent {
  gender = 'other';
  count = 0;
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd'],
  },
  {
    name: 'i18n-select-with-pipe',
    category: 'i18n',
    description: 'ICU select with pipe in each case - tests pipe slot allocation',
    className: 'I18nSelectWithPipeComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-i18n-select-with-pipe',
  standalone: true,
  imports: [UpperCasePipe],
  template: \`
      <span i18n>{action, select,
        open {Opened {{label | uppercase}}}
        merge {Merged {{label | uppercase}}}
        close {Closed {{label | uppercase}}}
        other {Action: {{label | uppercase}}}
      }</span>
    \`,
})
export class I18nSelectWithPipeComponent {
  action = 'open';
  label = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd', 'ɵɵpipe'],
  },
  {
    name: 'i18n-plural-with-pipe',
    category: 'i18n',
    description: 'ICU plural with pipe in each case',
    className: 'I18nPluralWithPipeComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { LowerCasePipe } from '@angular/common';

@Component({
  selector: 'app-i18n-plural-with-pipe',
  standalone: true,
  imports: [LowerCasePipe],
  template: \`
      <div i18n>{count, plural,
        =0 {No {{itemType | lowercase}} found}
        =1 {One {{itemType | lowercase}} found}
        other {{{count}} {{itemType | lowercase}} found}
      }</div>
    \`,
})
export class I18nPluralWithPipeComponent {
  count = 0;
  itemType = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd', 'ɵɵpipe'],
  },
  {
    name: 'i18n-nested-icu-with-pipe-switch',
    category: 'i18n',
    description:
      'Nested ICU where inner ICU switch value uses a pipe - tests unique VAR slot allocation',
    className: 'I18nNestedIcuWithPipeSwitchComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-i18n-nested-icu-with-pipe-switch',
  standalone: true,
  imports: [UpperCasePipe],
  template: \`
      <span i18n>{action, select,
        open {{(label | uppercase), select, yes {Opened: YES} no {Opened: NO} other {Opened: {{label | uppercase}}}}}
        close {{(label | uppercase), select, yes {Closed: YES} no {Closed: NO} other {Closed: {{label | uppercase}}}}}
        other {Unknown action}
      }</span>
    \`,
})
export class I18nNestedIcuWithPipeSwitchComponent {
  action = 'open';
  label = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd', 'ɵɵpipe'],
  },
  {
    name: 'i18n-nested-icu-repeated-pipe',
    category: 'i18n',
    description:
      'Nested ICU with repeated pipe expression in multiple branches - regression test for slot deduplication',
    className: 'I18nNestedIcuRepeatedPipeComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-i18n-nested-icu-repeated-pipe',
  standalone: true,
  imports: [TitleCasePipe],
  template: \`
      <div i18n>{status, select,
        active {{(name | titlecase), select, admin {Active Admin: {{name | titlecase}}} user {Active User: {{name | titlecase}}} other {Active: {{name | titlecase}}}}}
        inactive {{(name | titlecase), select, admin {Inactive Admin} user {Inactive User} other {Inactive}}}
        other {Unknown status for {{name | titlecase}}}
      }</div>
    \`,
})
export class I18nNestedIcuRepeatedPipeComponent {
  status = 'active';
  name = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd', 'ɵɵpipe'],
  },
]
