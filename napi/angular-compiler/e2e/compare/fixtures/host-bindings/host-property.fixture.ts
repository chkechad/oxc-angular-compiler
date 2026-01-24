/**
 * Templates that complement host property bindings.
 *
 * Note: Host bindings are defined in component metadata, not templates.
 * These fixtures test template features that work alongside host bindings.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'template-with-host-reference',
    category: 'host-bindings',
    description: 'Template referencing host element',
    className: 'TemplateWithHostReferenceComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-with-host-reference',
  standalone: true,
  template: \`
    <div #container>
      <button (click)="onContainerClick(container)">Click</button>
    </div>
  \`,
})
export class TemplateWithHostReferenceComponent {
  onContainerClick(container: HTMLElement) {}
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener', 'ɵɵreference'],
  },
  {
    name: 'template-host-style-cascade',
    category: 'host-bindings',
    description: 'Template styles that cascade from host',
    className: 'TemplateHostStyleCascadeComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-host-style-cascade',
  standalone: true,
  template: \`
    <div class="inner-content" [class.active]="isActive">
      <span [style.color]="inheritedColor">Styled content</span>
    </div>
  \`,
})
export class TemplateHostStyleCascadeComponent {
  isActive = false;
  inheritedColor = 'inherit';
}
    `.trim(),
    expectedFeatures: ['ɵɵclassProp', 'ɵɵstyleProp'],
  },
  {
    name: 'template-host-event-context',
    category: 'host-bindings',
    description: 'Events with component context',
    className: 'TemplateHostEventContextComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-template-host-event-context',
  standalone: true,
  template: \`
    <button (click)="handleClick($event)"
            (keydown.enter)="handleEnter()"
            (keydown.escape)="handleEscape()">
      Interactive
    </button>
  \`,
})
export class TemplateHostEventContextComponent {
  handleClick(event: Event) {}
  handleEnter() {}
  handleEscape() {}
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener'],
  },
]
