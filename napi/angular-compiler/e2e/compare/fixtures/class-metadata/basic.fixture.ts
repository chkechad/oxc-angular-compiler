/**
 * Class metadata compilation fixtures.
 *
 * Tests the class metadata compilation which generates `setClassMetadata` calls
 * for TestBed support. These allow TestBed APIs to recompile classes using the
 * original decorators with overrides applied.
 *
 * All fixtures use full-transform type to ensure proper compilation with both
 * Angular and Oxc compilers.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  // ==========================================================================
  // Basic Class Metadata (setClassMetadata)
  // ==========================================================================

  {
    type: 'full-transform',
    name: 'class-metadata-basic-component',
    category: 'class-metadata',
    description: 'Basic component class metadata for TestBed',
    className: 'TestableComponent',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-testable',
  standalone: true,
  template: \`<div>Testable</div>\`,
})
export class TestableComponent {}
    `.trim(),
    // Should generate:
    // (() => {
    //   (typeof ngDevMode === "undefined" || ngDevMode) &&
    //     i0.ɵɵsetClassMetadata(TestableComponent, [...decorators], null, null);
    // })();
    expectedFeatures: ['ɵsetClassMetadata'],
  },

  {
    type: 'full-transform',
    name: 'class-metadata-with-inputs',
    category: 'class-metadata',
    description: 'Class metadata preserving @Input decorators',
    className: 'InputMetaComponent',
    sourceCode: `
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-input-meta',
  standalone: true,
  template: \`<div>{{ value }}</div>\`,
})
export class InputMetaComponent {
  @Input() value = '';
  @Input('aliasedValue') aliased = '';
}
    `.trim(),
    // Should preserve @Input decorators in propDecorators for TestBed
    expectedFeatures: ['ɵsetClassMetadata'],
  },

  {
    type: 'full-transform',
    name: 'class-metadata-with-outputs',
    category: 'class-metadata',
    description: 'Class metadata preserving @Output decorators',
    className: 'OutputMetaComponent',
    sourceCode: `
import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-output-meta',
  standalone: true,
  template: \`<button (click)="onClick()">Click</button>\`,
})
export class OutputMetaComponent {
  @Output() clicked = new EventEmitter<void>();
  @Output('aliasedClick') aliasedClick = new EventEmitter<void>();

  onClick() {
    this.clicked.emit();
  }
}
    `.trim(),
    expectedFeatures: ['ɵsetClassMetadata'],
  },

  {
    type: 'full-transform',
    name: 'class-metadata-with-host-binding',
    category: 'class-metadata',
    description: 'Class metadata preserving @HostBinding decorators',
    className: 'HostBindingMetaComponent',
    sourceCode: `
import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'app-host-binding-meta',
  standalone: true,
  template: \`<span>Content</span>\`,
})
export class HostBindingMetaComponent {
  @HostBinding('class.active') isActive = true;
  @HostBinding('style.opacity') opacity = 1;
  @HostBinding('attr.role') role = 'button';
}
    `.trim(),
    expectedFeatures: ['ɵsetClassMetadata'],
  },

  {
    type: 'full-transform',
    name: 'class-metadata-with-host-listener',
    category: 'class-metadata',
    description: 'Class metadata preserving @HostListener decorators',
    className: 'HostListenerMetaComponent',
    sourceCode: `
import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-host-listener-meta',
  standalone: true,
  template: \`<span>Interactive</span>\`,
})
export class HostListenerMetaComponent {
  @HostListener('click', ['$event'])
  handleClick(event: MouseEvent) {}

  @HostListener('keydown.enter')
  handleEnter() {}

  @HostListener('window:resize', ['$event'])
  handleResize(event: Event) {}
}
    `.trim(),
    expectedFeatures: ['ɵsetClassMetadata'],
  },

  // ==========================================================================
  // Class Metadata with Constructor Parameters
  // ==========================================================================

  {
    type: 'full-transform',
    name: 'class-metadata-with-inject',
    category: 'class-metadata',
    description: 'Class metadata preserving @Inject decorators on constructor',
    className: 'InjectMetaComponent',
    sourceCode: `
import { Component, Inject, InjectionToken } from '@angular/core';

interface ConfigOptions {
  apiUrl: string;
  debug: boolean;
}

export const CONFIG = new InjectionToken<ConfigOptions>('config');

@Component({
  selector: 'app-inject-meta',
  standalone: true,
  template: \`<div>Injected</div>\`,
})
export class InjectMetaComponent {
  constructor(
    @Inject(CONFIG) private config: ConfigOptions,
  ) {}
}
    `.trim(),
    // Should preserve ctorParameters with @Inject
    expectedFeatures: ['ɵsetClassMetadata'],
  },

  {
    type: 'full-transform',
    name: 'class-metadata-with-di-qualifiers',
    category: 'class-metadata',
    description: 'Class metadata with inject() function (modern DI)',
    className: 'DiQualifierMetaComponent',
    sourceCode: `
import { Component, inject, InjectionToken } from '@angular/core';

interface ServiceA { doA(): void; }
interface ServiceB { doB(): void; }

export const SERVICE_A = new InjectionToken<ServiceA>('serviceA');
export const SERVICE_B = new InjectionToken<ServiceB>('serviceB');

@Component({
  selector: 'app-di-qualifier-meta',
  standalone: true,
  template: \`<div>DI Qualifiers</div>\`,
})
export class DiQualifierMetaComponent {
  private serviceA = inject(SERVICE_A);
  private serviceB = inject(SERVICE_B);
}
    `.trim(),
    expectedFeatures: ['ɵsetClassMetadata'],
  },

  // ==========================================================================
  // Class Metadata with View/Content Queries
  // ==========================================================================

  {
    type: 'full-transform',
    name: 'class-metadata-with-view-child',
    category: 'class-metadata',
    description: 'Class metadata preserving @ViewChild decorators',
    className: 'ViewChildMetaComponent',
    sourceCode: `
import { Component, ViewChild, ElementRef, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-view-child-meta',
  standalone: true,
  template: \`
    <div #divRef>Content</div>
    <ng-template #templateRef></ng-template>
  \`,
})
export class ViewChildMetaComponent {
  @ViewChild('divRef') divRef!: ElementRef<HTMLDivElement>;
  @ViewChild('templateRef') templateRef!: TemplateRef<any>;
  @ViewChild('divRef', { static: true }) staticDivRef!: ElementRef;
}
    `.trim(),
    expectedFeatures: ['ɵsetClassMetadata'],
  },

  {
    type: 'full-transform',
    name: 'class-metadata-with-content-child',
    category: 'class-metadata',
    description: 'Class metadata preserving @ContentChild/@ContentChildren decorators',
    className: 'ContentChildMetaComponent',
    sourceCode: `
import { Component, ContentChild, ContentChildren, QueryList, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-content-child-meta',
  standalone: true,
  template: \`<ng-content></ng-content>\`,
})
export class ContentChildMetaComponent {
  @ContentChild('headerTpl') headerTemplate!: TemplateRef<any>;
  @ContentChildren('item') items!: QueryList<any>;
}
    `.trim(),
    expectedFeatures: ['ɵsetClassMetadata'],
  },

  // ==========================================================================
  // Directive Class Metadata
  // ==========================================================================

  {
    type: 'full-transform',
    name: 'class-metadata-directive',
    category: 'class-metadata',
    description: 'Directive class metadata for TestBed',
    className: 'TestableDirective',
    sourceCode: `
import { Directive, Input, HostBinding } from '@angular/core';

@Directive({
  selector: '[appTestable]',
  standalone: true,
})
export class TestableDirective {
  @Input('appTestable') value = '';
  @HostBinding('class.active') isActive = false;
}
    `.trim(),
    expectedFeatures: ['ɵsetClassMetadata'],
  },

  // ==========================================================================
  // Pipe Class Metadata
  // ==========================================================================

  {
    type: 'full-transform',
    name: 'class-metadata-pipe',
    category: 'class-metadata',
    description: 'Pipe class metadata for TestBed',
    className: 'TestablePipe',
    sourceCode: `
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'testable',
  standalone: true,
})
export class TestablePipe implements PipeTransform {
  transform(value: string): string {
    return value.toUpperCase();
  }
}
    `.trim(),
    expectedFeatures: ['ɵsetClassMetadata'],
  },

  // ==========================================================================
  // Injectable Class Metadata
  // ==========================================================================

  {
    type: 'full-transform',
    name: 'class-metadata-injectable',
    category: 'class-metadata',
    description: 'Injectable class metadata for TestBed',
    className: 'TestableService',
    sourceCode: `
import { Injectable, Inject, InjectionToken } from '@angular/core';

interface ApiConfig {
  baseUrl: string;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('apiConfig');

@Injectable({
  providedIn: 'root',
})
export class TestableService {
  constructor(
    @Inject(API_CONFIG) private apiConfig: ApiConfig,
  ) {}
}
    `.trim(),
    expectedFeatures: ['ɵsetClassMetadata'],
  },

  // ==========================================================================
  // NgModule Class Metadata
  // ==========================================================================

  {
    type: 'full-transform',
    name: 'class-metadata-ngmodule',
    category: 'class-metadata',
    description: 'NgModule class metadata for TestBed',
    className: 'TestableModule',
    sourceCode: `
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [CommonModule],
  declarations: [],
  exports: [],
})
export class TestableModule {}
    `.trim(),
    expectedFeatures: ['ɵsetClassMetadata'],
  },

  // ==========================================================================
  // Complex Real-World Scenarios
  // ==========================================================================

  {
    type: 'full-transform',
    name: 'class-metadata-complex-component',
    category: 'class-metadata',
    description: 'Complex component with all decorator types for TestBed',
    className: 'ComplexMetaComponent',
    sourceCode: `
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ContentChild,
  HostBinding,
  HostListener,
  ElementRef,
  inject,
  InjectionToken,
} from '@angular/core';

interface AppConfig {
  theme: string;
  locale: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('appConfig');

@Component({
  selector: 'app-complex-meta',
  standalone: true,
  template: \`
    <div #contentRef>
      <ng-content></ng-content>
      {{ value }}
    </div>
  \`,
})
export class ComplexMetaComponent {
  // Modern inject() function style
  private appConfig = inject(APP_CONFIG);

  // Property decorators
  @Input() value = '';
  @Input('alias') aliasedValue = '';
  @Output() valueChange = new EventEmitter<string>();

  // Query decorators
  @ViewChild('contentRef') contentRef!: ElementRef;
  @ContentChild('projectedContent') projectedContent: any;

  // Host decorators
  @HostBinding('class.active') isActive = false;
  @HostBinding('style.opacity') opacity = 1;

  @HostListener('click', ['$event'])
  handleClick(event: MouseEvent) {}
}
    `.trim(),
    expectedFeatures: ['ɵsetClassMetadata'],
  },
]
