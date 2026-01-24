//! R3 Transform conformance testing.
//!
//! This module tests the Angular HTML to R3 AST transformation, which converts
//! parsed HTML templates into the R3 intermediate representation used for
//! code generation.

mod humanizer;
mod util;

use oxc_allocator::Allocator;
use oxc_angular_compiler::parser::html::HtmlParser;
use oxc_angular_compiler::transform::html_to_r3::{HtmlToR3Transform, TransformOptions};

use humanizer::{HumanizeMode, R3Humanizer};
use util::{create_diff, format_rows, json_to_rows, unescape_sequences};

use super::SubsystemRunner;
use crate::test_case::{TestAssertion, TestResult};

/// Runner for Angular R3 template transform conformance tests
pub struct R3TransformRunner;

impl R3TransformRunner {
    pub fn new() -> Self {
        Self
    }

    /// Detect humanize mode from expected format
    fn detect_humanize_mode(expected: &[serde_json::Value]) -> HumanizeMode {
        // Check if this is a source spans test by looking at expected format
        // Source spans tests have Element/Template rows with 4 values where the 2nd contains '<'
        for row in expected {
            if let serde_json::Value::Array(arr) = row
                && arr.len() >= 2
                && let Some(serde_json::Value::String(node_type)) = arr.first()
            {
                // Check Element, Template, or Component with 4+ values where 2nd starts with '<'
                if (node_type == "Element" || node_type == "Template" || node_type == "Component")
                    && arr.len() >= 4
                    && let Some(serde_json::Value::String(second)) = arr.get(1)
                    && second.starts_with('<')
                {
                    return HumanizeMode::SourceSpans;
                }
                // Check BoundText - source spans mode has no spaces in {{a}}
                // Template transform mode has spaces: {{ a }}
                if node_type == "BoundText"
                    && let Some(serde_json::Value::String(value)) = arr.get(1)
                    && value.contains("{{")
                    && !value.contains("{{ ")
                {
                    return HumanizeMode::SourceSpans;
                }
                // Check TextAttribute/Reference/Variable - source spans mode has 4 values
                if (node_type == "TextAttribute"
                    || node_type == "Reference"
                    || node_type == "Variable")
                    && arr.len() == 4
                {
                    // In source spans mode, the source span is the full attribute text
                    if let Some(serde_json::Value::String(source_span)) = arr.get(1) {
                        // If it contains '=' or starts with '#' or 'ref-' or 'let-', it's source spans
                        if source_span.contains('=')
                            || source_span.starts_with('#')
                            || source_span.starts_with("ref-")
                            || source_span.starts_with("let-")
                            || source_span.starts_with("data-ref-")
                            || source_span.starts_with("data-let-")
                        {
                            return HumanizeMode::SourceSpans;
                        }
                    }
                }
                // Check LetDeclaration - source spans mode has 4 values with @let in 2nd value
                if node_type == "LetDeclaration"
                    && arr.len() == 4
                    && let Some(serde_json::Value::String(source_span)) = arr.get(1)
                    && source_span.starts_with("@let ")
                {
                    return HumanizeMode::SourceSpans;
                }
                // Check control flow blocks - source spans mode has 3-4 values where 2nd value starts with '@'
                if (node_type == "SwitchBlock"
                    || node_type == "SwitchBlockCase"
                    || node_type == "ForLoopBlock"
                    || node_type == "ForLoopBlockEmpty"
                    || node_type == "IfBlock"
                    || node_type == "IfBlockBranch"
                    || node_type == "DeferredBlock"
                    || node_type == "DeferredBlockPlaceholder"
                    || node_type == "DeferredBlockLoading"
                    || node_type == "DeferredBlockError")
                    && arr.len() >= 3
                    && let Some(serde_json::Value::String(source_span)) = arr.get(1)
                    && source_span.starts_with('@')
                {
                    return HumanizeMode::SourceSpans;
                }
            }
        }
        HumanizeMode::TemplateTransform
    }

    /// Detect if selectorless mode is needed based on expected output
    fn needs_selectorless_mode(expected: &[serde_json::Value]) -> bool {
        for row in expected {
            if let serde_json::Value::Array(arr) = row
                && let Some(serde_json::Value::String(node_type)) = arr.first()
                && (node_type == "Component" || node_type == "Directive")
            {
                return true;
            }
        }
        false
    }

