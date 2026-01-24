//! Tests for elide-angular-metadata transformation.
//! Ported from Angular CLI: packages/angular/build/src/tools/babel/plugins/elide-angular-metadata_spec.ts

use oxc_allocator::Allocator;
use oxc_angular_compiler::optimizer::{OptimizeOptions, optimize};

fn test_elide_metadata(input: &str, expected_contains: &[&str], expected_not_contains: &[&str]) {
    let allocator = Allocator::default();
    let options = OptimizeOptions { elide_metadata: true, ..OptimizeOptions::default() };

    let result = optimize(&allocator, input, "test.js", options);

    for expected in expected_contains {
        assert!(
            result.code.contains(expected),
            "Expected output to contain '{}'\n\nActual output:\n{}",
            expected,
            result.code
        );
    }

    for not_expected in expected_not_contains {
        assert!(
            !result.code.contains(not_expected),
            "Expected output NOT to contain '{}'\n\nActual output:\n{}",
            not_expected,
            result.code
        );
    }
}

#[test]
fn test_elides_pure_annotated_set_class_metadata() {
    let input = r"
import { Component } from '@angular/core';
export class SomeClass {}
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(Clazz, [{
    type: Component,
    args: [{
        selector: 'app-lazy',
        template: 'very lazy',
        styles: []
    }]
}], null, null); })();
";

    test_elide_metadata(input, &["export class SomeClass {}", "void 0"], &["ɵsetClassMetadata"]);
}

#[test]
fn test_elides_jit_mode_protected_set_class_metadata() {
    let input = r#"
import { Component } from '@angular/core';
export class SomeClass {}
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵsetClassMetadata(SomeClass, [{
    type: Component,
    args: [{
        selector: 'app-lazy',
        template: 'very lazy',
        styles: []
    }]
}], null, null); })();
"#;

    test_elide_metadata(
        input,
        &[
            "export class SomeClass {}",
            "(typeof ngJitMode === \"undefined\" || ngJitMode) && void 0",
        ],
        &["ɵsetClassMetadata"],
    );
}

#[test]
fn test_elides_set_class_metadata_inside_arrow_function_iife() {
    let input = r"
import { Component } from '@angular/core';
export class SomeClass {}
/*@__PURE__*/ (() => { i0.ɵsetClassMetadata(Clazz, [{
    type: Component,
    args: [{
        selector: 'app-lazy',
        template: 'very lazy',
        styles: []
    }]
}], null, null); })();
";

    test_elide_metadata(input, &["export class SomeClass {}", "void 0"], &["ɵsetClassMetadata"]);
}

#[test]
fn test_elides_pure_annotated_set_class_metadata_async() {
    let input = r#"
import { Component } from '@angular/core';
export class SomeClass {}
/*@__PURE__*/ (function () {
  i0.ɵsetClassMetadataAsync(SomeClass,
    function () { return [import("./cmp-a").then(function (m) { return m.CmpA; })]; },
    function (CmpA) { i0.ɵsetClassMetadata(SomeClass, [{
        type: Component,
        args: [{
            selector: 'test-cmp',
            standalone: true,
            imports: [CmpA, LocalDep],
            template: '{#defer}<cmp-a/>{/defer}',
        }]
      }], null, null); });
    })();
"#;

    test_elide_metadata(
        input,
        &["export class SomeClass {}", "void 0"],
        &["ɵsetClassMetadataAsync", "ɵsetClassMetadata"],
    );
}

#[test]
fn test_elides_jit_mode_protected_set_class_metadata_async() {
    let input = r#"
import { Component } from '@angular/core';
export class SomeClass {}
(function () {
  (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵsetClassMetadataAsync(SomeClass,
    function () { return [import("./cmp-a").then(function (m) { return m.CmpA; })]; },
    function (CmpA) { i0.ɵsetClassMetadata(SomeClass, [{
        type: Component,
        args: [{
            selector: 'test-cmp',
            standalone: true,
            imports: [CmpA, LocalDep],
            template: '{#defer}<cmp-a/>{/defer}',
        }]
      }], null, null); });
    })();
"#;

    test_elide_metadata(
        input,
        &[
            "export class SomeClass {}",
            "(typeof ngJitMode === \"undefined\" || ngJitMode) && void 0",
        ],
        &["ɵsetClassMetadataAsync"],
    );
}

#[test]
fn test_elides_arrow_function_based_set_class_metadata_async() {
    let input = r#"
import { Component } from '@angular/core';
export class SomeClass {}
/*@__PURE__*/ (() => {
  i0.ɵsetClassMetadataAsync(SomeClass,
    () => [import("./cmp-a").then(m => m.CmpA)],
    (CmpA) => { i0.ɵsetClassMetadata(SomeClass, [{
        type: Component,
        args: [{
            selector: 'test-cmp',
            standalone: true,
            imports: [CmpA, LocalDep],
            template: '{#defer}<cmp-a/>{/defer}',
        }]
      }], null, null); });
    })();
"#;

    test_elide_metadata(
        input,
        &["export class SomeClass {}", "void 0"],
        &["ɵsetClassMetadataAsync"],
    );
}

#[test]
fn test_elides_set_class_debug_info() {
    let input = r"
import { Component } from '@angular/core';
class SomeClass {}
(() => {
  (typeof ngDevMode === 'undefined' || ngDevMode) &&
    i0.ɵsetClassDebugInfo(SomeClass, { className: 'SomeClass' });
})();
";

    test_elide_metadata(
        input,
        &["class SomeClass {}", "ngDevMode", "void 0"],
        &["ɵsetClassDebugInfo"],
    );
}

#[test]
fn test_elides_ng_dev_mode_check_with_set_class_metadata() {
    let input = r#"
(function () {
    (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MyComponent, [{
        type: Component
    }], null, null);
})();
"#;

    test_elide_metadata(
        input,
        &["(typeof ngDevMode === \"undefined\" || ngDevMode) && void 0"],
        &["ɵsetClassMetadata"],
    );
}

#[test]
fn test_preserves_non_metadata_iife() {
    let input = r"
(function () {
    console.log('This is not metadata');
})();
";

    let allocator = Allocator::default();
    let options = OptimizeOptions { elide_metadata: true, ..OptimizeOptions::default() };

    let result = optimize(&allocator, input, "test.js", options);

    assert!(result.code.contains("console.log"), "Expected non-metadata IIFE to be preserved");
}

#[test]
fn test_handles_multiple_metadata_calls() {
    let input = r"
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(ComponentA, [], null, null); })();
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(ComponentB, [], null, null); })();
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(ComponentC, [], null, null); })();
";

    test_elide_metadata(input, &["void 0"], &["ɵsetClassMetadata"]);
}

#[test]
fn test_handles_member_expression_callee() {
    // When callee is i0.ɵsetClassMetadata (member expression)
    let input = r#"
(function () {
    (typeof ngDevMode === "undefined" || ngDevMode) && angular.ɵsetClassMetadata(MyComponent, [], null, null);
})();
"#;

    test_elide_metadata(input, &["void 0"], &["angular.ɵsetClassMetadata"]);
}

#[test]
fn test_handles_direct_call_without_namespace() {
    // When callee is just ɵsetClassMetadata (identifier)
    let input = r#"
(function () {
    (typeof ngDevMode === "undefined" || ngDevMode) && ɵsetClassMetadata(MyComponent, [], null, null);
})();
"#;

    test_elide_metadata(input, &["void 0"], &["ɵsetClassMetadata("]);
}
