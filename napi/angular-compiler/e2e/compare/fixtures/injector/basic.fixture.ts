/**
 * Injector compilation fixtures.
 *
 * Tests @NgModule injector compilation via full file transformation.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    type: 'full-transform',
    name: 'basic-injector',
    category: 'injector',
    description: 'Basic NgModule injector with no providers or imports',
    className: 'AppModule',
    sourceCode: `
import { NgModule } from '@angular/core';

@NgModule({})
export class AppModule {}
    `.trim(),
    expectedFeatures: ['defineInjector', 'defineNgModule'],
  },
  {
    type: 'full-transform',
    name: 'injector-with-imports',
    category: 'injector',
    description: 'NgModule injector with imports',
    className: 'FeatureModule',
    sourceCode: `
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [CommonModule, FormsModule],
})
export class FeatureModule {}
    `.trim(),
    expectedFeatures: ['defineInjector', 'defineNgModule', 'CommonModule', 'FormsModule'],
  },
  {
    type: 'full-transform',
    name: 'injector-with-providers',
    category: 'injector',
    description: 'NgModule injector with providers',
    className: 'ProvidersModule',
    sourceCode: `
import { NgModule, InjectionToken } from '@angular/core';

export const MY_TOKEN = new InjectionToken<string>('MY_TOKEN');

const PROVIDERS = [
  { provide: MY_TOKEN, useValue: 'test' },
];

@NgModule({
  providers: PROVIDERS,
})
export class ProvidersModule {}
    `.trim(),
    expectedFeatures: ['defineInjector', 'defineNgModule', 'PROVIDERS'],
  },
  {
    type: 'full-transform',
    name: 'injector-with-both',
    category: 'injector',
    description: 'NgModule injector with both providers and imports',
    className: 'FullModule',
    sourceCode: `
import { NgModule, InjectionToken } from '@angular/core';
import { CommonModule } from '@angular/common';

export const CONFIG_TOKEN = new InjectionToken<object>('CONFIG');

const MODULE_PROVIDERS = [
  { provide: CONFIG_TOKEN, useValue: { debug: true } },
];

@NgModule({
  imports: [CommonModule],
  providers: MODULE_PROVIDERS,
})
export class FullModule {}
    `.trim(),
    expectedFeatures: ['defineInjector', 'defineNgModule', 'MODULE_PROVIDERS', 'CommonModule'],
  },
]
