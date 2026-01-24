/**
 * Deeply nested control flow blocks.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'nested-if-else',
    category: 'control-flow',
    description: 'Nested @if with @else chains',
    className: 'NestedIfElseComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-nested-if-else',
  standalone: true,
  template: \`
    @if (isLoggedIn) {
      @if (isAdmin) {
        <div>Admin view</div>
      } @else if (isModerator) {
        <div>Moderator view</div>
      } @else {
        <div>User view</div>
      }
    } @else {
      <div>Please log in</div>
    }
  \`,
})
export class NestedIfElseComponent {
  isLoggedIn = true;
  isAdmin = false;
  isModerator = true;
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional'],
  },
  {
    name: 'nested-for-if',
    category: 'control-flow',
    description: '@for containing @if blocks',
    className: 'NestedForIfComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-nested-for-if',
  standalone: true,
  template: \`
    @for (user of users; track user.id) {
      @if (user.active) {
        <div class="active">{{ user.name }} (active)</div>
      } @else {
        <div class="inactive">{{ user.name }} (inactive)</div>
      }
    }
  \`,
})
export class NestedForIfComponent {
  users = [
    { id: 1, name: 'Alice', active: true },
    { id: 2, name: 'Bob', active: false },
  ];
}
    `.trim(),
    expectedFeatures: ['ɵɵrepeaterCreate', 'ɵɵconditional'],
  },
  {
    name: 'nested-if-for',
    category: 'control-flow',
    description: '@if containing @for blocks',
    className: 'NestedIfForComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-nested-if-for',
  standalone: true,
  template: \`
    @if (showList) {
      <ul>
        @for (item of items; track item) {
          <li>{{ item }}</li>
        }
      </ul>
    } @else {
      <div>List hidden</div>
    }
  \`,
})
export class NestedIfForComponent {
  showList = true;
  items = ['apple', 'banana', 'cherry'];
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵrepeaterCreate'],
  },
  {
    name: 'deeply-nested',
    category: 'control-flow',
    description: 'Deeply nested control flow (3+ levels)',
    className: 'DeeplyNestedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-deeply-nested',
  standalone: true,
  template: \`
    @if (level1) {
      <div class="l1">
        @for (item of level2Items; track item.id) {
          <div class="l2">
            @switch (item.type) {
              @case ('a') {
                @if (item.visible) {
                  <span>Type A: {{ item.name }}</span>
                }
              }
              @case ('b') {
                <span>Type B: {{ item.name }}</span>
              }
              @default {
                <span>Unknown: {{ item.name }}</span>
              }
            }
          </div>
        }
      </div>
    }
  \`,
})
export class DeeplyNestedComponent {
  level1 = true;
  level2Items = [
    { id: 1, type: 'a', name: 'Item A', visible: true },
    { id: 2, type: 'b', name: 'Item B', visible: true },
    { id: 3, type: 'c', name: 'Item C', visible: false },
  ];
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵrepeaterCreate'],
  },
  {
    name: 'if-with-alias',
    category: 'control-flow',
    description: '@if with alias binding',
    className: 'IfWithAliasComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { of } from 'rxjs';

@Component({
  selector: 'app-if-with-alias',
  standalone: true,
  imports: [AsyncPipe],
  template: \`
    @if (user$ | async; as user) {
      <div>Hello, {{ user.name }}</div>
    } @else {
      <div>Loading user...</div>
    }
  \`,
})
export class IfWithAliasComponent {
  user$ = of({ name: 'John' });
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵpipe'],
  },
]
