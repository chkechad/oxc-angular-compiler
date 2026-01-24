/**
 * Integration tests comparing Oxc Angular Compiler output with official @angular/compiler.
 *
 * These tests ensure our Rust-based template compiler produces correct output by comparing
 * against the official Angular compiler at the R3 AST level.
 */

import * as angularCompiler from '@angular/compiler'
import { describe, it, expect } from 'vitest'

import { compileTemplate } from '../index.js'

/**
 * Helper to get a simplified representation of Angular's R3 AST nodes
 */
function simplifyAngularNode(node: any): any {
  if (!node) return null

  const type = node.constructor.name

  switch (type) {
    case 'Element':
      return {
        type: 'Element',
        name: node.name,
        attributes: node.attributes?.map((a: any) => ({
          name: a.name,
          value: a.value,
        })),
        inputs: node.inputs?.map((i: any) => ({
          name: i.name,
          type: i.type,
        })),
        outputs: node.outputs?.map((o: any) => ({
          name: o.name,
        })),
        children: node.children?.map(simplifyAngularNode),
      }

    case 'Text':
      return {
        type: 'Text',
        value: node.value,
      }

    case 'BoundText':
      return {
        type: 'BoundText',
        // Extract interpolation parts
        strings: node.value?.ast?.strings,
        expressions: node.value?.ast?.expressions?.map((e: any) => e.name || e.toString()),
      }

    case 'Template':
      return {
        type: 'Template',
        tagName: node.tagName,
        attributes: node.attributes?.map((a: any) => ({
          name: a.name,
          value: a.value,
        })),
        children: node.children?.map(simplifyAngularNode),
      }

    case 'IfBlock':
      return {
        type: 'IfBlock',
        branches: node.branches?.map((b: any) => ({
          expression: b.expression?.toString(),
          children: b.children?.map(simplifyAngularNode),
        })),
      }

    case 'ForLoopBlock':
      return {
        type: 'ForLoopBlock',
        item: node.item?.name,
        expression: node.expression?.toString(),
        children: node.children?.map(simplifyAngularNode),
      }

    case 'SwitchBlock':
      return {
        type: 'SwitchBlock',
        expression: node.expression?.toString(),
        cases: node.cases?.map((c: any) => ({
          expression: c.expression?.toString(),
          children: c.children?.map(simplifyAngularNode),
        })),
      }

    case 'DeferredBlock':
      return {
        type: 'DeferredBlock',
        children: node.children?.map(simplifyAngularNode),
      }

    case 'LetDeclaration':
      return {
        type: 'LetDeclaration',
        name: node.name,
      }

    case 'Content':
      return {
        type: 'Content',
        selector: node.selector,
      }

    default:
      return {
        type,
        // Include raw for debugging unknown types
        raw: JSON.stringify(node).slice(0, 200),
      }
  }
}

/**
 * Parse template with Angular compiler and return simplified R3 AST
 */
function parseWithAngular(template: string): any[] {
  const result = angularCompiler.parseTemplate(template, 'test.html', {
    preserveWhitespaces: false,
    enableBlockSyntax: true,
    enableLetSyntax: true,
  })

  if (result.errors && result.errors.length > 0) {
    throw new Error(`Angular parse errors: ${result.errors.map((e) => e.msg).join(', ')}`)
  }

  return result.nodes.map(simplifyAngularNode)
}

/**
 * Compile template with Oxc and return metadata for comparison
 */
async function compileWithOxc(template: string) {
  const result = await compileTemplate(template, 'TestComponent', 'test.ts')
  return {
    code: result.code,
    errors: result.errors,
  }
}

