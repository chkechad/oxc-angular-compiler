/**
 * Nested i18n blocks and elements.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'i18n-with-elements',
    category: 'i18n',
    description: 'i18n block containing elements',
    className: 'I18nWithElementsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-with-elements',
  standalone: true,
  template: \`
      <p i18n>
        Welcome to <strong>our site</strong>! Please <a href="/login">log in</a>.
      </p>
    \`,
})
export class I18nWithElementsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd'],
  },
  {
    name: 'i18n-with-ng-container',
    category: 'i18n',
    description: 'i18n with ng-container',
    className: 'I18nWithNgContainerComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-with-ng-container',
  standalone: true,
  template: \`
      <ng-container i18n>
        This is a <em>container</em> message.
      </ng-container>
    \`,
})
export class I18nWithNgContainerComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd'],
  },
  {
    name: 'i18n-block-syntax',
    category: 'i18n',
    description: 'i18n with block syntax (ng-template)',
    className: 'I18nBlockSyntaxComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-block-syntax',
  standalone: true,
  template: \`
      <div>
        <ng-container i18n>First part</ng-container>
        <span i18n>Second part</span>
      </div>
    \`,
})
export class I18nBlockSyntaxComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd'],
  },
  {
    name: 'i18n-with-control-flow',
    category: 'i18n',
    description: 'i18n combined with control flow',
    className: 'I18nWithControlFlowComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-with-control-flow',
  standalone: true,
  template: \`
      <div i18n>
        Hello
        @if (userName) {
          <strong>{{ userName }}</strong>
        } @else {
          <em>guest</em>
        }!
      </div>
    \`,
})
export class I18nWithControlFlowComponent {
  userName = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd', 'ɵɵconditional'],
  },
  {
    name: 'i18n-deeply-nested-control-flow',
    category: 'i18n',
    description: 'i18n with deeply nested control flow (nested @if inside @if)',
    className: 'I18nDeeplyNestedControlFlowComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-deeply-nested-control-flow',
  standalone: true,
  template: \`
      <div i18n>
        Welcome
        @if (outer) {
          to the
          @if (inner) {
            <strong>inner</strong>
          } @else {
            <em>outer</em>
          }
          section!
        }
      </div>
    \`,
})
export class I18nDeeplyNestedControlFlowComponent {
  outer = false;
  inner = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd', 'ɵɵconditional'],
  },
  {
    name: 'i18n-for-loop-nested',
    category: 'i18n',
    description: 'i18n with @for loop and nested elements',
    className: 'I18nForLoopNestedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-for-loop-nested',
  standalone: true,
  template: \`
      <ul i18n>
        Items:
        @for (item of items; track item.id) {
          <li>{{ item.name }}</li>
        } @empty {
          <li>No items</li>
        }
      </ul>
    \`,
})
export class I18nForLoopNestedComponent {
  items: { id: number; name: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd', 'ɵɵrepeaterCreate'],
  },
  {
    name: 'i18n-static-attr-in-conditional',
    category: 'i18n',
    description: 'Static i18n attributes on elements inside @if blocks - tests const deduplication',
    className: 'I18nStaticAttrInConditionalComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-static-attr-in-conditional',
  standalone: true,
  template: \`
      <div>
        @if (conditionA) {
          <span
            tooltip="First tooltip text"
            i18n-tooltip="@@first-tooltip-key"
          >First</span>
        }
        @if (conditionB) {
          <span
            tooltip="Second tooltip text"
            i18n-tooltip="@@second-tooltip-key"
          >Second</span>
        }
        @if (conditionC) {
          <span
            tooltip="Third tooltip text"
            i18n-tooltip="@@third-tooltip-key"
          >Third</span>
        }
      </div>
    \`,
})
export class I18nStaticAttrInConditionalComponent {
  conditionA = false;
  conditionB = false;
  conditionC = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nAttributes'],
  },
  {
    name: 'i18n-same-static-attr-in-conditionals',
    category: 'i18n',
    description:
      'Identical static i18n attributes on elements inside different @if blocks - matches StatusMapRowComponent case',
    className: 'I18nSameStaticAttrComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-i18n-same-static-attr-in-conditionals',
  standalone: true,
  template: \`
      <div>
        @if (conditionA) {
          <my-icon
            class="icon-done"
            name="done"
            tooltip="Same tooltip text for all"
            i18n-tooltip="@@same-key"
          ></my-icon>
        }
        @if (conditionB) {
          <my-icon
            class="icon-done"
            name="done"
            tooltip="Same tooltip text for all"
            i18n-tooltip="@@same-key"
          ></my-icon>
        }
        @if (conditionC) {
          <my-icon
            class="icon-done"
            name="done"
            tooltip="Same tooltip text for all"
            i18n-tooltip="@@same-key"
          ></my-icon>
        }
      </div>
    \`,
})
export class I18nSameStaticAttrComponent {
  conditionA = false;
  conditionB = false;
  conditionC = false;
}
    `.trim(),
    expectedFeatures: [],
  },
  {
    name: 'no-i18n-same-static-attr-in-conditionals',
    category: 'i18n',
    description: 'Identical elements WITHOUT i18n - should deduplicate',
    className: 'NoI18nSameStaticAttrComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-no-i18n-same-static-attr-in-conditionals',
  standalone: true,
  template: \`
      <div>
        @if (conditionA) {
          <my-icon
            class="icon-done"
            name="done"
            tooltip="Same tooltip text for all"
          ></my-icon>
        }
        @if (conditionB) {
          <my-icon
            class="icon-done"
            name="done"
            tooltip="Same tooltip text for all"
          ></my-icon>
        }
        @if (conditionC) {
          <my-icon
            class="icon-done"
            name="done"
            tooltip="Same tooltip text for all"
          ></my-icon>
        }
      </div>
    \`,
})
export class NoI18nSameStaticAttrComponent {
  conditionA = false;
  conditionB = false;
  conditionC = false;
}
    `.trim(),
    expectedFeatures: [],
  },
  {
    name: 'i18n-on-ng-template',
    category: 'i18n',
    description: 'i18n attribute directly on ng-template',
    className: 'I18nOnNgTemplateComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-i18n-on-ng-template',
  standalone: true,
  imports: [NgIf],
  template: \`
      <ng-template [ngIf]="showMessage">
        <ng-template i18n="@@greeting-message">
          <span>Hello</span>, welcome to our <strong>app</strong>!
        </ng-template>
      </ng-template>
    \`,
})
export class I18nOnNgTemplateComponent {
  showMessage = false;
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd'],
  },
  {
    name: 'i18n-on-ng-template-with-ngIfElse',
    category: 'i18n',
    description:
      'i18n attribute on ng-template with ngIf/ngIfElse - matches MergeConfirmComponent pattern',
    className: 'I18nOnNgTemplateWithNgIfElseComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-i18n-on-ng-template-with-ng-if-else',
  standalone: true,
  imports: [NgIf],
  template: \`
      <ng-template [ngIf]="condition">
        <ng-template
          [ngIf]="innerCondition"
          [ngIfElse]="elseTmpl"
          i18n="@@primary-message"
        >
          <span [innerHTML]="text"></span> will become part of <b>{{ name }}</b>.
        </ng-template>
        <ng-template i18n="@@secondary-message" #elseTmpl>
          <span [innerHTML]="text"></span> will remain in <span><b>{{ name }}'s</b> parent</span>.
        </ng-template>
      </ng-template>
    \`,
})
export class I18nOnNgTemplateWithNgIfElseComponent {
  condition = false;
  innerCondition = false;
  text = '';
  name = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd'],
  },
  {
    name: 'i18n-ng-template-deeply-nested',
    category: 'i18n',
    description:
      'Deeply nested ng-template with i18n and ngIf - matches task-history-item pattern that caused slot offset issues',
    className: 'I18nNgTemplateDeeplyNestedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component, Pipe, PipeTransform } from '@angular/core';
import { NgIf } from '@angular/common';

@Pipe({ name: 'username', standalone: true })
export class UsernamePipe implements PipeTransform {
  transform(value: any): string { return value; }
}

@Pipe({ name: 'actorText', standalone: true })
export class ActorTextPipe implements PipeTransform {
  transform(value: any): string { return value; }
}

@Component({
  selector: 'app-i18n-ng-template-deeply-nested',
  standalone: true,
  imports: [NgIf, UsernamePipe, ActorTextPipe],
  template: \`
      <span *ngIf="showActor" class="actor-name">
        <ng-template
          [ngIf]="hasUserId"
          [ngIfElse]="recurringTmpl"
          i18n="@@clickbot-via-user"
        >
          ClickBot (via {{ user | username }})
        </ng-template>
        <ng-template #recurringTmpl>
          <ng-template
            [ngIf]="fromRecur"
            [ngIfElse]="actorTextTmpl"
            i18n="@@clickbot-recurring"
          >
            ClickBot (Recurring Tasks)
          </ng-template>
        </ng-template>
        <ng-template #actorTextTmpl>{{ item | actorText }}</ng-template>
      </span>
    \`,
})
export class I18nNgTemplateDeeplyNestedComponent {
  showActor = false;
  hasUserId = false;
  fromRecur = false;
  user: any = null;
  item: any = null;
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd', 'ɵɵtemplate'],
  },
  {
    name: 'i18n-with-templates-and-text',
    category: 'i18n',
    description:
      'i18n block with ng-templates having ngTemplateOutlet and interpolation - matches DatepickerComponent pattern',
    className: 'I18nWithTemplatesAndTextComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { NgIf, NgClass, NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-i18n-with-templates-and-text',
  standalone: true,
  imports: [NgIf, NgClass, NgTemplateOutlet],
  template: \`
      <ng-template [ngIf]="showContent">
        <ng-template #tmplRef1><span>Template 1</span></ng-template>
        <ng-template #tmplRef2><span>Template 2</span></ng-template>
        <ng-template #tmplRef3><span>Template 3</span></ng-template>
        <div i18n>
          <div [ngClass]="classA">
            <div>{{ inputLabel }}</div>
            <ng-template [ngTemplateOutlet]="tmplRef1"></ng-template>
          </div>
          <div [ngClass]="classB">
            <ng-template [ngTemplateOutlet]="tmplRef2"></ng-template>
          </div>
          <ng-template [ngTemplateOutlet]="tmplRef3"></ng-template>
        </div>
      </ng-template>
    \`,
})
export class I18nWithTemplatesAndTextComponent {
  showContent = false;
  classA = '';
  classB = '';
  inputLabel = '';
}
    `.trim(),
    expectedFeatures: ['ɵɵi18nStart', 'ɵɵi18nEnd', 'ɵɵi18nExp', 'ɵɵproperty'],
  },
]
