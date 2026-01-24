mod ast_serializer;
mod ast_spans;
mod expression_lexer;
mod expression_parser;
mod expression_serializer;
mod html_lexer;
mod html_parser;
mod html_whitespace;
mod r3_transform;
mod shadow_css;
mod style_parser;
mod unparser;

pub use ast_serializer::AstSerializerRunner;
pub use ast_spans::AstSpansRunner;
pub use expression_lexer::ExpressionLexerRunner;
pub use expression_parser::ExpressionParserRunner;
pub use expression_serializer::ExpressionSerializerRunner;
pub use html_lexer::HtmlLexerRunner;
pub use html_parser::HtmlParserRunner;
pub use html_whitespace::HtmlWhitespaceRunner;
pub use r3_transform::R3TransformRunner;
pub use shadow_css::ShadowCssRunner;
pub use style_parser::StyleParserRunner;
pub use unparser::{
    binary_op_str, normalize_whitespace, unparse_expression, unparse_expression_r3,
};

use crate::test_case::{TestAssertion, TestCase, TestResult, TestSummary};

/// Trait for subsystem-specific test runners
pub trait SubsystemRunner: Send + Sync {
    /// Name of the subsystem (e.g., "expression_parser")
    fn name(&self) -> &'static str;

    /// Description of what this runner tests
    fn description(&self) -> &'static str;

    /// Check if this runner can handle a specific assertion type
    fn can_handle(&self, assertion: &TestAssertion) -> bool;

    /// Run a single test assertion and return the result
    fn run_assertion(&self, assertion: &TestAssertion) -> TestResult;

    /// Run all assertions in a test case
    fn run_test(&self, test_case: &TestCase) -> Vec<(TestAssertion, TestResult)> {
        test_case
            .assertions
            .iter()
            .filter(|a| self.can_handle(a))
            .map(|a| (a.clone(), self.run_assertion(a)))
            .collect()
    }

    /// Run all test cases and return a summary
    fn run_all(&self, test_cases: &[TestCase]) -> TestSummary {
        let mut summary = TestSummary::default();

        for test_case in test_cases {
            for (assertion, result) in self.run_test(test_case) {
                let assertion_name = format!("{}: {:?}", test_case.name, assertion);
                summary.add_result(&assertion_name, &test_case.path, result);
            }
        }

        summary
    }
}

/// Collection of all subsystem runners
pub struct SubsystemRunners {
    pub runners: Vec<Box<dyn SubsystemRunner>>,
}

impl Default for SubsystemRunners {
    fn default() -> Self {
        Self::new()
    }
}

impl SubsystemRunners {
    pub fn new() -> Self {
        Self {
            runners: vec![
                Box::new(AstSerializerRunner::new()),
                Box::new(AstSpansRunner::new()),
                Box::new(ExpressionLexerRunner::new()),
                Box::new(ExpressionParserRunner::new()),
                Box::new(ExpressionSerializerRunner::new()),
                Box::new(HtmlLexerRunner::new()),
                Box::new(HtmlParserRunner::new()),
                Box::new(HtmlWhitespaceRunner::new()),
                Box::new(R3TransformRunner::new()),
                Box::new(ShadowCssRunner::new()),
                Box::new(StyleParserRunner::new()),
            ],
        }
    }

    /// Get a runner by name
    pub fn get(&self, name: &str) -> Option<&dyn SubsystemRunner> {
        self.runners.iter().find(|r| r.name() == name).map(std::convert::AsRef::as_ref)
    }

    /// Get all runner names
    pub fn names(&self) -> Vec<&'static str> {
        self.runners.iter().map(|r| r.name()).collect()
    }
}