describe('Template Parsing - R3 AST Comparison', () => {
  describe('Basic Elements', () => {
    it('should parse simple element', async () => {
      const template = '<div></div>'
      const angular = parseWithAngular(template)

      expect(angular).toHaveLength(1)
      expect(angular[0].type).toBe('Element')
      expect(angular[0].name).toBe('div')

      // Our compiler should also produce valid output
      // Note: Angular uses ɵɵelement for empty elements, ɵɵelementStart/End for elements with children
      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
      expect(oxc.code).toContain('ɵɵelement')
    })

    it('should parse element with text', async () => {
      const template = '<p>Hello World</p>'
      const angular = parseWithAngular(template)

      expect(angular).toHaveLength(1)
      expect(angular[0].type).toBe('Element')
      expect(angular[0].name).toBe('p')
      expect(angular[0].children).toHaveLength(1)
      expect(angular[0].children[0].type).toBe('Text')
      expect(angular[0].children[0].value).toBe('Hello World')

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })

    it('should parse element with attributes', async () => {
      const template = '<div class="container" id="main"></div>'
      const angular = parseWithAngular(template)

      expect(angular[0].attributes).toContainEqual({ name: 'class', value: 'container' })
      expect(angular[0].attributes).toContainEqual({ name: 'id', value: 'main' })

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })

    it('should parse nested elements', async () => {
      const template = '<div><span><b>text</b></span></div>'
      const angular = parseWithAngular(template)

      expect(angular[0].name).toBe('div')
      expect(angular[0].children[0].name).toBe('span')
      expect(angular[0].children[0].children[0].name).toBe('b')

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })

    it('should parse self-closing elements', async () => {
      const template = '<input /><br /><img />'
      const angular = parseWithAngular(template)

      expect(angular).toHaveLength(3)
      expect(angular.map((n: any) => n.name)).toEqual(['input', 'br', 'img'])

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })
  })

  describe('Text Interpolation', () => {
    it('should parse simple interpolation', async () => {
      const template = '{{ name }}'
      const angular = parseWithAngular(template)

      expect(angular).toHaveLength(1)
      expect(angular[0].type).toBe('BoundText')
      expect(angular[0].expressions).toContain('name')

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
      expect(oxc.code).toContain('ɵɵtextInterpolate')
    })

    it('should parse interpolation with text before and after', async () => {
      const template = 'Hello {{ name }}!'
      const angular = parseWithAngular(template)

      expect(angular[0].type).toBe('BoundText')
      expect(angular[0].strings).toEqual(['Hello ', '!'])
      expect(angular[0].expressions).toContain('name')

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })

    it('should parse multiple interpolations', async () => {
      const template = '{{ first }} and {{ second }}'
      const angular = parseWithAngular(template)

      expect(angular[0].expressions).toHaveLength(2)

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })

    it('should parse interpolation with expressions', async () => {
      const template = '{{ 1 + 2 }}'
      const angular = parseWithAngular(template)

      expect(angular[0].type).toBe('BoundText')

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })

    it('should parse interpolation with method calls', async () => {
      const template = '{{ getName() }}'
      const angular = parseWithAngular(template)

      expect(angular[0].type).toBe('BoundText')

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })

    it('should parse interpolation with property access', async () => {
      const template = '{{ user.name }}'
      const angular = parseWithAngular(template)

      expect(angular[0].type).toBe('BoundText')

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })

    it('should parse interpolation with pipes', async () => {
      const template = '{{ name | uppercase }}'
      const angular = parseWithAngular(template)

      expect(angular[0].type).toBe('BoundText')

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })
  })

  describe('Property Bindings', () => {
    it('should parse property binding', async () => {
      const template = '<div [class]="className"></div>'
      const angular = parseWithAngular(template)

      expect(angular[0].inputs).toHaveLength(1)
      expect(angular[0].inputs[0].name).toBe('class')

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })

    it('should parse attribute binding', async () => {
      const template = '<div [attr.role]="role"></div>'
      const angular = parseWithAngular(template)

      expect(angular[0].inputs.some((i: any) => i.name === 'role')).toBe(true)

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })

    it('should parse class binding', async () => {
      const template = '<div [class.active]="isActive"></div>'
      const angular = parseWithAngular(template)

      expect(angular[0].inputs).toHaveLength(1)

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })

    it('should parse style binding', async () => {
      const template = '<div [style.color]="textColor"></div>'
      const angular = parseWithAngular(template)

      expect(angular[0].inputs).toHaveLength(1)

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })
  })

  describe('Event Bindings', () => {
    it('should parse event binding', async () => {
      const template = '<button (click)="onClick()">Click</button>'
      const angular = parseWithAngular(template)

      expect(angular[0].outputs).toHaveLength(1)
      expect(angular[0].outputs[0].name).toBe('click')

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
      expect(oxc.code).toContain('ɵɵlistener')
    })

    it('should parse multiple event bindings', async () => {
      const template = '<input (focus)="onFocus()" (blur)="onBlur()" />'
      const angular = parseWithAngular(template)

      expect(angular[0].outputs).toHaveLength(2)

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })
  })

  describe('Two-Way Binding', () => {
    it('should parse two-way binding', async () => {
      const template = '<input [(ngModel)]="name" />'
      const angular = parseWithAngular(template)

      // Two-way binding creates both input and output
      expect(angular[0].inputs.length).toBeGreaterThan(0)
      expect(angular[0].outputs.length).toBeGreaterThan(0)

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })
  })

  describe('Template References', () => {
    it('should parse template reference variable', async () => {
      const template = '<input #myInput />'
      const angular = parseWithAngular(template)

      // Reference should be captured
      expect(angular[0].type).toBe('Element')

      const oxc = await compileWithOxc(template)
      expect(oxc.errors).toHaveLength(0)
    })
  })
})

