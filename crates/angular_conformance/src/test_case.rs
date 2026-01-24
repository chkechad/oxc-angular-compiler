//! Domain models for conformance test cases.
//!
//! This module defines the data structures used to represent Angular conformance tests:
//!
//! - [`TestSuite`] - A complete test suite from a single spec file
//! - [`TestGroup`] - A nested group of tests (corresponds to `describe()` blocks)
//! - [`TestCase`] - An individual test (corresponds to `it()` blocks)
//! - [`TestAssertion`] - The different types of assertions extracted from Angular tests
//! - [`TestResult`] - The outcome of running a single test assertion
//!
//! ## Serialization
//!
//! All test structures are serializable to JSON for the fixture format used between
//! fixture generation and test execution phases.

use serde::{Deserialize, Serialize};

/// A complete test suite extracted from an Angular spec file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestSuite {
    /// Name of the test suite (e.g., "expression_parser")
    pub name: String,
    /// Source file path (e.g., "expression_parser/parser_spec.ts")
    pub file_path: String,
    /// Top-level test groups (describe blocks)
    pub test_groups: Vec<TestGroup>,
}

/// A group of tests (corresponds to describe() blocks)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TestGroup {
    /// Group name from describe() block
    pub name: String,
    /// Nested describe blocks
    pub groups: Vec<TestGroup>,
    /// Individual test cases (it blocks)
    pub tests: Vec<TestCase>,
}

/// An individual test case (corresponds to it() blocks)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCase {
    /// Test name from it() block
    pub name: String,
    /// Full path for filtering (e.g., "parser/parseAction/literals")
    pub path: String,
    /// Test assertions to verify
    pub assertions: Vec<TestAssertion>,
}

