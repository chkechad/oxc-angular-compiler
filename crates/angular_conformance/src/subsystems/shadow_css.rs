//! Runner for Angular Shadow CSS conformance tests.
//!
//! Tests the `shim_css_text()` function which implements Angular's
//! ViewEncapsulation.Emulated behavior for CSS scoping.

use oxc_angular_compiler::shim_css_text;

use super::SubsystemRunner;
use crate::test_case::{TestAssertion, TestResult};

/// Runner for Angular Shadow CSS conformance tests.
/// Tests the `shim()` function which scopes CSS selectors with content/host attributes.
pub struct ShadowCssRunner;

impl ShadowCssRunner {
    /// Creates a new Shadow CSS runner.
    pub fn new() -> Self {
        Self
    }

    /// Normalize CSS for comparison (matches Angular's toEqualCss behavior).
    /// - Trims leading/trailing whitespace
    /// - Collapses multiple whitespace to single space
    /// - Removes space after colons (`: ` → `:`)
    /// - Removes space before/after braces (` }` → `}`, ` {` → `{`)
    fn normalize_css(css: &str) -> String {
        css.split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
            .replace(": ", ":")
            .replace(" }", "}")
            .replace(" {", "{")
    }
}

impl Default for ShadowCssRunner {
    fn default() -> Self {
        Self::new()
    }
}

impl SubsystemRunner for ShadowCssRunner {
    fn name(&self) -> &'static str {
        "shadow_css"
    }

    fn description(&self) -> &'static str {
        "Angular Shadow CSS (shim_css_text for ViewEncapsulation.Emulated)"
    }

    fn can_handle(&self, assertion: &TestAssertion) -> bool {
        matches!(assertion, TestAssertion::ShimCss { .. })
    }

    fn run_assertion(&self, assertion: &TestAssertion) -> TestResult {
        match assertion {
            TestAssertion::ShimCss { input, content_attr, host_attr, expected, normalized } => {
                let host_attr_str = host_attr.as_deref().unwrap_or("");
                let actual = shim_css_text(input, content_attr, host_attr_str);

                let (actual_cmp, expected_cmp) = if *normalized {
                    (Self::normalize_css(&actual), Self::normalize_css(expected))
                } else {
                    (actual.clone(), expected.clone())
                };

                if actual_cmp == expected_cmp {
                    TestResult::Passed
                } else {
                    TestResult::Failed {
                        expected: expected.clone(),
                        actual,
                        diff: Some(format!(
                            "Normalized comparison: expected='{expected_cmp}', actual='{actual_cmp}'"
                        )),
                    }
                }
            }
            _ => TestResult::Skipped { reason: "Not handled by shadow CSS runner".to_string() },
        }
    }
}
