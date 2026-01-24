use std::fmt::Write;

use oxc_allocator::Allocator;
use oxc_angular_compiler::parser::expression::Parser;

use super::SubsystemRunner;
use super::unparser::unparse_expression;
use crate::test_case::{TestAssertion, TestResult};

/// Runner for Angular expression parser conformance tests
pub struct ExpressionParserRunner;

impl ExpressionParserRunner {
    pub fn new() -> Self {
        Self
    }

    /// Parse an action expression and return the unparsed result
    fn parse_action_and_unparse(&self, text: &str) -> (String, Vec<String>) {
        let allocator = Allocator::default();
        let parser = Parser::new(&allocator, text);
        let result = parser.parse_action();
        let unparsed = unparse_expression(&result.ast);
        let errors: Vec<String> = result.errors.iter().map(|e| e.msg.clone()).collect();
        (unparsed, errors)
    }

    /// Parse a simple binding and return the unparsed result
    fn parse_binding_and_unparse(&self, text: &str) -> (String, Vec<String>) {
        let allocator = Allocator::default();
        let parser = Parser::new(&allocator, text);
        let result = parser.parse_simple_binding();
        let unparsed = unparse_expression(&result.ast);
        let errors: Vec<String> = result.errors.iter().map(|e| e.msg.clone()).collect();
        (unparsed, errors)
    }
}

impl Default for ExpressionParserRunner {
    fn default() -> Self {
        Self::new()
    }
}

impl SubsystemRunner for ExpressionParserRunner {
    fn name(&self) -> &'static str {
        "expression_parser"
    }

    fn description(&self) -> &'static str {
        "Angular expression parser (parseAction, parseBinding)"
    }

    fn can_handle(&self, assertion: &TestAssertion) -> bool {
        matches!(
            assertion,
            TestAssertion::CheckAction { .. }
                | TestAssertion::CheckBinding { .. }
                | TestAssertion::ExpectActionError { .. }
                | TestAssertion::ExpectBindingError { .. }
                | TestAssertion::CheckActionWithError { .. }
                | TestAssertion::ExpectNoActionError { .. }
                | TestAssertion::ExpectNoBindingError { .. }
        )
    }

    fn run_assertion(&self, assertion: &TestAssertion) -> TestResult {
        match assertion {
            TestAssertion::CheckAction { input, expected } => {
                let (result, errors) = self.parse_action_and_unparse(input);

                if !errors.is_empty() {
                    return TestResult::Error {
                        message: format!("Unexpected parse errors: {errors:?}"),
                    };
                }

                // When expected is None, checkAction only verifies no errors (already checked above)
                // When expected is Some, also compare the output
                match expected {
                    Some(expected_str) => {
                        if result == *expected_str {
                            TestResult::Passed
                        } else {
                            TestResult::Failed {
                                expected: expected_str.clone(),
                                actual: result.clone(),
                                diff: Some(create_diff(expected_str, &result)),
                            }
                        }
                    }
                    None => TestResult::Passed, // Only error check, no output comparison
                }
            }

            TestAssertion::CheckBinding { input, expected } => {
                let (result, errors) = self.parse_binding_and_unparse(input);

                if !errors.is_empty() {
                    return TestResult::Error {
                        message: format!("Unexpected parse errors: {errors:?}"),
                    };
                }

                // When expected is None, checkBinding only verifies no errors (already checked above)
                // When expected is Some, also compare the output
                match expected {
                    Some(expected_str) => {
                        if result == *expected_str {
                            TestResult::Passed
                        } else {
                            TestResult::Failed {
                                expected: expected_str.clone(),
                                actual: result.clone(),
                                diff: Some(create_diff(expected_str, &result)),
                            }
                        }
                    }
                    None => TestResult::Passed, // Only error check, no output comparison
                }
            }

            TestAssertion::ExpectActionError { input, error_contains } => {
                let (_, errors) = self.parse_action_and_unparse(input);

                if errors.is_empty() {
                    return TestResult::Failed {
                        expected: format!("Error containing: {error_contains}"),
                        actual: "No errors".to_string(),
                        diff: None,
                    };
                }

                if errors.iter().any(|e| e.contains(error_contains)) {
                    TestResult::Passed
                } else {
                    TestResult::Failed {
                        expected: format!("Error containing: {error_contains}"),
                        actual: format!("Errors: {errors:?}"),
                        diff: None,
                    }
                }
            }

            TestAssertion::ExpectBindingError { input, error_contains } => {
                let (_, errors) = self.parse_binding_and_unparse(input);

                if errors.is_empty() {
                    return TestResult::Failed {
                        expected: format!("Error containing: {error_contains}"),
                        actual: "No errors".to_string(),
                        diff: None,
                    };
                }

                if errors.iter().any(|e| e.contains(error_contains)) {
                    TestResult::Passed
                } else {
                    TestResult::Failed {
                        expected: format!("Error containing: {error_contains}"),
                        actual: format!("Errors: {errors:?}"),
                        diff: None,
                    }
                }
            }

            TestAssertion::CheckActionWithError { input, expected, error_contains } => {
                let (result, errors) = self.parse_action_and_unparse(input);

                // Check AST matches
                if result != *expected {
                    return TestResult::Failed {
                        expected: expected.clone(),
                        actual: result.clone(),
                        diff: Some(create_diff(expected, &result)),
                    };
                }

                // Check error is present
                if errors.is_empty() {
                    return TestResult::Failed {
                        expected: format!("Error containing: {error_contains}"),
                        actual: "No errors".to_string(),
                        diff: None,
                    };
                }

                if errors.iter().any(|e| e.contains(error_contains)) {
                    TestResult::Passed
                } else {
                    TestResult::Failed {
                        expected: format!("Error containing: {error_contains}"),
                        actual: format!("Errors: {errors:?}"),
                        diff: None,
                    }
                }
            }

            TestAssertion::ExpectNoActionError { input } => {
                let (_, errors) = self.parse_action_and_unparse(input);

                if errors.is_empty() {
                    TestResult::Passed
                } else {
                    TestResult::Failed {
                        expected: "No errors".to_string(),
                        actual: format!("Errors: {errors:?}"),
                        diff: None,
                    }
                }
            }

            TestAssertion::ExpectNoBindingError { input } => {
                let (_, errors) = self.parse_binding_and_unparse(input);

                if errors.is_empty() {
                    TestResult::Passed
                } else {
                    TestResult::Failed {
                        expected: "No errors".to_string(),
                        actual: format!("Errors: {errors:?}"),
                        diff: None,
                    }
                }
            }

            _ => TestResult::Skipped {
                reason: "Not handled by expression parser runner".to_string(),
            },
        }
    }
}

/// Create a simple diff between two strings
fn create_diff(expected: &str, actual: &str) -> String {
    use similar::{ChangeTag, TextDiff};

    let diff = TextDiff::from_chars(expected, actual);
    let mut result = String::new();

    for change in diff.iter_all_changes() {
        let sign = match change.tag() {
            ChangeTag::Delete => "-",
            ChangeTag::Insert => "+",
            ChangeTag::Equal => " ",
        };
        let _ = write!(result, "{sign}{change}");
    }

    result
}