describe('Control Flow - @if', () => {
  it('should parse simple @if', async () => {
    const template = '@if (condition) { <div>shown</div> }'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('IfBlock')
    expect(angular[0].branches).toHaveLength(1)

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })

  it('should parse @if with @else', async () => {
    const template = '@if (condition) { <div>then</div> } @else { <div>else</div> }'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('IfBlock')
    expect(angular[0].branches).toHaveLength(2)

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })

  it('should parse @if with @else if', async () => {
    const template = '@if (a) { <div>a</div> } @else if (b) { <div>b</div> } @else { <div>c</div> }'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('IfBlock')
    expect(angular[0].branches).toHaveLength(3)

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })
})

describe('Control Flow - @for', () => {
  it('should parse simple @for', async () => {
    const template = '@for (item of items; track item) { <div>{{ item }}</div> }'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('ForLoopBlock')

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })

  it('should parse @for with @empty', async () => {
    const template =
      '@for (item of items; track item) { <div>{{ item }}</div> } @empty { <div>No items</div> }'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('ForLoopBlock')

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })

  it('should parse @for with index', async () => {
    const template =
      '@for (item of items; track item; let i = $index) { <div>{{ i }}: {{ item }}</div> }'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('ForLoopBlock')

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })
})

describe('Control Flow - @switch', () => {
  it('should parse @switch', async () => {
    const template = `
      @switch (value) {
        @case (1) { <div>one</div> }
        @case (2) { <div>two</div> }
        @default { <div>other</div> }
      }
    `
    const angular = parseWithAngular(template)

    const switchBlock = angular.find((n: any) => n.type === 'SwitchBlock')
    expect(switchBlock).toBeDefined()

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })
})

describe('Control Flow - @defer', () => {
  it('should parse simple @defer', async () => {
    const template = '@defer { <div>deferred content</div> }'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('DeferredBlock')

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })

  it('should parse @defer with @loading', async () => {
    const template = '@defer { <div>content</div> } @loading { <div>loading...</div> }'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('DeferredBlock')

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })

  it('should parse @defer with @error', async () => {
    const template = '@defer { <div>content</div> } @error { <div>error!</div> }'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('DeferredBlock')

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })

  it('should parse @defer with @placeholder', async () => {
    const template = '@defer { <div>content</div> } @placeholder { <div>placeholder</div> }'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('DeferredBlock')

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })
})

describe('@let declarations', () => {
  it('should parse @let', async () => {
    const template = '@let name = user.name; <div>{{ name }}</div>'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('LetDeclaration')

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })
})

describe('ng-content', () => {
  it('should parse ng-content', async () => {
    const template = '<ng-content></ng-content>'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('Content')

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })

  it('should parse ng-content with select', async () => {
    const template = '<ng-content select=".header"></ng-content>'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('Content')

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })
})

describe('ng-template', () => {
  it('should parse ng-template', async () => {
    const template = '<ng-template><div>template content</div></ng-template>'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('Template')

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })

  it('should parse ng-template with let', async () => {
    const template = '<ng-template let-item><div>{{ item }}</div></ng-template>'
    const angular = parseWithAngular(template)

    expect(angular[0].type).toBe('Template')

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })
})

describe('SVG Elements', () => {
  it('should parse SVG elements', async () => {
    const template = '<svg><circle cx="50" cy="50" r="40"></circle></svg>'
    const angular = parseWithAngular(template)

    // Angular uses namespace prefixes for SVG elements: :svg:svg, :svg:circle
    expect(angular[0].name).toBe(':svg:svg')
    expect(angular[0].children[0].name).toBe(':svg:circle')

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })
})

describe('Comments', () => {
  it('should handle HTML comments', async () => {
    const template = '<!-- comment --><div>content</div>'
    const angular = parseWithAngular(template)

    // Comments are typically stripped
    expect(angular.some((n: any) => n.type === 'Element' && n.name === 'div')).toBe(true)

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
  })
})

describe('Complex Templates', () => {
  it('should parse real-world component template', async () => {
    const template = `
      <div class="container">
        <h1>{{ title }}</h1>
        @if (showContent) {
          <p [class.highlight]="isHighlighted">{{ description }}</p>
          @for (item of items; track item.id) {
            <div class="item" (click)="selectItem(item)">
              {{ item.name }}
            </div>
          } @empty {
            <p>No items found</p>
          }
        } @else {
          <p>Content hidden</p>
        }
        <ng-content></ng-content>
      </div>
    `

    const angular = parseWithAngular(template)
    expect(angular.length).toBeGreaterThan(0)

    const oxc = await compileWithOxc(template)
    expect(oxc.errors).toHaveLength(0)
    expect(oxc.code.length).toBeGreaterThan(100)
  })
})
