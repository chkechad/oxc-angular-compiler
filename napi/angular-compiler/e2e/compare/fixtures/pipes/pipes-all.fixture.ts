/**
 * All built-in Angular pipes.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'pipe-async',
    category: 'pipes',
    description: 'Async pipe for observables and promises',
    className: 'PipeAsyncComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { of } from 'rxjs';

@Component({
  selector: 'app-pipe-async',
  standalone: true,
  imports: [AsyncPipe],
  template: \`
    <div>{{ data$ | async }}</div>
    <div>{{ promise$ | async }}</div>
  \`,
})
export class PipeAsyncComponent {
  data$ = of('observable data');
  promise$ = Promise.resolve('promise data');
}
    `.trim(),
    expectedFeatures: ['ɵɵpipe', 'ɵɵpipeBind1'],
  },
  {
    name: 'pipe-date',
    category: 'pipes',
    description: 'Date pipe with formats',
    className: 'PipeDateComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-pipe-date',
  standalone: true,
  imports: [DatePipe],
  template: \`
    <p>{{ today | date }}</p>
    <p>{{ today | date:'short' }}</p>
    <p>{{ today | date:'fullDate' }}</p>
    <p>{{ today | date:'yyyy-MM-dd HH:mm:ss' }}</p>
  \`,
})
export class PipeDateComponent {
  today = new Date();
}
    `.trim(),
    expectedFeatures: ['ɵɵpipe', 'ɵɵpipeBind1', 'ɵɵpipeBind2'],
  },
  {
    name: 'pipe-currency-number-percent',
    category: 'pipes',
    description: 'Currency, number, and percent pipes',
    className: 'PipeCurrencyNumberPercentComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';

@Component({
  selector: 'app-pipe-currency-number-percent',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, PercentPipe],
  template: \`
    <p>{{ price | currency }}</p>
    <p>{{ price | currency:'EUR' }}</p>
    <p>{{ value | number }}</p>
    <p>{{ value | number:'1.2-4' }}</p>
    <p>{{ ratio | percent }}</p>
    <p>{{ ratio | percent:'1.1-3' }}</p>
  \`,
})
export class PipeCurrencyNumberPercentComponent {
  price = 99.99;
  value = 1234.5678;
  ratio = 0.75;
}
    `.trim(),
    expectedFeatures: ['ɵɵpipe', 'ɵɵpipeBind1', 'ɵɵpipeBind2'],
  },
  {
    name: 'pipe-case-transform',
    category: 'pipes',
    description: 'String case transformation pipes',
    className: 'PipeCaseTransformComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { UpperCasePipe, LowerCasePipe, TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-pipe-case-transform',
  standalone: true,
  imports: [UpperCasePipe, LowerCasePipe, TitleCasePipe],
  template: \`
    <p>{{ text | uppercase }}</p>
    <p>{{ text | lowercase }}</p>
    <p>{{ text | titlecase }}</p>
  \`,
})
export class PipeCaseTransformComponent {
  text = 'Hello World';
}
    `.trim(),
    expectedFeatures: ['ɵɵpipe', 'ɵɵpipeBind1'],
  },
  {
    name: 'pipe-json',
    category: 'pipes',
    description: 'JSON pipe for debugging',
    className: 'PipeJsonComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-pipe-json',
  standalone: true,
  imports: [JsonPipe],
  template: \`
    <pre>{{ object | json }}</pre>
  \`,
})
export class PipeJsonComponent {
  object = { name: 'Test', value: 123 };
}
    `.trim(),
    expectedFeatures: ['ɵɵpipe', 'ɵɵpipeBind1'],
  },
  {
    name: 'pipe-slice',
    category: 'pipes',
    description: 'Slice pipe for arrays and strings',
    className: 'PipeSliceComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { SlicePipe } from '@angular/common';

@Component({
  selector: 'app-pipe-slice',
  standalone: true,
  imports: [SlicePipe],
  template: \`
    <p>{{ items | slice:0:5 }}</p>
    <p>{{ text | slice:0:10 }}...</p>
    @for (item of items | slice:start:end; track item) {
      <span>{{ item }}</span>
    }
  \`,
})
export class PipeSliceComponent {
  items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  text = 'Hello World Example';
  start = 0;
  end = 5;
}
    `.trim(),
    expectedFeatures: ['ɵɵpipe', 'ɵɵpipeBind3'],
  },
  {
    name: 'pipe-keyvalue',
    category: 'pipes',
    description: 'KeyValue pipe for objects and maps',
    className: 'PipeKeyValueComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { KeyValuePipe } from '@angular/common';

@Component({
  selector: 'app-pipe-keyvalue',
  standalone: true,
  imports: [KeyValuePipe],
  template: \`
    @for (item of object | keyvalue; track item.key) {
      <div>{{ item.key }}: {{ item.value }}</div>
    }
  \`,
})
export class PipeKeyValueComponent {
  object = { a: 1, b: 2, c: 3 };
}
    `.trim(),
    expectedFeatures: ['ɵɵpipe', 'ɵɵpipeBind1', 'ɵɵrepeaterCreate'],
  },
  {
    name: 'pipe-i18n-plural-select',
    category: 'pipes',
    description: 'I18n plural and select pipes',
    className: 'PipeI18nPluralSelectComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { I18nPluralPipe, I18nSelectPipe } from '@angular/common';

@Component({
  selector: 'app-pipe-i18n-plural-select',
  standalone: true,
  imports: [I18nPluralPipe, I18nSelectPipe],
  template: \`
    <p>{{ count | i18nPlural:pluralMap }}</p>
    <p>{{ gender | i18nSelect:genderMap }}</p>
  \`,
})
export class PipeI18nPluralSelectComponent {
  count = 2;
  pluralMap = { '=0': 'No items', '=1': 'One item', 'other': '# items' };
  gender = 'male';
  genderMap = { male: 'He', female: 'She', other: 'They' };
}
    `.trim(),
    expectedFeatures: ['ɵɵpipe', 'ɵɵpipeBind2'],
  },
  {
    name: 'pipe-chained',
    category: 'pipes',
    description: 'Chained pipes',
    className: 'PipeChainedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { AsyncPipe, CurrencyPipe, JsonPipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { of } from 'rxjs';

@Component({
  selector: 'app-pipe-chained',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, JsonPipe, SlicePipe, UpperCasePipe],
  template: \`
    <p>{{ price | currency:'USD':'symbol':'1.2-2' | uppercase }}</p>
    <p>{{ data$ | async | json }}</p>
    <p>{{ items | slice:0:3 | json }}</p>
  \`,
})
export class PipeChainedComponent {
  price = 99.99;
  data$ = of({ value: 'test' });
  items = [1, 2, 3, 4, 5];
}
    `.trim(),
    expectedFeatures: ['ɵɵpipe', 'ɵɵpipeBind1', 'ɵɵpipeBind4'],
  },
  {
    name: 'pipe-pure-impure',
    category: 'pipes',
    description: 'Pure vs impure pipe behavior',
    className: 'PipePureImpureComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { KeyValuePipe, SlicePipe } from '@angular/common';

@Component({
  selector: 'app-pipe-pure-impure',
  standalone: true,
  imports: [KeyValuePipe, SlicePipe],
  template: \`
    <div>{{ items | slice:0:2 }}</div>
    @for (item of items | keyvalue; track item.key) {
      <span>{{ item.key }}</span>
    }
  \`,
})
export class PipePureImpureComponent {
  items = { a: 1, b: 2, c: 3 };
}
    `.trim(),
    expectedFeatures: ['ɵɵpipe', 'ɵɵpipeBind1', 'ɵɵpipeBind3'],
  },
]
