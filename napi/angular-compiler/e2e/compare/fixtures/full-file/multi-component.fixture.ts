/**
 * File with multiple components.
 *
 * Tests batch compilation where a single file contains multiple Angular components.
 * NgtscProgram outputs all components in one .js file, and the batch compilation
 * extracts each component's output separately for comparison.
 */
import type { Fixture } from '../types.js'

const multiComponentSource = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-first',
  standalone: true,
  template: '<div>First</div>',
})
export class FirstComponent {}

@Component({
  selector: 'app-second',
  standalone: true,
  template: '<span>Second</span>',
})
export class SecondComponent {}
`.trim()

/**
 * First component in the multi-component file.
 */
const firstFixture: Fixture = {
  type: 'full-transform',
  name: 'multi-component-file-first',
  category: 'full-file',
  description: 'First component in multi-component file',
  className: 'FirstComponent',
  sourceCode: multiComponentSource,
  expectedFeatures: [
    // DomOnly mode uses domElement instructions for standalone components without directive dependencies
    'ɵɵdomElementStart',
    'ɵɵdomElementEnd',
    'ɵɵtext',
  ],
}

/**
 * Second component in the multi-component file.
 * This fixture uses the same sourceCode but targets SecondComponent.
 */
const secondFixture: Fixture = {
  type: 'full-transform',
  name: 'multi-component-file-second',
  category: 'full-file',
  description: 'Second component in multi-component file',
  className: 'SecondComponent',
  sourceCode: multiComponentSource,
  expectedFeatures: ['ɵɵdomElementStart', 'ɵɵdomElementEnd', 'ɵɵtext'],
}

// Export fixtures array for the fixture loader to discover
// Note: Do NOT export individual fixtures, only the array
export const fixtures = [firstFixture, secondFixture]
