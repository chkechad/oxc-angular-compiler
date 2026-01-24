/**
 * Regression fixture: Non-exported class field declarations
 *
 * This tests the difference in how oxc and ng handle non-exported classes
 * that appear alongside Angular components. The difference is cosmetic -
 * both produce identical runtime behavior, but the code structure differs:
 *
 * - oxc: Field declarations appear at class level, then constructor assigns
 * - ng: All field assignments happen only in constructor body
 *
 * Found in bitwarden-clients project in files like:
 * - import-chrome.component.ts (ChromeLogin class)
 * - send-add-edit.component.ts (QueryParams class)
 * - members.component.ts (MembersTableDataSource class)
 */
import type { Fixture } from '../types.js'

const sourceCode = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-test',
  standalone: true,
  template: '<div>{{ helper.value }}</div>',
})
export class TestComponent {
  helper = new HelperClass('test');
}

// Non-exported helper class - this is what differs between compilers
class HelperClass {
  name: string;
  url: string;
  value: number;

  constructor(input: string) {
    this.name = input;
    this.url = 'https://example.com/' + input;
    this.value = input.length;
  }
}
`.trim()

const fixture: Fixture = {
  type: 'full-transform',
  name: 'bitwarden-nonexported-class',
  category: 'regressions',
  description:
    'Non-exported helper class field declarations differ between oxc and ng (cosmetic difference)',
  className: 'TestComponent',
  sourceCode,
  expectedFeatures: ['ɵɵdefineComponent', 'ɵɵtext'],
  // This is a cosmetic difference - both outputs work correctly at runtime
  // The difference is in class field declaration style, not functionality
  skip: false,
}

export const fixtures = [fixture]