/// Different types of test assertions extracted from Angular tests.
///
/// Each variant corresponds to a specific testing pattern used in Angular's compiler test suite.
/// The assertions are serialized to JSON fixtures and later executed by subsystem runners.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TestAssertion {
    /// Tests action expression parsing (event handlers, template statements).
    ///
    /// Angular pattern: `checkAction('input')` or `checkAction('input', 'expected')`
    ///
    /// Example: `checkAction('foo()')` tests parsing of an action expression.
    CheckAction { input: String, expected: Option<String> },

    /// Tests binding expression parsing (property bindings, interpolations).
    ///
    /// Angular pattern: `checkBinding('input', 'expected')`
    ///
    /// Example: `checkBinding('a + b', 'a + b')` tests parsing of a binding expression.
    CheckBinding { input: String, expected: Option<String> },

    /// Verifies an action expression produces a specific error.
    ///
    /// Angular pattern: `expectActionError('input', 'errorMessage')`
    ///
    /// Example: `expectActionError('a = b', 'Bindings cannot contain assignments')`
    ExpectActionError { input: String, error_contains: String },

    /// Verifies a binding expression produces a specific error.
    ///
    /// Angular pattern: `expectBindingError('input', 'errorMessage')`
    ExpectBindingError { input: String, error_contains: String },

    /// Tests action parsing produces both output and an error.
    ///
    /// Angular pattern: `checkActionWithError('input', 'expected', 'error')`
    CheckActionWithError { input: String, expected: String, error_contains: String },

    /// Verifies action parsing produces no errors (error array is empty).
    ///
    /// Angular pattern: `expect(parseAction(...).errors).toEqual([])`
    ExpectNoActionError { input: String },

    /// Verifies binding parsing produces no errors (error array is empty).
    ///
    /// Angular pattern: `expect(parseBinding(...).errors).toEqual([])`
    ExpectNoBindingError { input: String },

    /// Tests HTML parser DOM output structure.
    ///
    /// Angular pattern: `expect(humanizeDom(parser.parse(input))).toEqual([...])`
    ///
    /// The expected array contains nested arrays representing the DOM tree structure.
    HumanizeDom { input: String, expected: Vec<serde_json::Value> },

    /// Tests HTML parser DOM output with source span information.
    ///
    /// Angular pattern: `expect(humanizeDomSourceSpans(parser.parse(input, url, options))).toEqual([...])`
    HumanizeDomSourceSpans {
        input: String,
        expected: Vec<serde_json::Value>,
        #[serde(default)]
        options: Option<HtmlParserOptions>,
    },

    /// Tests R3 template transformation from HTML to IR nodes.
    ///
    /// Angular pattern: `expectFromHtml('<template>').toEqual([...])`
    ///
    /// This is the main test for Ivy template compilation, verifying that HTML
    /// templates are correctly transformed into the intermediate representation.
    ExpectFromHtml {
        input: String,
        expected: Vec<serde_json::Value>,
        /// If true, ignore HTML parse errors (for incomplete/malformed templates)
        #[serde(default)]
        ignore_error: bool,
    },

    /// Tests the expression lexer tokenization.
    ///
    /// Angular pattern: `lex('input')` followed by `expectXxxToken(tokens[n], start, end, value)`
    ///
    /// Verifies that expressions are correctly tokenized into the expected tokens.
    ExpressionLexerTest {
        input: String,
        expected_token_count: Option<usize>,
        token_assertions: Vec<ExpressionTokenAssertion>,
    },

    /// Tests HTML lexer tokenization with various humanizer formats.
    ///
    /// Angular patterns:
    /// - `tokenizeAndHumanizeParts(input)` - token types and values
    /// - `tokenizeAndHumanizeLineColumn(input)` - position information
    /// - `tokenizeAndHumanizeSourceSpans(input)` - source spans
    /// - `tokenizeAndHumanizeErrors(input)` - error tokens
    HtmlLexerTest {
        input: String,
        test_type: HtmlLexerTestType,
        expected: Vec<serde_json::Value>,
        #[serde(default)]
        options: Option<HtmlLexerOptions>,
    },

    /// Generic equality assertion (fallback for unspecified patterns).
    ExpectEqual { actual_expr: String, expected: serde_json::Value },

    /// Tests expression serialization (AST to string conversion).
    ///
    /// Angular pattern: `expect(serialize(parse('input'))).toBe('expected')`
    SerializeExpression { input: String, expected: String },

    /// Tests source span extraction from parsed template expressions.
    ///
    /// Angular pattern: `expect(humanizeExpressionSource(parse(input).nodes)).toEqual([...])`
    ///
    /// Verifies that expression source spans are correctly tracked through parsing.
    HumanizeExpressionSource {
        input: String,
        expected: Vec<serde_json::Value>,
        #[serde(default)]
        options: Option<ParseOptions>,
        /// If true, extract spans from sub-expressions within interpolations
        #[serde(default)]
        extract_sub_expressions: bool,
        /// If true, include implicit receiver spans in output
        #[serde(default)]
        find_implicit_receiver: bool,
        /// If true, only extract from template attributes (structural directives)
        #[serde(default)]
        template_expressions_only: bool,
        /// If true, use unparser output format instead of raw source
        #[serde(default)]
        use_unparser: bool,
        /// If true, include interpolation delimiters `{{ }}` in output
        #[serde(default)]
        unparse_full_interpolation: bool,
    },

    /// Tests HTML whitespace removal/normalization.
    ///
    /// Angular pattern: `expect(parseAndRemoveWS(input)).toEqual([...])`
    ParseAndRemoveWhitespace {
        input: String,
        expected: Vec<serde_json::Value>,
        #[serde(default)]
        options: Option<HtmlLexerOptions>,
    },

    /// Tests inline style parsing into key-value pairs.
    ///
    /// Angular pattern: `expect(parseStyle(input)).toEqual([key, value, ...])`
    ///
    /// Example: `parseStyle('color: red; font-size: 12px')` → `['color', 'red', 'font-size', '12px']`
    ParseStyle { input: String, expected: Vec<String> },

    /// Tests camelCase to kebab-case conversion.
    ///
    /// Angular pattern: `expect(hyphenate(input)).toEqual(expected)`
    ///
    /// Example: `hyphenate('backgroundColor')` → `'background-color'`
    Hyphenate { input: String, expected: String },

    /// Tests AST node serialization to string representation.
    ///
    /// Angular pattern: `expect(serializeNodes(parse(input).rootNodes)).toEqual([...])`
    SerializeNodes { input: String, expected: Vec<String> },

    /// Tests Shadow DOM CSS scoping/shimming.
    ///
    /// Angular pattern: `expect(shim(css, contentAttr, hostAttr?)).toEqualCss(expected)`
    ///
    /// Verifies that CSS selectors are correctly scoped for component encapsulation.
    ShimCss {
        input: String,
        content_attr: String,
        #[serde(default)]
        host_attr: Option<String>,
        expected: String,
        /// true for toEqualCss (whitespace-normalized comparison)
        #[serde(default)]
        normalized: bool,
    },

    /// Placeholder for unrecognized assertion patterns (for debugging extraction).
    Unknown { description: String },
}

