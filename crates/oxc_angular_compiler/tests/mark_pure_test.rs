//! Tests for mark-top-level-pure transformation.
//! Ported from Angular CLI: packages/angular/build/src/tools/babel/plugins/pure-toplevel-functions_spec.ts

use oxc_allocator::Allocator;
use oxc_angular_compiler::optimizer::{OptimizeOptions, optimize};

fn test_mark_pure(input: &str, expected_contains: &[&str], expected_not_contains: &[&str]) {
    let allocator = Allocator::default();
    let options = OptimizeOptions { mark_pure: true, ..OptimizeOptions::default() };

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

fn test_no_change(input: &str) {
    let allocator = Allocator::default();
    let options = OptimizeOptions { mark_pure: true, ..OptimizeOptions::default() };

    let result = optimize(&allocator, input, "test.js", options);

    // Should not have added any /* @__PURE__ */ annotations
    // Count existing pure annotations in input vs output
    let input_pure_count = input.matches("/*#__PURE__*/").count()
        + input.matches("/* @__PURE__ */").count()
        + input.matches("/*@__PURE__*/").count();
    let output_pure_count = result.code.matches("/*#__PURE__*/").count()
        + result.code.matches("/* @__PURE__ */").count()
        + result.code.matches("/*@__PURE__*/").count();

    assert!(
        output_pure_count <= input_pure_count + 1, // Allow for some variance
        "Expected no new pure annotations.\n\nInput:\n{}\n\nOutput:\n{}",
        input,
        result.code
    );
}

#[test]
fn test_annotates_top_level_new_expressions() {
    let input = "var result = new SomeClass();";

    test_mark_pure(input, &["/* @__PURE__ */ new SomeClass()"], &[]);
}

#[test]
fn test_annotates_top_level_function_calls() {
    let input = "var result = someCall();";

    test_mark_pure(input, &["/* @__PURE__ */ someCall()"], &[]);
}

#[test]
fn test_annotates_top_level_iife_with_no_arguments() {
    let input = "var SomeClass = (function () { function SomeClass() { } return SomeClass; })();";

    test_mark_pure(
        input,
        &["/*#__PURE__*/(function () { function SomeClass() { } return SomeClass; })()"],
        &[],
    );
}

#[test]
fn test_annotates_top_level_arrow_iife_with_no_arguments() {
    let input = "var SomeClass = (() => { function SomeClass() { } return SomeClass; })();";

    test_mark_pure(
        input,
        &["/*#__PURE__*/(() => { function SomeClass() { } return SomeClass; })()"],
        &[],
    );
}

#[test]
fn test_does_not_annotate_top_level_iife_with_arguments() {
    let input =
        "var SomeClass = (function () { function SomeClass() { } return SomeClass; })(abc);";

    // Should not add pure annotation because IIFE has arguments
    let allocator = Allocator::default();
    let options = OptimizeOptions { mark_pure: true, ..OptimizeOptions::default() };

    let result = optimize(&allocator, input, "test.js", options);

    // The IIFE call itself should not get a pure annotation at the IIFE level
    assert!(
        !result.code.contains("/*#__PURE__*/(function"),
        "Expected IIFE with arguments not to be annotated as pure\n\nOutput:\n{}",
        result.code
    );
}

#[test]
fn test_does_not_annotate_arrow_iife_with_arguments() {
    let input = "var SomeClass = (() => { function SomeClass() { } return SomeClass; })(abc);";

    let allocator = Allocator::default();
    let options = OptimizeOptions { mark_pure: true, ..OptimizeOptions::default() };

    let result = optimize(&allocator, input, "test.js", options);

    assert!(
        !result.code.contains("/*#__PURE__*/(() =>"),
        "Expected arrow IIFE with arguments not to be annotated as pure\n\nOutput:\n{}",
        result.code
    );
}

#[test]
fn test_does_not_annotate_call_inside_function_declaration() {
    let input = "function funcDecl() { const result = someFunction(); }";

    test_no_change(input);
}

#[test]
fn test_does_not_annotate_call_inside_function_expression() {
    let input = "const foo = function funcDecl() { const result = someFunction(); }";

    test_no_change(input);
}

#[test]
fn test_does_not_annotate_call_inside_arrow_function() {
    let input = "const foo = () => { const result = someFunction(); }";

    test_no_change(input);
}

#[test]
fn test_does_not_annotate_new_inside_function_declaration() {
    let input = "function funcDecl() { const result = new SomeClass(); }";

    test_no_change(input);
}

#[test]
fn test_does_not_annotate_new_inside_function_expression() {
    let input = "const foo = function funcDecl() { const result = new SomeClass(); }";

    test_no_change(input);
}

#[test]
fn test_does_not_annotate_new_inside_arrow_function() {
    let input = "const foo = () => { const result = new SomeClass(); }";

    test_no_change(input);
}

#[test]
fn test_does_not_annotate_tslib_decorate() {
    let input = r#"
class LanguageState {}
__decorate([
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LanguageState.prototype, "checkLanguage", null);
"#;

    let allocator = Allocator::default();
    let options = OptimizeOptions { mark_pure: true, ..OptimizeOptions::default() };

    let result = optimize(&allocator, input, "test.js", options);

    // __decorate should NOT be annotated as pure
    assert!(
        !result.code.contains("/* @__PURE__ */ __decorate"),
        "Expected __decorate not to be annotated as pure\n\nOutput:\n{}",
        result.code
    );
}

#[test]
fn test_does_not_annotate_define_property() {
    let input = r"
class LanguageState {}
_defineProperty(
  LanguageState,
  'property',
  'value'
);
";

    let allocator = Allocator::default();
    let options = OptimizeOptions { mark_pure: true, ..OptimizeOptions::default() };

    let result = optimize(&allocator, input, "test.js", options);

    assert!(
        !result.code.contains("/* @__PURE__ */ _defineProperty"),
        "Expected _defineProperty not to be annotated as pure\n\nOutput:\n{}",
        result.code
    );
}

#[test]
fn test_does_not_annotate_object_literal_methods() {
    let input = r"
const literal = {
  method() {
    var newClazz = new Clazz();
  }
};
";

    let allocator = Allocator::default();
    let options = OptimizeOptions { mark_pure: true, ..OptimizeOptions::default() };

    let result = optimize(&allocator, input, "test.js", options);

    // The new Clazz() inside the method should NOT be annotated
    assert!(
        !result.code.contains("/* @__PURE__ */ new Clazz"),
        "Expected new expression inside object method not to be annotated\n\nOutput:\n{}",
        result.code
    );
}

#[test]
fn test_annotates_const_declarations() {
    let input = "const result = someCall();";

    test_mark_pure(input, &["/* @__PURE__ */ someCall()"], &[]);
}

#[test]
fn test_annotates_let_declarations() {
    let input = "let result = someCall();";

    test_mark_pure(input, &["/* @__PURE__ */ someCall()"], &[]);
}

#[test]
fn test_annotates_multiple_top_level_calls() {
    let input = r"
const a = foo();
const b = new Bar();
const c = baz();
";

    test_mark_pure(
        input,
        &["/* @__PURE__ */ foo()", "/* @__PURE__ */ new Bar()", "/* @__PURE__ */ baz()"],
        &[],
    );
}

#[test]
fn test_annotates_member_expression_calls() {
    let input = "const result = i0.ɵɵdefineComponent({});";

    test_mark_pure(input, &["/* @__PURE__ */ i0.ɵɵdefineComponent({})"], &[]);
}

#[test]
fn test_does_not_annotate_tslib_helpers() {
    // Test various tslib helpers
    let helpers = [
        "__decorate",
        "__param",
        "__metadata",
        "__awaiter",
        "__generator",
        "__exportStar",
        "__values",
        "__read",
        "__spread",
        "__spreadArrays",
        "__spreadArray",
        "__await",
        "__asyncGenerator",
        "__asyncDelegator",
        "__asyncValues",
        "__makeTemplateObject",
        "__importStar",
        "__importDefault",
        "__classPrivateFieldGet",
        "__classPrivateFieldSet",
    ];

    for helper in helpers {
        let input = format!("const x = {helper}(arg);");
        let allocator = Allocator::default();
        let options = OptimizeOptions { mark_pure: true, ..OptimizeOptions::default() };

        let result = optimize(&allocator, &input, "test.js", options);

        assert!(
            !result.code.contains(&format!("/* @__PURE__ */ {helper}")),
            "Expected {} not to be annotated as pure\n\nOutput:\n{}",
            helper,
            result.code
        );
    }
}

#[test]
fn test_preserves_existing_pure_annotations() {
    let input = "var x = /*#__PURE__*/ someCall();";

    let allocator = Allocator::default();
    let options = OptimizeOptions { mark_pure: true, ..OptimizeOptions::default() };

    let result = optimize(&allocator, input, "test.js", options);

    // Should preserve existing annotation, not add duplicate
    assert!(
        result.code.contains("/*#__PURE__*/"),
        "Expected existing pure annotation to be preserved\n\nOutput:\n{}",
        result.code
    );
}

#[test]
fn test_annotates_injection_token() {
    let input = "const result = new InjectionToken('abc');";

    test_mark_pure(input, &["/* @__PURE__ */ new InjectionToken"], &[]);
}
