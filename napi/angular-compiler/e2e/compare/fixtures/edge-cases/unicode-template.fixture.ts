/**
 * Unicode and emoji in templates.
 *
 * Tests that the compiler correctly handles various Unicode characters
 * including emojis, CJK characters, RTL text, mathematical symbols,
 * and special characters in templates.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'unicode-emoji-text',
    category: 'edge-cases',
    description: 'Emoji characters in text content',
    className: 'UnicodeEmojiTextComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-unicode-emoji-text',
  standalone: true,
  template: \`
      <h1>Welcome to Our App! \u{1F389}\u{1F680}</h1>
      <p>Status: \u2705 Complete \u2B50 Starred \u{1F4A1} Ideas</p>
      <div>\u{1F600} \u{1F60D} \u{1F914} \u{1F4AA} \u{1F44D}</div>
    \`,
})
export class UnicodeEmojiTextComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵtext'],
  },
  {
    name: 'unicode-cjk-characters',
    category: 'edge-cases',
    description: 'Chinese, Japanese, Korean characters',
    className: 'UnicodeCjkCharactersComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-unicode-cjk-characters',
  standalone: true,
  template: \`
      <div>中文内容 - Chinese Content</div>
      <div>日本語のコンテンツ - Japanese Content</div>
      <div>한국어 콘텐츠 - Korean Content</div>
      <p>混合: 你好こんにちは안녕</p>
    \`,
})
export class UnicodeCjkCharactersComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵtext'],
  },
  {
    name: 'unicode-rtl-text',
    category: 'edge-cases',
    description: 'Right-to-left languages (Arabic, Hebrew)',
    className: 'UnicodeRtlTextComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-unicode-rtl-text',
  standalone: true,
  template: \`
      <div dir="rtl">مرحبا بالعالم</div>
      <div dir="rtl">שלום עולם</div>
      <p>السلام عليكم</p>
    \`,
})
export class UnicodeRtlTextComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵtext'],
  },
  {
    name: 'unicode-math-symbols',
    category: 'edge-cases',
    description: 'Mathematical and scientific symbols',
    className: 'UnicodeMathSymbolsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-unicode-math-symbols',
  standalone: true,
  template: \`
      <div>\u03C0 \u2248 3.14159</div>
      <div>\u2211 \u222B \u221E \u2202 \u0394</div>
      <div>\u221A2 \u00D7 \u221A2 = 2</div>
      <span>\u2200x \u2208 \u211D: x\u00B2 \u2265 0</span>
    \`,
})
export class UnicodeMathSymbolsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵtext'],
  },
  {
    name: 'unicode-currency-symbols',
    category: 'edge-cases',
    description: 'Currency and financial symbols',
    className: 'UnicodeCurrencySymbolsComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-unicode-currency-symbols',
  standalone: true,
  template: \`
      <div>Price: $99.99 | \u20AC89.99 | \u00A379.99 | \u00A512,000</div>
      <span>\u20BF 0.0025 | \u20B9 8,500 | \u20A9 125,000</span>
    \`,
})
export class UnicodeCurrencySymbolsComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵtext'],
  },
  {
    name: 'unicode-in-interpolation',
    category: 'edge-cases',
    description: 'Unicode mixed with interpolations',
    className: 'UnicodeInInterpolationComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-unicode-in-interpolation',
  standalone: true,
  template: \`
      <div>\u{1F44B} Hello, {{ userName }}!</div>
      <p>{{ status }} \u2705 {{ taskCount }} 任务完成</p>
      <span>{{ greeting }} \u{1F31F}</span>
    \`,
})
export class UnicodeInInterpolationComponent {
  userName = 'User';
  status = 'Done';
  taskCount = 5;
  greeting = 'Welcome';
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
  {
    name: 'unicode-in-attributes',
    category: 'edge-cases',
    description: 'Unicode in element attributes',
    className: 'UnicodeInAttributesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-unicode-in-attributes',
  standalone: true,
  template: \`
      <button title="点击这里 \u{1F449}">提交</button>
      <input placeholder="搜索... \u{1F50D}">
      <div aria-label="مرحبا بك">内容</div>
    \`,
})
export class UnicodeInAttributesComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelement'],
  },
  {
    name: 'unicode-composite-emoji',
    category: 'edge-cases',
    description: 'Composite and flag emojis (ZWJ sequences)',
    className: 'UnicodeCompositeEmojiComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-unicode-composite-emoji',
  standalone: true,
  template: \`
      <div>\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466} Family</div>
      <div>\u{1F1FA}\u{1F1F8} \u{1F1EC}\u{1F1E7} \u{1F1EF}\u{1F1F5} \u{1F1E8}\u{1F1F3} Flags</div>
      <span>\u{1F469}\u200D\u{1F4BB} \u{1F468}\u200D\u{1F3A8} \u{1F9D1}\u200D\u{1F680}</span>
    \`,
})
export class UnicodeCompositeEmojiComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵtext'],
  },
  {
    name: 'unicode-special-escapes',
    category: 'edge-cases',
    description: 'Characters that need special handling',
    className: 'UnicodeSpecialEscapesComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-unicode-special-escapes',
  standalone: true,
  template: \`
      <div>Line separator\u2028and paragraph separator\u2029here</div>
      <div>Zero-width: \u200B joiner \u200D non-joiner \u200C</div>
      <div>Quotes: "" '' «»</div>
      <pre>Tab:\tNewline:
Carriage:\r</pre>
    \`,
})
export class UnicodeSpecialEscapesComponent {}
    `.trim(),
    expectedFeatures: ['ɵɵelementStart', 'ɵɵtext'],
  },
  {
    name: 'unicode-in-control-flow',
    category: 'edge-cases',
    description: 'Unicode in control flow expressions',
    className: 'UnicodeInControlFlowComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-unicode-in-control-flow',
  standalone: true,
  template: \`
      @if (show中文) {
        <div>显示中文</div>
      }
      @for (item of 列表; track item.id) {
        <span>{{ item.名称 }}</span>
      }
    \`,
})
export class UnicodeInControlFlowComponent {
  show中文 = true;
  列表: { id: number; 名称: string }[] = [];
}
    `.trim(),
    expectedFeatures: ['ɵɵconditional', 'ɵɵrepeaterCreate'],
    skip: true,
    skipReason: 'Angular expression parser does not support unicode identifiers',
  },
]
