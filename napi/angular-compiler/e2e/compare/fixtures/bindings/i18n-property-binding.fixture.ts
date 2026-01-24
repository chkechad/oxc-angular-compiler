/**
 * i18n metadata on property bindings.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'i18n-property-binding-basic',
    category: 'bindings',
    description: 'Property binding with i18n metadata',
    className: 'I18nPropertyBindingBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-property-binding-basic',
  standalone: true,
  template: \`
    <div [cuTooltip]="tooltip.label" i18n-cuTooltip="{{ tooltip.i18n }}"></div>
  \`,
})
export class I18nPropertyBindingBasicComponent {
  tooltip = { label: 'Tooltip text', i18n: '@@tooltipId' };
}
    `.trim(),
    expectedFeatures: ['ɵɵproperty'],
  },
  {
    name: 'i18n-property-binding-multiple',
    category: 'bindings',
    description: 'Multiple property bindings with i18n metadata',
    className: 'I18nPropertyBindingMultipleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-property-binding-multiple',
  standalone: true,
  template: \`
    <div [title]="titleText" i18n-title="@@titleId" [tooltip]="tooltipText" i18n-tooltip="@@tooltipId"></div>
  \`,
})
export class I18nPropertyBindingMultipleComponent {
  titleText = 'Title';
  tooltipText = 'Tooltip';
}
    `.trim(),
    expectedFeatures: ['ɵɵproperty'],
  },
  {
    name: 'i18n-bind-prefix',
    category: 'bindings',
    description: 'bind- prefix with i18n metadata',
    className: 'I18nBindPrefixComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-bind-prefix',
  standalone: true,
  template: \`
    <div bind-tooltip="tooltipText" i18n-tooltip="@@tooltipMsg"></div>
  \`,
})
export class I18nBindPrefixComponent {
  tooltipText = 'Tooltip message';
}
    `.trim(),
    expectedFeatures: ['ɵɵproperty'],
  },
]