    /// Detect if expansion forms (ICU expressions) mode is needed based on expected output
    fn needs_expansion_forms(expected: &[serde_json::Value]) -> bool {
        for row in expected {
            if let serde_json::Value::Array(arr) = row
                && let Some(serde_json::Value::String(node_type)) = arr.first()
                && node_type.starts_with("Icu")
            {
                return true;
            }
        }
        false
    }

    /// Parse HTML, transform to R3, and return humanized output
    fn parse_transform_and_humanize_with_options(
        &self,
        text: &str,
        ignore_error: bool,
        mode: HumanizeMode,
        selectorless: bool,
        expansion_forms: bool,
    ) -> (Vec<Vec<String>>, Vec<String>) {
        let allocator = Allocator::default();

        // Parse HTML with appropriate options
        let parser = if selectorless {
            HtmlParser::with_selectorless(&allocator, text, "test.html")
        } else if expansion_forms {
            HtmlParser::with_expansion_forms(&allocator, text, "test.html")
        } else {
            HtmlParser::new(&allocator, text, "test.html")
        };
        let html_result = parser.parse();

        // Collect HTML parse errors
        let html_errors: Vec<String> = html_result.errors.iter().map(|e| e.msg.clone()).collect();

        // If there are errors and we're not ignoring them, return early
        if !html_errors.is_empty() && !ignore_error {
            return (vec![], html_errors);
        }

        // Transform to R3
        let options = TransformOptions::default();
        let transformer = HtmlToR3Transform::new(&allocator, text, options);
        let r3_result = transformer.transform(&html_result.nodes);

        let humanized = R3Humanizer::humanize_nodes(&r3_result.nodes, text, mode);
        let transform_errors: Vec<String> =
            r3_result.errors.iter().map(|e| e.msg.clone()).collect();

        // Combine all errors
        let mut all_errors = html_errors;
        all_errors.extend(transform_errors);

        (humanized, all_errors)
    }
}

impl Default for R3TransformRunner {
    fn default() -> Self {
        Self::new()
    }
}

impl SubsystemRunner for R3TransformRunner {
    fn name(&self) -> &'static str {
        "r3_transform"
    }

    fn description(&self) -> &'static str {
        "Angular HTML to R3 AST transformation"
    }

    fn can_handle(&self, assertion: &TestAssertion) -> bool {
        matches!(assertion, TestAssertion::ExpectFromHtml { .. })
    }

    fn run_assertion(&self, assertion: &TestAssertion) -> TestResult {
        match assertion {
            TestAssertion::ExpectFromHtml { input, expected, ignore_error } => {
                // Detect humanize mode from expected format
                let mode = Self::detect_humanize_mode(expected);
                // Detect if selectorless mode is needed for component/directive tests
                let selectorless = Self::needs_selectorless_mode(expected);
                // Detect if expansion forms (ICU) are needed
                let expansion_forms = Self::needs_expansion_forms(expected);

                // Convert escaped sequences (like \t and \n) to actual characters
                // This handles the case where JSON files have \\t which becomes \t in the string
                let processed_input = unescape_sequences(input);

                let (result, errors) = self.parse_transform_and_humanize_with_options(
                    &processed_input,
                    *ignore_error,
                    mode,
                    selectorless,
                    expansion_forms,
                );

                // If we have no expected values, just check that transformation succeeds
                if expected.is_empty() {
                    if errors.is_empty() || *ignore_error {
                        TestResult::Passed
                    } else {
                        TestResult::Error { message: format!("Transform errors: {errors:?}") }
                    }
                } else {
                    // Convert expected JSON to comparable format
                    let expected_rows = json_to_rows(expected);

                    // Compare the results
                    if result == expected_rows {
                        TestResult::Passed
                    } else {
                        TestResult::Failed {
                            expected: format_rows(&expected_rows),
                            actual: format_rows(&result),
                            diff: Some(create_diff(
                                &format_rows(&expected_rows),
                                &format_rows(&result),
                            )),
                        }
                    }
                }
            }

            _ => TestResult::Skipped { reason: "Not handled by R3 transform runner".to_string() },
        }
    }
}
