/**
 * Two-way binding with model and signals.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'two-way-basic',
    category: 'bindings',
    description: 'Basic two-way binding with [(ngModel)]',
    className: 'TwoWayBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-two-way-basic',
  standalone: true,
  template: \`
    <input [(ngModel)]="name" />
    <p>Hello, {{ name }}</p>
  \`,
})
export class TwoWayBasicComponent {
  name = 'World';
}
    `.trim(),
    expectedFeatures: ['ɵɵtwoWayProperty', 'ɵɵtwoWayListener'],
  },
  {
    name: 'two-way-model',
    category: 'bindings',
    description: 'Two-way binding with [(model)]',
    className: 'TwoWayModelComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-two-way-model',
  standalone: true,
  template: \`
    <custom-input [(model)]="value"></custom-input>
  \`,
})
export class TwoWayModelComponent {
  value = 'test';
}
    `.trim(),
    expectedFeatures: ['ɵɵtwoWayProperty', 'ɵɵtwoWayListener'],
  },
  {
    name: 'two-way-multiple',
    category: 'bindings',
    description: 'Multiple two-way bindings',
    className: 'TwoWayMultipleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-two-way-multiple',
  standalone: true,
  template: \`
    <input [(ngModel)]="firstName" placeholder="First name" />
    <input [(ngModel)]="lastName" placeholder="Last name" />
    <p>{{ firstName }} {{ lastName }}</p>
  \`,
})
export class TwoWayMultipleComponent {
  firstName = 'John';
  lastName = 'Doe';
}
    `.trim(),
    expectedFeatures: ['ɵɵtwoWayProperty', 'ɵɵtwoWayListener'],
  },
  {
    name: 'two-way-nested',
    category: 'bindings',
    description: 'Two-way binding on nested property',
    className: 'TwoWayNestedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-two-way-nested',
  standalone: true,
  template: \`
    <input [(ngModel)]="user.profile.name" />
  \`,
})
export class TwoWayNestedComponent {
  user = { profile: { name: 'John' } };
}
    `.trim(),
    expectedFeatures: ['ɵɵtwoWayProperty', 'ɵɵtwoWayListener'],
  },
  {
    name: 'two-way-in-for-with-index',
    category: 'bindings',
    description: 'Two-way binding using $index inside @for loop',
    className: 'TwoWayForIndexComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-two-way-in-for-with-index',
  standalone: true,
  template: \`
    @for (item of items; track $index) {
      <input [(ngModel)]="items[$index].value" />
    }
  \`,
})
export class TwoWayForIndexComponent {
  items = [{ value: 'a' }, { value: 'b' }, { value: 'c' }];
}
    `.trim(),
    expectedFeatures: ['ɵɵtwoWayProperty', 'ɵɵtwoWayListener', 'ɵɵrestoreView', 'ɵɵrepeaterCreate'],
  },
  {
    name: 'two-way-in-for-with-item',
    category: 'bindings',
    description: 'Two-way binding using item property inside @for loop',
    className: 'TwoWayForItemComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-two-way-in-for-with-item',
  standalone: true,
  template: \`
    @for (item of items; track item.id) {
      <input [(ngModel)]="item.value" />
    }
  \`,
})
export class TwoWayForItemComponent {
  items = [{ id: 1, value: 'a' }, { id: 2, value: 'b' }, { id: 3, value: 'c' }];
}
    `.trim(),
    expectedFeatures: ['ɵɵtwoWayProperty', 'ɵɵtwoWayListener', 'ɵɵrestoreView', 'ɵɵrepeaterCreate'],
  },
]
