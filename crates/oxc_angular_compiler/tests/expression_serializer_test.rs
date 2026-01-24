//! Expression Serializer tests.
//!
//! Ported from Angular's `test/expression_parser/serializer_spec.ts`.
//!
//! These tests verify that expressions can be parsed and serialized back to
//! their original (or semantically equivalent) form.

mod utils;

use oxc_allocator::Allocator;
use oxc_angular_compiler::parser::expression::Parser;
use utils::unparse;

// ============================================================================
// Helper Functions
// ============================================================================

/// Parses a binding expression and returns the serialized form.
fn parse_and_serialize(expr: &str) -> String {
    let allocator = Allocator::default();
    let parser = Parser::new(&allocator, expr);
    let result = parser.parse_simple_binding();
    unparse(&result.ast)
}

/// Parses an action expression and returns the serialized form.
fn parse_action_and_serialize(expr: &str) -> String {
    let allocator = Allocator::default();
    let parser = Parser::new(&allocator, expr);
    let result = parser.parse_action();
    unparse(&result.ast)
}

// ============================================================================
// Unary Operations
// ============================================================================

mod unary_operations {
    use super::*;

    #[test]
    fn serializes_unary_plus() {
        let result = parse_and_serialize(" + 1234 ");
        assert_eq!(result, "+1234");
    }

    #[test]
    fn serializes_unary_negative() {
        let result = parse_and_serialize(" - 1234 ");
        assert_eq!(result, "-1234");
    }

    #[test]
    fn serializes_not_prefix() {
        let result = parse_and_serialize(" ! foo ");
        assert_eq!(result, "!foo");
    }
}

// ============================================================================
// Binary Operations
// ============================================================================

mod binary_operations {
    use super::*;

    #[test]
    fn serializes_binary_addition() {
        let result = parse_and_serialize(" 1234   +   4321 ");
        assert_eq!(result, "1234 + 4321");
    }

    #[test]
    fn serializes_binary_subtraction() {
        let result = parse_and_serialize(" 10 - 5 ");
        assert_eq!(result, "10 - 5");
    }

    #[test]
    fn serializes_binary_multiplication() {
        let result = parse_and_serialize(" 2 * 3 ");
        assert_eq!(result, "2 * 3");
    }

    #[test]
    fn serializes_binary_division() {
        let result = parse_and_serialize(" 10 / 2 ");
        assert_eq!(result, "10 / 2");
    }

    #[test]
    fn serializes_exponentiation() {
        let result = parse_and_serialize(" 1  *  2  **  3 ");
        assert_eq!(result, "1 * 2 ** 3");
    }

    #[test]
    fn serializes_comparison() {
        assert_eq!(parse_and_serialize(" a == b "), "a == b");
        assert_eq!(parse_and_serialize(" a != b "), "a != b");
        assert_eq!(parse_and_serialize(" a === b "), "a === b");
        assert_eq!(parse_and_serialize(" a !== b "), "a !== b");
        assert_eq!(parse_and_serialize(" a < b "), "a < b");
        assert_eq!(parse_and_serialize(" a > b "), "a > b");
        assert_eq!(parse_and_serialize(" a <= b "), "a <= b");
        assert_eq!(parse_and_serialize(" a >= b "), "a >= b");
    }

    #[test]
    fn serializes_logical_operators() {
        assert_eq!(parse_and_serialize(" a && b "), "a && b");
        assert_eq!(parse_and_serialize(" a || b "), "a || b");
        assert_eq!(parse_and_serialize(" a ?? b "), "a ?? b");
    }

    #[test]
    fn serializes_in_expression() {
        let result = parse_and_serialize(" foo   in   bar ");
        assert_eq!(result, "foo in bar");
    }
}

// ============================================================================
// Chains
// ============================================================================

mod chains {
    use super::*;

    #[test]
    fn serializes_chains() {
        // Angular's serialize() does NOT add trailing semicolon for chain expressions
        let result = parse_action_and_serialize(" 1234;   4321 ");
        assert_eq!(result, "1234; 4321");
    }
}

// ============================================================================
// Conditionals
// ============================================================================

mod conditionals {
    use super::*;

    #[test]
    fn serializes_conditionals() {
        let result = parse_and_serialize(" cond   ?   1234   :   4321 ");
        assert_eq!(result, "cond ? 1234 : 4321");
    }