/// Expression token assertion from expectXxxToken() calls
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpressionTokenAssertion {
    pub assertion_type: ExpressionTokenAssertionType,
    pub token_index: usize,
    pub start: u32,
    pub end: u32,
    pub value: Option<serde_json::Value>,
}

/// Types of expression token assertions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExpressionTokenAssertionType {
    Identifier,
    Keyword,
    Number,
    String,
    Character,
    Operator,
    Error,
    PrivateIdentifier,
    RegExpBody,
    RegExpFlags,
}

/// Types of HTML lexer test assertions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HtmlLexerTestType {
    HumanizeParts,
    HumanizeLineColumn,
    HumanizeSourceSpans,
    HumanizeFullStart,
    HumanizeErrors,
}

/// Options for HTML lexer tests
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HtmlLexerOptions {
    #[serde(default)]
    pub tokenize_expansion_forms: bool,
    #[serde(default)]
    pub interpolation_config: Option<(String, String)>,
    /// Whether to process escape sequences in the input (for inline template strings)
    #[serde(default)]
    pub escaped_string: bool,
    /// Whether to tokenize blocks (`@if`, `@for`, `}`, etc). Defaults to true if not specified.
    #[serde(default)]
    pub tokenize_blocks: Option<bool>,
    /// Characters to consider as leading trivia (whitespace that doesn't affect source maps).
    #[serde(default)]
    pub leading_trivia_chars: Option<Vec<String>>,
    /// Range of input to process: (startPos, startLine, startCol, endPos)
    #[serde(default)]
    pub range: Option<LexerRange>,
}

/// Range configuration for the lexer.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LexerRange {
    /// Start byte offset in the input.
    pub start_pos: u32,
    /// Starting line number (0-based).
    pub start_line: u32,
    /// Starting column number (0-based).
    pub start_col: u32,
    /// End byte offset in the input.
    pub end_pos: u32,
}

/// Parse options for template parsing tests
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ParseOptions {
    /// Whether to preserve whitespace in templates
    #[serde(default)]
    pub preserve_whitespaces: bool,
}

/// Options for HTML parser tests
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HtmlParserOptions {
    /// Characters to consider as leading trivia (whitespace that doesn't affect source maps).
    #[serde(default)]
    pub leading_trivia_chars: Option<Vec<String>>,
}

/// Result of running a single test
#[derive(Debug, Clone)]
pub enum TestResult {
    /// Test passed
    Passed,
    /// Test failed with mismatch
    Failed { expected: String, actual: String, diff: Option<String> },
    /// Test encountered an unexpected error
    Error { message: String },
    /// Test was skipped (e.g., not implemented)
    Skipped { reason: String },
}

impl TestResult {
    pub fn is_passed(&self) -> bool {
        matches!(self, Self::Passed)
    }

    pub fn is_failed(&self) -> bool {
        matches!(self, Self::Failed { .. })
    }

    pub fn is_error(&self) -> bool {
        matches!(self, Self::Error { .. })
    }

    pub fn is_skipped(&self) -> bool {
        matches!(self, Self::Skipped { .. })
    }
}

/// Summary of test results for a subsystem
#[derive(Debug, Clone, Default)]
pub struct TestSummary {
    pub passed: usize,
    pub failed: usize,
    pub errors: usize,
    pub skipped: usize,
    pub failed_tests: Vec<FailedTest>,
}

/// Information about a failed test
#[derive(Debug, Clone)]
pub struct FailedTest {
    pub name: String,
    pub path: String,
    pub result: TestResult,
}

impl TestSummary {
    pub fn total(&self) -> usize {
        self.passed + self.failed + self.errors + self.skipped
    }

    pub fn pass_rate(&self) -> f64 {
        if self.total() == 0 { 0.0 } else { (self.passed as f64 / self.total() as f64) * 100.0 }
    }

    pub fn add_result(&mut self, name: &str, path: &str, result: TestResult) {
        match &result {
            TestResult::Passed => self.passed += 1,
            TestResult::Failed { .. } => {
                self.failed += 1;
                self.failed_tests.push(FailedTest {
                    name: name.to_string(),
                    path: path.to_string(),
                    result,
                });
            }
            TestResult::Error { .. } => {
                self.errors += 1;
                self.failed_tests.push(FailedTest {
                    name: name.to_string(),
                    path: path.to_string(),
                    result,
                });
            }
            TestResult::Skipped { .. } => self.skipped += 1,
        }
    }
}
