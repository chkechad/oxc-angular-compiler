//! Simple expression checker.
//!
//! Validates that an expression doesn't contain pipes, which are
//! invalid in host binding contexts.
//!
//! Ported from Angular's `SimpleExpressionChecker` in `parser.ts`.

use crate::ast::expression::AngularExpression;

/// Checks expressions for forbidden constructs.
///
/// In certain contexts (like host bindings), pipes are not allowed.
/// This checker visits an expression tree and collects errors for
/// any forbidden constructs found.
pub struct SimpleExpressionChecker {
    /// Errors collected during checking.
    pub errors: Vec<String>,
}

impl SimpleExpressionChecker {
    /// Creates a new checker.
    pub fn new() -> Self {
        Self { errors: Vec::new() }
    }

    /// Checks an expression for forbidden constructs.
    ///
    /// Returns a list of error strings describing any forbidden
    /// constructs found. An empty list means the expression is valid
    /// for simple binding contexts.
    pub fn check(expr: &AngularExpression<'_>) -> Vec<String> {
        let mut checker = Self::new();
        checker.visit(expr);
        checker.errors
    }

    /// Visits an expression node.
    fn visit(&mut self, expr: &AngularExpression<'_>) {
        match expr {
            // Pipes are forbidden in simple expressions
            AngularExpression::BindingPipe(_) => {
                self.errors.push("pipes".to_string());
            }

            // Recursively check child expressions
            AngularExpression::Binary(binary) => {
                self.visit(&binary.left);
                self.visit(&binary.right);
            }
            AngularExpression::Unary(unary) => {
                self.visit(&unary.expr);
            }
            AngularExpression::PrefixNot(prefix) => {
                self.visit(&prefix.expression);
            }
            AngularExpression::TypeofExpression(typeof_expr) => {
                self.visit(&typeof_expr.expression);
            }
            AngularExpression::VoidExpression(void_expr) => {
                self.visit(&void_expr.expression);
            }
            AngularExpression::Conditional(cond) => {
                self.visit(&cond.condition);
                self.visit(&cond.true_exp);
                self.visit(&cond.false_exp);
            }
            AngularExpression::Chain(chain) => {
                for expr in chain.expressions.iter() {
                    self.visit(expr);
                }
            }
            AngularExpression::Call(call) => {
                self.visit(&call.receiver);
                for arg in call.args.iter() {
                    self.visit(arg);
                }
            }
            AngularExpression::SafeCall(call) => {
                self.visit(&call.receiver);
                for arg in call.args.iter() {
                    self.visit(arg);
                }
            }
            AngularExpression::PropertyRead(read) => {
                self.visit(&read.receiver);
            }
            AngularExpression::SafePropertyRead(read) => {
                self.visit(&read.receiver);
            }
            AngularExpression::KeyedRead(read) => {
                self.visit(&read.receiver);
                self.visit(&read.key);
            }
            AngularExpression::SafeKeyedRead(read) => {
                self.visit(&read.receiver);
                self.visit(&read.key);
            }
            AngularExpression::LiteralArray(arr) => {
                for expr in arr.expressions.iter() {
                    self.visit(expr);
                }
            }
            AngularExpression::LiteralMap(map) => {
                for expr in map.values.iter() {
                    self.visit(expr);
                }
            }
            AngularExpression::Interpolation(interp) => {
                for expr in interp.expressions.iter() {
                    self.visit(expr);
                }
            }
            AngularExpression::NonNullAssert(assert) => {
                self.visit(&assert.expression);
            }
            AngularExpression::ParenthesizedExpression(paren) => {
                self.visit(&paren.expression);
            }
            AngularExpression::TemplateLiteral(tpl) => {
                for expr in tpl.expressions.iter() {
                    self.visit(expr);
                }
            }
            AngularExpression::TaggedTemplateLiteral(tagged) => {
                self.visit(&tagged.tag);
                // Visit expressions within the template
                for expr in tagged.template.expressions.iter() {
                    self.visit(expr);
                }
            }

            AngularExpression::SpreadElement(spread) => {
                self.visit(&spread.expression);
            }

            AngularExpression::ArrowFunction(arrow) => {
                self.visit(&arrow.body);
            }

            // Leaf nodes - no children to check
            AngularExpression::Empty(_)
            | AngularExpression::ImplicitReceiver(_)
            | AngularExpression::ThisReceiver(_)
            | AngularExpression::LiteralPrimitive(_)
            | AngularExpression::RegularExpressionLiteral(_) => {}
        }
    }
}

impl Default for SimpleExpressionChecker {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::expression::Parser;
    use oxc_allocator::Allocator;

    #[test]
    fn test_simple_expression_allowed() {
        let allocator = Allocator::default();
        let parser = Parser::new(&allocator, "a + b");
        let result = parser.parse_simple_binding();
        let errors = SimpleExpressionChecker::check(&result.ast);
        assert!(errors.is_empty());
    }

    #[test]
    fn test_pipe_not_allowed() {
        let allocator = Allocator::default();
        let parser = Parser::new(&allocator, "value | uppercase");
        let result = parser.parse_simple_binding();
        let errors = SimpleExpressionChecker::check(&result.ast);
        assert!(!errors.is_empty());
        assert!(errors.contains(&"pipes".to_string()));
    }

    #[test]
    fn test_nested_pipe_not_allowed() {
        let allocator = Allocator::default();
        let parser = Parser::new(&allocator, "items | filter:condition");
        let result = parser.parse_simple_binding();
        let errors = SimpleExpressionChecker::check(&result.ast);
        assert!(!errors.is_empty());
    }

    #[test]
    fn test_property_access_allowed() {
        let allocator = Allocator::default();
        let parser = Parser::new(&allocator, "obj.prop.nested");
        let result = parser.parse_simple_binding();
        let errors = SimpleExpressionChecker::check(&result.ast);
        assert!(errors.is_empty());
    }

    #[test]
    fn test_method_call_allowed() {
        let allocator = Allocator::default();
        let parser = Parser::new(&allocator, "obj.method(arg1, arg2)");
        let result = parser.parse_simple_binding();
        let errors = SimpleExpressionChecker::check(&result.ast);
        assert!(errors.is_empty());
    }

    #[test]
    fn test_conditional_allowed() {
        let allocator = Allocator::default();
        let parser = Parser::new(&allocator, "cond ? a : b");
        let result = parser.parse_simple_binding();
        let errors = SimpleExpressionChecker::check(&result.ast);
        assert!(errors.is_empty());
    }

    #[test]
    fn test_array_literal_allowed() {
        let allocator = Allocator::default();
        let parser = Parser::new(&allocator, "[1, 2, 3]");
        let result = parser.parse_simple_binding();
        let errors = SimpleExpressionChecker::check(&result.ast);
        assert!(errors.is_empty());
    }

    #[test]
    fn test_object_literal_allowed() {
        let allocator = Allocator::default();
        let parser = Parser::new(&allocator, "{a: 1, b: 2}");
        let result = parser.parse_simple_binding();
        let errors = SimpleExpressionChecker::check(&result.ast);
        assert!(errors.is_empty());
    }
}