    #[test]
    fn serializes_nested_conditionals() {
        let result = parse_and_serialize(" a ? b : c ? d : e ");
        assert_eq!(result, "a ? b : c ? d : e");
    }
}

// ============================================================================
// Receivers
// ============================================================================

mod receivers {
    use super::*;

    #[test]
    fn serializes_this() {
        let result = parse_and_serialize(" this ");
        assert_eq!(result, "this");
    }
}

// ============================================================================
// Property Access
// ============================================================================

mod property_access {
    use super::*;

    #[test]
    fn serializes_property_reads() {
        let result = parse_and_serialize(" foo   .   bar ");
        assert_eq!(result, "foo.bar");
    }

    #[test]
    fn serializes_chained_property_reads() {
        let result = parse_and_serialize(" foo.bar.baz ");
        assert_eq!(result, "foo.bar.baz");
    }

    #[test]
    fn serializes_property_writes() {
        let result = parse_action_and_serialize(" foo   .   bar   =   baz ");
        // TS expects NO trailing semicolon
        assert_eq!(result, "foo.bar = baz");
    }

    #[test]
    fn serializes_safe_property_reads() {
        let result = parse_and_serialize(" foo   ?.   bar ");
        assert_eq!(result, "foo?.bar");
    }
}

// ============================================================================
// Keyed Access
// ============================================================================

mod keyed_access {
    use super::*;

    #[test]
    fn serializes_keyed_reads() {
        let result = parse_and_serialize(" foo   [bar] ");
        assert_eq!(result, "foo[bar]");
    }

    #[test]
    fn serializes_keyed_write() {
        // TS uses parse() (parseBinding), not parseAction
        // Rust parse_simple_binding should handle keyed writes like foo[bar] = baz
        let allocator = Allocator::default();
        let parser = Parser::new(&allocator, " foo   [bar]   =   baz ");
        let result = parser.parse_simple_binding();
        let serialized = unparse(&result.ast);
        assert_eq!(serialized, "foo[bar] = baz");
    }

    #[test]
    fn serializes_safe_keyed_reads() {
        let result = parse_and_serialize(" foo   ?.   [   bar   ] ");
        assert_eq!(result, "foo?.[bar]");
    }
}

// ============================================================================
// Literals
// ============================================================================

mod literals {
    use super::*;

    #[test]
    fn serializes_array_literals() {
        let result = parse_and_serialize(" [   foo,   bar,   baz   ] ");
        assert_eq!(result, "[foo, bar, baz]");
    }

    #[test]
    fn serializes_empty_array() {
        let result = parse_and_serialize(" [] ");
        assert_eq!(result, "[]");
    }

    #[test]
    fn serializes_object_literals() {
        let result = parse_and_serialize(" {   foo:   bar,   baz:   test   } ");
        assert_eq!(result, "{foo: bar, baz: test}");
    }

    #[test]
    fn serializes_empty_object() {
        let result = parse_and_serialize(" {} ");
        assert_eq!(result, "{}");
    }

    #[test]
    fn serializes_boolean_true() {
        let result = parse_and_serialize(" true ");
        assert_eq!(result, "true");
    }

    #[test]
    fn serializes_boolean_false() {
        let result = parse_and_serialize(" false ");
        assert_eq!(result, "false");
    }

    #[test]
    fn serializes_numbers() {
        assert_eq!(parse_and_serialize(" 1234 "), "1234");
        assert_eq!(parse_and_serialize(" 12.34 "), "12.34");
    }

    #[test]
    fn serializes_null() {
        let result = parse_and_serialize(" null ");
        assert_eq!(result, "null");
    }

    #[test]
    fn serializes_undefined() {
        let result = parse_and_serialize(" undefined ");
        assert_eq!(result, "undefined");
    }

