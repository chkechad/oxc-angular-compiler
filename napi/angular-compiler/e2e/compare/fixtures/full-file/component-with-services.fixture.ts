/**
 * Component that injects services.
 *
 * Tests full-file transformation with dependency injection,
 * including constructor injection and the inject() function.
 */
import type { Fixture } from '../types.js'

export const fixture: Fixture = {
  type: 'full-transform',
  name: 'component-with-services',
  category: 'full-file',
  description: 'Component that injects services via constructor and inject()',
  className: 'ComponentWithServices',
  sourceCode: `
import { Component, inject, Inject, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

interface UserService {
  getCurrentUser(): { name: string };
}

interface DataService {
  getData(): string[];
}

// Create injection tokens for the interfaces
export const USER_SERVICE = new InjectionToken<UserService>('UserService');
export const DATA_SERVICE = new InjectionToken<DataService>('DataService');

@Component({
  selector: 'app-with-services',
  standalone: true,
  template: \`
    <div class="user-panel">
      <h2>{{ userName }}</h2>
      @if (isLoading) {
        <p>Loading...</p>
      } @else {
        <ul>
          @for (item of items; track item) {
            <li>{{ item }}</li>
          }
        </ul>
      }
      <button (click)="loadData()">Refresh</button>
      <button (click)="navigate()">Go to Dashboard</button>
    </div>
  \`,
})
export class ComponentWithServices {
  // Modern inject() function style
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  userName = '';
  items: string[] = [];
  isLoading = false;

  // Constructor injection style with @Inject decorator for interface-based tokens
  constructor(
    @Inject(USER_SERVICE) private userService: UserService,
    @Inject(DATA_SERVICE) private dataService: DataService,
  ) {
    this.userName = this.userService.getCurrentUser().name;
  }

  loadData(): void {
    this.isLoading = true;
    this.items = this.dataService.getData();
    this.isLoading = false;
  }

  navigate(): void {
    this.router.navigate(['/dashboard']);
  }
}
`.trim(),
  expectedFeatures: [
    'ɵɵdomElementStart',
    'ɵɵdomElementEnd',
    'ɵɵtext',
    'ɵɵtextInterpolate',
    'ɵɵconditional',
    'ɵɵrepeaterCreate',
    'ɵɵdomListener',
  ],
}
