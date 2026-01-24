/**
 * Component using pipes in template.
 *
 * Tests full-file transformation with various Angular pipes,
 * including built-in pipes and pipe chaining.
 */
import type { Fixture } from '../types.js'

export const fixture: Fixture = {
  type: 'full-transform',
  name: 'component-with-pipes',
  category: 'full-file',
  description: 'Component using pipes in template for data transformation',
  className: 'ComponentWithPipes',
  sourceCode: `
import { Component } from '@angular/core';
import {
  AsyncPipe,
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
  JsonPipe,
  LowerCasePipe,
  PercentPipe,
  TitleCasePipe,
  UpperCasePipe,
} from '@angular/common';
import { Observable, of } from 'rxjs';

interface Product {
  id: number;
  name: string;
  price: number;
  discount: number;
  createdAt: Date;
}

@Component({
  selector: 'app-with-pipes',
  standalone: true,
  imports: [
    AsyncPipe,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    JsonPipe,
    LowerCasePipe,
    PercentPipe,
    TitleCasePipe,
    UpperCasePipe,
  ],
  template: \`
    <div class="product-list">
      <h1>{{ storeName | uppercase }}</h1>
      <p class="subtitle">{{ tagline | titlecase }}</p>

      @for (product of products; track product.id) {
        <div class="product-card">
          <h3>{{ product.name | titlecase }}</h3>
          <p class="price">{{ product.price | currency:'USD':'symbol':'1.2-2' }}</p>
          <p class="discount">{{ product.discount | percent:'1.0-0' }} off</p>
          <p class="date">Added: {{ product.createdAt | date:'mediumDate' }}</p>
          <p class="raw-price">{{ product.price | number:'1.2-2' }}</p>
        </div>
      }

      <div class="async-section">
        <h2>Async Data</h2>
        <p>{{ asyncMessage$ | async }}</p>
        <pre>{{ debugData | json }}</pre>
      </div>

      <div class="slice-demo">
        <h2>First 3 Products</h2>
        @for (product of firstThreeProducts; track product.id) {
          <span>{{ product.name | lowercase }}, </span>
        }
      </div>
    </div>
  \`,
  styles: [\`
    .product-list { padding: 1rem; }
    .product-card { border: 1px solid #ccc; margin: 0.5rem 0; padding: 1rem; }
    .price { color: green; font-weight: bold; }
    .discount { color: red; }
  \`],
})
export class ComponentWithPipes {
  storeName = 'my awesome store';
  tagline = 'the best products at the best prices';

  products: Product[] = [
    { id: 1, name: 'laptop computer', price: 999.99, discount: 0.15, createdAt: new Date('2024-01-15') },
    { id: 2, name: 'wireless mouse', price: 49.99, discount: 0.10, createdAt: new Date('2024-02-20') },
    { id: 3, name: 'mechanical keyboard', price: 149.99, discount: 0.20, createdAt: new Date('2024-03-10') },
    { id: 4, name: 'monitor stand', price: 79.99, discount: 0.05, createdAt: new Date('2024-04-05') },
  ];

  asyncMessage$: Observable<string> = of('Data loaded successfully!');

  debugData = {
    version: '1.0.0',
    environment: 'development',
    features: ['pipes', 'async', 'templates'],
  };

  get firstThreeProducts(): Product[] {
    return this.products.slice(0, 3);
  }
}
`.trim(),
  expectedFeatures: [
    // DomOnly mode uses ɵɵdomElementStart for standalone components with only pipe imports
    // Note: Text uses ɵɵtext (not ɵɵdomText) even in DomOnly mode
    'ɵɵdomElementStart',
    'ɵɵdomElementEnd',
    'ɵɵtext',
    'ɵɵpipe',
    'ɵɵpipeBind1',
    'ɵɵpipeBind2',
    'ɵɵpipeBind4',
    'ɵɵrepeaterCreate',
    'ɵɵtextInterpolate',
  ],
}
