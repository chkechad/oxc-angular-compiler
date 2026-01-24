/**
 * @let declaration blocks in Angular templates.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'let-basic',
    category: 'control-flow',
    description: 'Basic @let declaration with simple expression',
    className: 'LetBasicComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-let-basic',
  standalone: true,
  template: \`
    @let name = 'World';
    <div>Hello, {{ name }}!</div>
  \`,
})
export class LetBasicComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdeclareLet'],
  },
  {
    name: 'let-property-access',
    category: 'control-flow',
    description: '@let with property access expression',
    className: 'LetPropertyAccessComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-let-property-access',
  standalone: true,
  template: \`
    @let userName = user.name;
    @let userAge = user.profile.age;
    <div>{{ userName }} is {{ userAge }} years old</div>
  \`,
})
export class LetPropertyAccessComponent {
  user = { name: 'John', profile: { age: 30 } };
}
    `.trim(),
    expectedFeatures: ['ɵɵdeclareLet'],
  },
  {
    name: 'let-method-call',
    category: 'control-flow',
    description: '@let with method call expression',
    className: 'LetMethodCallComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-let-method-call',
  standalone: true,
  template: \`
    @let total = calculateTotal(items);
    @let formatted = formatCurrency(total);
    <div>Total: {{ formatted }}</div>
  \`,
})
export class LetMethodCallComponent {
  items = [10, 20, 30];
  calculateTotal(items: number[]) { return items.reduce((a, b) => a + b, 0); }
  formatCurrency(value: number) { return '$' + value.toFixed(2); }
}
    `.trim(),
    expectedFeatures: ['ɵɵdeclareLet'],
  },
  {
    name: 'let-in-if-block',
    category: 'control-flow',
    description: '@let inside @if block',
    className: 'LetInIfBlockComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-let-in-if-block',
  standalone: true,
  template: \`
    @if (user) {
      @let displayName = user.firstName + ' ' + user.lastName;
      <div>Welcome, {{ displayName }}!</div>
    }
  \`,
})
export class LetInIfBlockComponent {
  user: { firstName: string; lastName: string } | null = { firstName: 'John', lastName: 'Doe' };
}
    `.trim(),
    expectedFeatures: ['ɵɵdeclareLet', 'ɵɵconditional'],
  },
  {
    name: 'let-in-for-block',
    category: 'control-flow',
    description: '@let inside @for block',
    className: 'LetInForBlockComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-let-in-for-block',
  standalone: true,
  template: \`
    @for (item of items; track item.id) {
      @let discountedPrice = item.price * 0.9;
      <div>{{ item.name }}: {{ discountedPrice }}</div>
    }
  \`,
})
export class LetInForBlockComponent {
  items = [{ id: 1, name: 'Item 1', price: 100 }, { id: 2, name: 'Item 2', price: 200 }];
}
    `.trim(),
    expectedFeatures: ['ɵɵdeclareLet', 'ɵɵrepeaterCreate'],
  },
  {
    name: 'let-nested-scopes',
    category: 'control-flow',
    description: '@let in multiple nested scopes',
    className: 'LetNestedScopesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-let-nested-scopes',
  standalone: true,
  template: \`
    @let baseMultiplier = 1.5;
    @if (showItems) {
      @let categoryMultiplier = baseMultiplier * 2;
      @for (item of items; track item.id) {
        @let finalPrice = item.price * categoryMultiplier;
        <div>{{ item.name }}: {{ finalPrice }}</div>
      }
    }
  \`,
})
export class LetNestedScopesComponent {
  showItems = true;
  items = [{ id: 1, name: 'Item 1', price: 100 }];
}
    `.trim(),
    expectedFeatures: ['ɵɵdeclareLet', 'ɵɵconditional', 'ɵɵrepeaterCreate'],
  },
  {
    name: 'let-with-pipe',
    category: 'control-flow',
    description: '@let with pipe transformation',
    className: 'LetWithPipeComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-let-with-pipe',
  standalone: true,
  imports: [DatePipe, UpperCasePipe],
  template: \`
    @let formattedDate = today | date:'fullDate';
    @let upperName = user.name | uppercase;
    <div>{{ upperName }} - {{ formattedDate }}</div>
  \`,
})
export class LetWithPipeComponent {
  today = new Date();
  user = { name: 'John' };
}
    `.trim(),
    expectedFeatures: ['ɵɵdeclareLet', 'ɵɵpipe', 'ɵɵpipeBind1', 'ɵɵpipeBind2'],
  },
  {
    name: 'let-with-chained-pipes',
    category: 'control-flow',
    description: '@let with chained pipe transformations',
    className: 'LetWithChainedPipesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { of } from 'rxjs';

@Component({
  selector: 'app-let-with-chained-pipes',
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  template: \`
    @let result = data$ | async | json;
    <pre>{{ result }}</pre>
  \`,
})
export class LetWithChainedPipesComponent {
  data$ = of({ message: 'Hello' });
}
    `.trim(),
    expectedFeatures: ['ɵɵdeclareLet', 'ɵɵpipe', 'ɵɵpipeBind1'],
  },
  {
    name: 'let-complex-expression',
    category: 'control-flow',
    description: '@let with complex ternary expression',
    className: 'LetComplexExpressionComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-let-complex-expression',
  standalone: true,
  template: \`
    @let status = isLoading ? 'Loading...' : (hasError ? 'Error' : 'Ready');
    @let fullName = user?.firstName && user?.lastName ? user.firstName + ' ' + user.lastName : 'Anonymous';
    <div class="{{ status }}">{{ fullName }}</div>
  \`,
})
export class LetComplexExpressionComponent {
  isLoading = false;
  hasError = false;
  user: { firstName?: string; lastName?: string } | null = { firstName: 'John', lastName: 'Doe' };
}
    `.trim(),
    expectedFeatures: ['ɵɵdeclareLet'],
  },
  {
    name: 'let-array-operations',
    category: 'control-flow',
    description: '@let with array operations',
    className: 'LetArrayOperationsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-let-array-operations',
  standalone: true,
  template: \`
    @let firstItem = items[0];
    @let itemCount = items.length;
    @let hasItems = items.length > 0;
    <div>First: {{ firstItem?.name }}, Count: {{ itemCount }}, Has items: {{ hasItems }}</div>
  \`,
})
export class LetArrayOperationsComponent {
  items = [{ name: 'Item 1' }, { name: 'Item 2' }];
}
    `.trim(),
    expectedFeatures: ['ɵɵdeclareLet'],
  },
  {
    name: 'let-multiple-declarations',
    category: 'control-flow',
    description: 'Multiple @let declarations in sequence',
    className: 'LetMultipleDeclarationsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-let-multiple-declarations',
  standalone: true,
  template: \`
    @let a = 1;
    @let b = 2;
    @let c = a + b;
    @let d = c * 2;
    <div>Result: {{ d }}</div>
  \`,
})
export class LetMultipleDeclarationsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵdeclareLet'],
  },
  {
    name: 'let-in-switch-case',
    category: 'control-flow',
    description: '@let inside @switch cases',
    className: 'LetInSwitchCaseComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-let-in-switch-case',
  standalone: true,
  template: \`
    @switch (status) {
      @case ('active') {
        @let message = 'User is currently active';
        <div class="active">{{ message }}</div>
      }
      @case ('inactive') {
        @let message = 'User is inactive';
        <div class="inactive">{{ message }}</div>
      }
      @default {
        @let message = 'Unknown status';
        <div>{{ message }}</div>
      }
    }
  \`,
})
export class LetInSwitchCaseComponent {
  status: 'active' | 'inactive' | 'unknown' = 'active';
}
    `.trim(),
    expectedFeatures: ['ɵɵdeclareLet', 'ɵɵconditional'],
  },
]
