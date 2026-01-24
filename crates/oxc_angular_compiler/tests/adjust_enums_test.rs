//! Tests for adjust-typescript-enums transformation.
//! Ported from Angular CLI: packages/angular/build/src/tools/babel/plugins/adjust-typescript-enums_spec.ts

use oxc_allocator::Allocator;
use oxc_angular_compiler::optimizer::{OptimizeOptions, optimize};

fn test_adjust_enums(input: &str, expected_contains: &[&str], expected_not_contains: &[&str]) {
    let allocator = Allocator::default();
    let options = OptimizeOptions { adjust_enums: true, ..OptimizeOptions::default() };

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
    let options = OptimizeOptions { adjust_enums: true, ..OptimizeOptions::default() };

    let result = optimize(&allocator, input, "test.js", options);

    // The transformation should not significantly change the code
    // For "no change" cases, the IIFE pattern should remain
    assert!(
        !result.code.contains("/* @__PURE__ */ ("),
        "Expected no pure annotation to be added\n\nActual output:\n{}",
        result.code
    );
}

#[test]
fn test_wraps_unexported_typescript_enums() {
    let input = r#"
var ChangeDetectionStrategy;
(function (ChangeDetectionStrategy) {
    ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
    ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
})(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
"#;

    test_adjust_enums(
        input,
        &["var ChangeDetectionStrategy = /* @__PURE__ */ (", "return ChangeDetectionStrategy;"],
        &[],
    );
}

#[test]
fn test_wraps_exported_typescript_enums() {
    let input = r#"
export var ChangeDetectionStrategy;
(function (ChangeDetectionStrategy) {
    ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
    ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
})(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
"#;

    test_adjust_enums(
        input,
        &[
            "export var ChangeDetectionStrategy = /* @__PURE__ */ (",
            "return ChangeDetectionStrategy;",
        ],
        &[],
    );
}

#[test]
fn test_does_not_wrap_exported_enums_from_commonjs_old() {
    // Older CommonJS pattern (< TypeScript 5.1)
    let input = r#"
var ChangeDetectionStrategy;
(function (ChangeDetectionStrategy) {
    ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
    ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
})(ChangeDetectionStrategy = exports.ChangeDetectionStrategy || (exports.ChangeDetectionStrategy = {}));
"#;

    test_no_change(input);
}

#[test]
fn test_wraps_exported_enums_from_commonjs_new() {
    // Newer CommonJS pattern (TypeScript 5.1+)
    let input = r#"
var ChangeDetectionStrategy;
(function (ChangeDetectionStrategy) {
    ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
    ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
})(ChangeDetectionStrategy || (exports.ChangeDetectionStrategy = ChangeDetectionStrategy = {}));
"#;

    test_adjust_enums(
        input,
        &["var ChangeDetectionStrategy = /* @__PURE__ */ (", "return ChangeDetectionStrategy;"],
        &[],
    );
}

#[test]
fn test_wraps_enums_with_custom_numbering() {
    let input = r#"
export var ChangeDetectionStrategy;
(function (ChangeDetectionStrategy) {
    ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 5] = "OnPush";
    ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 8] = "Default";
})(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
"#;

    test_adjust_enums(
        input,
        &[
            "export var ChangeDetectionStrategy = /* @__PURE__ */ (",
            "return ChangeDetectionStrategy;",
        ],
        &[],
    );
}

#[test]
fn test_wraps_string_based_enums() {
    let input = r#"
var NotificationKind;
(function (NotificationKind) {
    NotificationKind["NEXT"] = "N";
    NotificationKind["ERROR"] = "E";
    NotificationKind["COMPLETE"] = "C";
})(NotificationKind || (NotificationKind = {}));
"#;

    test_adjust_enums(
        input,
        &["var NotificationKind = /* @__PURE__ */ (", "return NotificationKind;"],
        &[],
    );
}

#[test]
fn test_wraps_enums_renamed_due_to_scope_hoisting() {
    let input = r#"
var NotificationKind$1;
(function (NotificationKind) {
    NotificationKind["NEXT"] = "N";
    NotificationKind["ERROR"] = "E";
    NotificationKind["COMPLETE"] = "C";
})(NotificationKind$1 || (NotificationKind$1 = {}));
"#;

    test_adjust_enums(
        input,
        &["var NotificationKind$1 = /* @__PURE__ */ (", "return NotificationKind;"],
        &[],
    );
}

#[test]
fn test_maintains_multi_line_comments() {
    let input = r#"
/**
 * Supported http methods.
 * @deprecated use @angular/common/http instead
 */
var RequestMethod;
(function (RequestMethod) {
    RequestMethod[RequestMethod["Get"] = 0] = "Get";
    RequestMethod[RequestMethod["Post"] = 1] = "Post";
    RequestMethod[RequestMethod["Put"] = 2] = "Put";
    RequestMethod[RequestMethod["Delete"] = 3] = "Delete";
    RequestMethod[RequestMethod["Options"] = 4] = "Options";
    RequestMethod[RequestMethod["Head"] = 5] = "Head";
    RequestMethod[RequestMethod["Patch"] = 6] = "Patch";
})(RequestMethod || (RequestMethod = {}));
"#;

    test_adjust_enums(
        input,
        &["/**", "@deprecated", "var RequestMethod = /* @__PURE__ */ (", "return RequestMethod;"],
        &[],
    );
}

#[test]
fn test_does_not_wrap_enums_with_side_effect_values() {
    let input = r#"
export var ChangeDetectionStrategy;
(function (ChangeDetectionStrategy) {
    ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = console.log('foo');
    ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
})(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
"#;

    test_no_change(input);
}

#[test]
fn test_does_not_wrap_object_literals_similar_to_enums() {
    let input = r"
const RendererStyleFlags3 = {
    Important: 1,
    DashCase: 2,
};
if (typeof RendererStyleFlags3 === 'object') {
  RendererStyleFlags3[RendererStyleFlags3.Important] = 'DashCase';
}
RendererStyleFlags3[RendererStyleFlags3.Important] = 'Important';
";

    test_no_change(input);
}

#[test]
fn test_wraps_basic_typescript_enums() {
    let input = r#"
var ChangeDetectionStrategy;
(function (ChangeDetectionStrategy) {
    ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
    ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
})(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
"#;

    test_adjust_enums(
        input,
        &["var ChangeDetectionStrategy = /* @__PURE__ */ (", "return ChangeDetectionStrategy;"],
        &[],
    );
}

#[test]
fn test_wraps_enums_with_renamed_declaration_identifier() {
    let input = r#"
var ChangeDetectionStrategy$1;
(function (ChangeDetectionStrategy) {
    ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
    ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
})(ChangeDetectionStrategy$1 || (ChangeDetectionStrategy$1 = {}));
"#;

    test_adjust_enums(
        input,
        &["var ChangeDetectionStrategy$1 = /* @__PURE__ */ (", "return ChangeDetectionStrategy;"],
        &[],
    );
}

#[test]
fn test_handles_mixed_numeric_and_string_enums() {
    let input = r#"
var MixedEnum;
(function (MixedEnum) {
    MixedEnum[MixedEnum["NumericValue"] = 0] = "NumericValue";
    MixedEnum["StringValue"] = "hello";
})(MixedEnum || (MixedEnum = {}));
"#;

    test_adjust_enums(input, &["var MixedEnum = /* @__PURE__ */ (", "return MixedEnum;"], &[]);
}

#[test]
fn test_handles_single_member_enum() {
    let input = r#"
var SingleEnum;
(function (SingleEnum) {
    SingleEnum[SingleEnum["Only"] = 0] = "Only";
})(SingleEnum || (SingleEnum = {}));
"#;

    test_adjust_enums(input, &["var SingleEnum = /* @__PURE__ */ (", "return SingleEnum;"], &[]);
}

#[test]
fn test_handles_empty_enum() {
    let input = r"
var EmptyEnum;
(function (EmptyEnum) {
})(EmptyEnum || (EmptyEnum = {}));
";

    test_adjust_enums(input, &["var EmptyEnum = /* @__PURE__ */ (", "return EmptyEnum;"], &[]);
}

#[test]
fn test_handles_multiple_enums() {
    let input = r#"
var EnumA;
(function (EnumA) {
    EnumA[EnumA["A"] = 0] = "A";
})(EnumA || (EnumA = {}));
var EnumB;
(function (EnumB) {
    EnumB[EnumB["B"] = 0] = "B";
})(EnumB || (EnumB = {}));
"#;

    test_adjust_enums(
        input,
        &[
            "var EnumA = /* @__PURE__ */ (",
            "var EnumB = /* @__PURE__ */ (",
            "return EnumA;",
            "return EnumB;",
        ],
        &[],
    );
}