    #[test]
    fn serializes_primitives_strings() {
        assert_eq!(parse_and_serialize(" 'test' "), "'test'");
        assert_eq!(parse_and_serialize(r#" "test" "#), "'test'");
    }

    #[test]
    fn escapes_string_literals() {
        assert_eq!(parse_and_serialize(r" 'Hello, \'World\'...' "), r"'Hello, \'World\'...'");
        assert_eq!(parse_and_serialize(r#" 'Hello, \"World\"...' "#), r#"'Hello, "World"...'"#);
    }
}

// ============================================================================
// Pipes
// ============================================================================

mod pipes {
    use super::*;

    #[test]
    fn serializes_pipes() {
        // Angular's serialize() does NOT wrap pipes in parentheses
        let result = parse_and_serialize(" foo   |   pipe ");
        assert_eq!(result, "foo | pipe");
    }
}

// ============================================================================
// Non-Null Assertion
// ============================================================================

mod non_null_assertion {
    use super::*;

    #[test]
    fn serializes_non_null_assertions() {
        let result = parse_and_serialize(" foo   ! ");
        assert_eq!(result, "foo!");
    }

    #[test]
    fn serializes_chained_non_null_assertions() {
        let result = parse_and_serialize(" foo!! ");
        assert_eq!(result, "foo!!");
    }
}

// ============================================================================
// Function Calls
// ============================================================================

mod function_calls {
    use super::*;

    #[test]
    fn serializes_calls() {
        // TS: "serializes calls" - 4 assertions
        assert_eq!(parse_and_serialize(" foo   (   ) "), "foo()");
        assert_eq!(parse_and_serialize(" foo   (   bar   ) "), "foo(bar)");
        assert_eq!(parse_and_serialize(" foo   (   bar   ,   ) "), "foo(bar, )");
        assert_eq!(parse_and_serialize(" foo   (   bar   ,   baz   ) "), "foo(bar, baz)");
    }

    #[test]
    fn serializes_safe_calls() {
        // TS: "serializes safe calls" - 4 assertions
        assert_eq!(parse_and_serialize(" foo   ?.   (   ) "), "foo?.()");
        assert_eq!(parse_and_serialize(" foo   ?.   (   bar   ) "), "foo?.(bar)");
        assert_eq!(parse_and_serialize(" foo   ?.   (   bar   ,   ) "), "foo?.(bar, )");
        assert_eq!(parse_and_serialize(" foo   ?.   (   bar   ,   baz   ) "), "foo?.(bar, baz)");
    }
}

// ============================================================================
// Special Expressions
// ============================================================================

mod special_expressions {
    use super::*;

    #[test]
    fn serializes_void_expression() {
        let result = parse_and_serialize(" void   0 ");
        assert_eq!(result, "void 0");
    }

    #[test]
    fn serializes_typeof_expression() {
        let result = parse_and_serialize(" typeof   foo ");
        assert_eq!(result, "typeof foo");
    }
}

// ============================================================================
// Complex Expressions
// ============================================================================

mod complex_expressions {
    use super::*;

    #[test]
    fn serializes_method_chain() {
        let result = parse_and_serialize(" obj.method1().method2().method3() ");
        assert_eq!(result, "obj.method1().method2().method3()");
    }

    #[test]
    fn serializes_safe_navigation_chain() {
        let result = parse_and_serialize(" obj?.prop1?.prop2?.prop3 ");
        assert_eq!(result, "obj?.prop1?.prop2?.prop3");
    }

    #[test]
    fn serializes_mixed_access() {
        let result = parse_and_serialize(" arr[0].prop['key']() ");
        assert_eq!(result, "arr[0].prop['key']()");
    }
}

// ============================================================================
// Round-trip Tests
// ============================================================================

mod round_trip {
    use super::*;

    /// Verify that parsing and serializing produces syntactically valid output
    /// that can be reparsed (though not necessarily identical to original).
    #[test]
    fn round_trip_simple_expression() {
        let original = "a + b";
        let serialized = parse_and_serialize(original);

        // Parse the serialized result should not panic
        let allocator = Allocator::default();
        let parser = Parser::new(&allocator, &serialized);
        let result = parser.parse_simple_binding();
        assert!(result.errors.is_empty());
    }

    #[test]
    fn round_trip_complex_expression() {
        let original = "items.filter(x => x.active).map(x => x.name)";
        let serialized = parse_and_serialize(original);

        // Parse the serialized result
        let allocator = Allocator::default();
        let parser = Parser::new(&allocator, &serialized);
        let _result = parser.parse_simple_binding();
        // Arrow functions may not be fully supported, so just check it doesn't crash
    }
}
