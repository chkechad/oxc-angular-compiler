use oxc_allocator::Allocator;
use oxc_angular_compiler::parser::expression::{Lexer, Token, TokenType};

use super::SubsystemRunner;
use crate::test_case::{ExpressionTokenAssertionType, TestAssertion, TestResult};

/// Runner for Angular expression lexer conformance tests
pub struct ExpressionLexerRunner;

impl ExpressionLexerRunner {
    pub fn new() -> Self {
        Self
    }

    /// Tokenize input and return tokens
    fn tokenize<'a>(&self, allocator: &'a Allocator, input: &'a str) -> Vec<Token<'a>> {
        let lexer = Lexer::new(allocator, input);
        lexer.tokenize()
    }

    /// Get string representation of token type for error messages
    fn token_type_name(token_type: TokenType) -> &'static str {
        match token_type {
            TokenType::Character => "Character",
            TokenType::Identifier => "Identifier",
            TokenType::PrivateIdentifier => "PrivateIdentifier",
            TokenType::Keyword => "Keyword",
            TokenType::String => "String",
            TokenType::Number => "Number",
            TokenType::RegExpBody => "RegExpBody",
            TokenType::RegExpFlags => "RegExpFlags",
            TokenType::NoSubstitutionTemplate => "NoSubstitutionTemplate",
            TokenType::TemplateHead => "TemplateHead",
            TokenType::TemplateMiddle => "TemplateMiddle",
            TokenType::TemplateTail => "TemplateTail",
            TokenType::Operator => "Operator",
            TokenType::Error => "Error",
        }
    }

    /// Check if actual token type matches expected assertion type
    /// Angular treats template literals as String tokens with subtypes,
    /// so we map our template types to String for conformance
    fn token_type_matches(
        actual: TokenType,
        expected_assertion: &ExpressionTokenAssertionType,
    ) -> bool {
        match expected_assertion {
            ExpressionTokenAssertionType::Identifier => actual == TokenType::Identifier,
            ExpressionTokenAssertionType::Keyword => actual == TokenType::Keyword,
            ExpressionTokenAssertionType::Number => actual == TokenType::Number,
            // Angular treats all template literal tokens as String tokens
            ExpressionTokenAssertionType::String => matches!(
                actual,
                TokenType::String
                    | TokenType::NoSubstitutionTemplate
                    | TokenType::TemplateHead
                    | TokenType::TemplateMiddle
                    | TokenType::TemplateTail
            ),
            ExpressionTokenAssertionType::Character => actual == TokenType::Character,
            ExpressionTokenAssertionType::Operator => actual == TokenType::Operator,
            ExpressionTokenAssertionType::Error => actual == TokenType::Error,
            ExpressionTokenAssertionType::PrivateIdentifier => {
                actual == TokenType::PrivateIdentifier
            }
            ExpressionTokenAssertionType::RegExpBody => actual == TokenType::RegExpBody,
            ExpressionTokenAssertionType::RegExpFlags => actual == TokenType::RegExpFlags,
        }
    }
}

impl Default for ExpressionLexerRunner {
    fn default() -> Self {
        Self::new()
    }
}

impl SubsystemRunner for ExpressionLexerRunner {
    fn name(&self) -> &'static str {
        "expression_lexer"
    }

    fn description(&self) -> &'static str {
        "Angular expression lexer (tokenize)"
    }

    fn can_handle(&self, assertion: &TestAssertion) -> bool {
        matches!(assertion, TestAssertion::ExpressionLexerTest { .. })
    }

    fn run_assertion(&self, assertion: &TestAssertion) -> TestResult {
        match assertion {
            TestAssertion::ExpressionLexerTest {
                input,
                expected_token_count,
                token_assertions,
            } => {
                let allocator = Allocator::default();
                let tokens = self.tokenize(&allocator, input);

                // Check token count if specified
                if let Some(expected_count) = expected_token_count
                    && tokens.len() != *expected_count
                {
                    return TestResult::Failed {
                        expected: format!("{expected_count} tokens"),
                        actual: format!("{} tokens", tokens.len()),
                        diff: None,
                    };
                }

                // Verify each token assertion
                for assertion in token_assertions {
                    let token_index = assertion.token_index;

                    // Check if token exists
                    if token_index >= tokens.len() {
                        return TestResult::Failed {
                            expected: format!("Token at index {token_index}"),
                            actual: format!("Only {} tokens", tokens.len()),
                            diff: None,
                        };
                    }

                    let token = &tokens[token_index];

                    // Check if token type matches (with template->String mapping)
                    if !Self::token_type_matches(token.token_type, &assertion.assertion_type) {
                        return TestResult::Failed {
                            expected: format!(
                                "Token type {:?} at index {}",
                                assertion.assertion_type, token_index
                            ),
                            actual: format!(
                                "Token type {}",
                                Self::token_type_name(token.token_type)
                            ),
                            diff: None,
                        };
                    }

                    // Check start position
                    if token.index != assertion.start {
                        return TestResult::Failed {
                            expected: format!("Start position {}", assertion.start),
                            actual: format!("Start position {}", token.index),
                            diff: None,
                        };
                    }

                    // Check end position
                    if token.end != assertion.end {
                        return TestResult::Failed {
                            expected: format!("End position {}", assertion.end),
                            actual: format!("End position {}", token.end),
                            diff: None,
                        };
                    }

                    // Check value if specified
                    if let Some(expected_value) = &assertion.value {
                        let values_match = match (token.token_type, expected_value) {
                            // For numbers, use approximate equality due to floating point precision
                            (TokenType::Number, serde_json::Value::Number(expected_num)) => {
                                if let Some(expected_f64) = expected_num.as_f64() {
                                    let diff = (token.num_value - expected_f64).abs();
                                    let tolerance = expected_f64.abs() * 1e-10;
                                    diff <= tolerance.max(1e-10)
                                } else {
                                    false
                                }
                            }
                            // For characters, compare char representation
                            (TokenType::Character, serde_json::Value::String(expected_str)) => {
                                let ch = char::from_u32(token.num_value as u32)
                                    .map(|c| c.to_string())
                                    .unwrap_or_default();
                                ch == *expected_str
                            }
                            // For strings, compare string values
                            (_, serde_json::Value::String(expected_str)) => {
                                token.str_value == expected_str.as_str()
                            }
                            _ => false,
                        };

                        if !values_match {
                            let actual_value: serde_json::Value = match token.token_type {
                                TokenType::Number => serde_json::Value::Number(
                                    serde_json::Number::from_f64(token.num_value)
                                        .unwrap_or_else(|| serde_json::Number::from(0)),
                                ),
                                TokenType::Character => {
                                    let ch = char::from_u32(token.num_value as u32)
                                        .map(|c| c.to_string())
                                        .unwrap_or_default();
                                    serde_json::Value::String(ch)
                                }
                                _ => serde_json::Value::String(token.str_value.to_string()),
                            };
                            return TestResult::Failed {
                                expected: format!("Value {expected_value:?}"),
                                actual: format!("Value {actual_value:?}"),
                                diff: None,
                            };
                        }
                    }
                }

                TestResult::Passed
            }
            _ => TestResult::Skipped { reason: "Not handled by expression lexer runner".into() },
        }
    }
}
