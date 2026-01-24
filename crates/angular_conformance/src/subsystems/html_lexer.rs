use oxc_angular_compiler::parser::html::{HtmlLexer, HtmlToken, HtmlTokenType};

use super::SubsystemRunner;
use crate::test_case::{HtmlLexerTestType, TestAssertion, TestResult};

/// Runner for Angular HTML lexer conformance tests
pub struct HtmlLexerRunner;

impl HtmlLexerRunner {
    pub fn new() -> Self {
        Self
    }

    /// Convert our token type to Angular's string representation
    fn token_type_to_angular(token_type: HtmlTokenType) -> &'static str {
        match token_type {
            HtmlTokenType::TagOpenStart => "TAG_OPEN_START",
            HtmlTokenType::TagOpenEnd => "TAG_OPEN_END",
            HtmlTokenType::TagOpenEndVoid => "TAG_OPEN_END_VOID",
            HtmlTokenType::TagClose => "TAG_CLOSE",
            HtmlTokenType::IncompleteTagOpen => "INCOMPLETE_TAG_OPEN",
            HtmlTokenType::Text => "TEXT",
            HtmlTokenType::EscapableRawText => "ESCAPABLE_RAW_TEXT",
            HtmlTokenType::RawText => "RAW_TEXT",
            HtmlTokenType::Interpolation => "INTERPOLATION",
            HtmlTokenType::EncodedEntity => "ENCODED_ENTITY",
            HtmlTokenType::CommentStart => "COMMENT_START",
            HtmlTokenType::CommentEnd => "COMMENT_END",
            HtmlTokenType::CdataStart => "CDATA_START",
            HtmlTokenType::CdataEnd => "CDATA_END",
            HtmlTokenType::AttrName => "ATTR_NAME",
            HtmlTokenType::AttrQuote => "ATTR_QUOTE",
            HtmlTokenType::AttrValueText => "ATTR_VALUE_TEXT",
            HtmlTokenType::AttrValueInterpolation => "ATTR_VALUE_INTERPOLATION",
            HtmlTokenType::DocType => "DOC_TYPE",
            HtmlTokenType::ExpansionFormStart => "EXPANSION_FORM_START",
            HtmlTokenType::ExpansionCaseValue => "EXPANSION_CASE_VALUE",
            HtmlTokenType::ExpansionCaseExpStart => "EXPANSION_CASE_EXP_START",
            HtmlTokenType::ExpansionCaseExpEnd => "EXPANSION_CASE_EXP_END",
            HtmlTokenType::ExpansionFormEnd => "EXPANSION_FORM_END",
            HtmlTokenType::BlockOpenStart => "BLOCK_OPEN_START",
            HtmlTokenType::BlockOpenEnd => "BLOCK_OPEN_END",
            HtmlTokenType::BlockClose => "BLOCK_CLOSE",
            HtmlTokenType::BlockParameter => "BLOCK_PARAMETER",
            HtmlTokenType::IncompleteBlockOpen => "INCOMPLETE_BLOCK_OPEN",
            HtmlTokenType::LetStart => "LET_START",
            HtmlTokenType::LetValue => "LET_VALUE",
            HtmlTokenType::LetEnd => "LET_END",
            HtmlTokenType::IncompleteLet => "INCOMPLETE_LET",
            HtmlTokenType::ComponentOpenStart => "COMPONENT_OPEN_START",
            HtmlTokenType::ComponentOpenEnd => "COMPONENT_OPEN_END",
            HtmlTokenType::ComponentOpenEndVoid => "COMPONENT_OPEN_END_VOID",
            HtmlTokenType::ComponentClose => "COMPONENT_CLOSE",
            HtmlTokenType::IncompleteComponentOpen => "INCOMPLETE_COMPONENT_OPEN",
            HtmlTokenType::DirectiveName => "DIRECTIVE_NAME",
            HtmlTokenType::DirectiveOpen => "DIRECTIVE_OPEN",
            HtmlTokenType::DirectiveClose => "DIRECTIVE_CLOSE",
            HtmlTokenType::Eof => "EOF",
        }
    }

    /// Humanize tokens to parts format: [type, ...parts]
    fn humanize_parts(tokens: &[HtmlToken]) -> Vec<serde_json::Value> {
        tokens
            .iter()
            .map(|token| {
                let mut arr = vec![serde_json::Value::String(format!(
                    "TokenType.{}",
                    Self::token_type_to_angular(token.token_type)
                ))];
                for part in &token.parts {
                    arr.push(serde_json::Value::String(part.clone()));
                }
                serde_json::Value::Array(arr)
            })
            .collect()
    }

    /// Humanize tokens to line:column format
    fn humanize_line_column(tokens: &[HtmlToken], input: &str) -> Vec<serde_json::Value> {
        tokens
            .iter()
            .map(|token| {
                let (line, col) = Self::offset_to_line_col(input, token.start as usize);
                serde_json::Value::Array(vec![
                    serde_json::Value::String(format!(
                        "TokenType.{}",
                        Self::token_type_to_angular(token.token_type)
                    )),
                    serde_json::Value::String(format!("{line}:{col}")),
                ])
            })
            .collect()
    }

    /// Humanize tokens to source spans format: [type, "start:end"]
    fn humanize_source_spans(tokens: &[HtmlToken], input: &str) -> Vec<serde_json::Value> {
        tokens
            .iter()
            .map(|token| {
                let span = &input[token.start as usize..token.end as usize];
                serde_json::Value::Array(vec![
                    serde_json::Value::String(format!(
                        "TokenType.{}",
                        Self::token_type_to_angular(token.token_type)
                    )),
                    serde_json::Value::String(span.to_string()),
                ])
            })
            .collect()
    }

    /// Humanize tokens to full start format: [type, "start line:col", "fullStart line:col"]
    /// Uses the token's full_start field if available, otherwise uses start.
    fn humanize_full_start(tokens: &[HtmlToken], input: &str) -> Vec<serde_json::Value> {
        tokens
            .iter()
            .map(|token| {
                let (start_line, start_col) = Self::offset_to_line_col(input, token.start as usize);
                let start_pos = format!("{start_line}:{start_col}");

                // Use full_start if available, otherwise same as start
                let full_start_pos = if let Some(full_start) = token.full_start {
                    let (fs_line, fs_col) = Self::offset_to_line_col(input, full_start as usize);
                    format!("{fs_line}:{fs_col}")
                } else {
                    start_pos.clone()
                };

                serde_json::Value::Array(vec![
                    serde_json::Value::String(format!(
                        "TokenType.{}",
                        Self::token_type_to_angular(token.token_type)
                    )),
                    serde_json::Value::String(start_pos),
                    serde_json::Value::String(full_start_pos),
                ])
            })
            .collect()
    }

    /// Convert byte offset to line:column (0-based)
    /// Angular's lexer behavior:
    /// - Only \n increments line and resets column
    /// - \r is treated as a newline for "isNewLine" check (doesn't increment column)
    ///   but does NOT increment line
    fn offset_to_line_col(input: &str, offset: usize) -> (usize, usize) {
        let mut line = 0;
        let mut col = 0;
        let mut byte_pos = 0;

        for ch in input.chars() {
            if byte_pos >= offset {
                break;
            }
            if ch == '\n' {
                line += 1;
                col = 0;
            } else if ch == '\r' {
                // CR is a newline character in Angular (isNewLine returns true)
                // so it doesn't increment column, but it also doesn't increment line
                // (only LF increments line)
            } else {
                col += 1;
            }
            byte_pos += ch.len_utf8();
        }
        (line, col)
    }

    /// Compare two JSON values for equality
    /// STRICT: Requires exact length match - no prefix comparisons allowed
    fn values_equal(expected: &serde_json::Value, actual: &serde_json::Value) -> bool {
        match (expected, actual) {
            (serde_json::Value::Array(exp_arr), serde_json::Value::Array(act_arr)) => {
                // STRICT: Require exact same length - no prefix matching
                if exp_arr.len() != act_arr.len() {
                    return false;
                }
                exp_arr.iter().zip(act_arr.iter()).all(|(e, a)| Self::values_equal(e, a))
            }
            (serde_json::Value::String(exp_str), serde_json::Value::String(act_str)) => {
                // Handle TokenType.XXX comparison
                exp_str == act_str
            }
            _ => expected == actual,
        }
    }
}

impl Default for HtmlLexerRunner {
    fn default() -> Self {
        Self::new()
    }
}

impl SubsystemRunner for HtmlLexerRunner {
    fn name(&self) -> &'static str {
        "html_lexer"
    }

    fn description(&self) -> &'static str {
        "Angular HTML template lexer (tokenize)"
    }

    fn can_handle(&self, assertion: &TestAssertion) -> bool {
        matches!(assertion, TestAssertion::HtmlLexerTest { .. })
    }

    fn run_assertion(&self, assertion: &TestAssertion) -> TestResult {
        match assertion {
            TestAssertion::HtmlLexerTest { input, test_type, expected, options } => {
                // Configure lexer with options
                let mut lexer = HtmlLexer::new(input).with_selectorless(true); // Enable selectorless components

                if let Some(opts) = options {
                    if opts.tokenize_expansion_forms {
                        lexer = lexer.with_expansion_forms(true);
                    }
                    if opts.escaped_string {
                        lexer = lexer.with_escaped_string(true);
                    }
                    if let Some((start, end)) = &opts.interpolation_config {
                        lexer = lexer.with_interpolation(start, end);
                    }
                    if let Some(tokenize_blocks) = opts.tokenize_blocks {
                        lexer = lexer.with_blocks(tokenize_blocks);
                    }
                    if let Some(ref trivia_chars) = opts.leading_trivia_chars {
                        // Convert string chars to char vec
                        let chars: Vec<char> =
                            trivia_chars.iter().filter_map(|s| s.chars().next()).collect();
                        lexer = lexer.with_leading_trivia_chars(chars);
                    }
                    if let Some(ref range) = opts.range {
                        lexer = lexer.with_range(
                            range.start_pos,
                            range.end_pos,
                            range.start_line,
                            range.start_col,
                        );
                    }
                }

                // Tokenize input
                let result = lexer.tokenize();

                // For error tests, check errors
                if matches!(test_type, HtmlLexerTestType::HumanizeErrors) {
                    let actual: Vec<serde_json::Value> = result
                        .errors
                        .iter()
                        .map(|e| {
                            serde_json::Value::Array(vec![
                                serde_json::Value::String(e.msg.clone()),
                                serde_json::Value::String(format!(
                                    "{}:{}",
                                    e.position.0, e.position.1
                                )),
                            ])
                        })
                        .collect();

                    if actual.len() != expected.len() {
                        return TestResult::Failed {
                            expected: format!("{} errors", expected.len()),
                            actual: format!("{} errors", actual.len()),
                            diff: None,
                        };
                    }

                    for (i, (exp, act)) in expected.iter().zip(actual.iter()).enumerate() {
                        if !Self::values_equal(exp, act) {
                            return TestResult::Failed {
                                expected: format!("Error {i}: {exp:?}"),
                                actual: format!("Error {i}: {act:?}"),
                                diff: None,
                            };
                        }
                    }

                    return TestResult::Passed;
                }

                // Humanize tokens based on test type
                let actual = match test_type {
                    HtmlLexerTestType::HumanizeParts => Self::humanize_parts(&result.tokens),
                    HtmlLexerTestType::HumanizeLineColumn => {
                        Self::humanize_line_column(&result.tokens, input)
                    }
                    HtmlLexerTestType::HumanizeSourceSpans => {
                        Self::humanize_source_spans(&result.tokens, input)
                    }
                    HtmlLexerTestType::HumanizeFullStart => {
                        Self::humanize_full_start(&result.tokens, input)
                    }
                    HtmlLexerTestType::HumanizeErrors => unreachable!(),
                };

                // When expected is empty, Angular just wants to verify tokenization succeeds
                // without errors - don't compare token output
                if expected.is_empty() {
                    return if result.errors.is_empty() {
                        TestResult::Passed
                    } else {
                        TestResult::Failed {
                            expected: "No errors".into(),
                            actual: format!("{} errors: {:?}", result.errors.len(), result.errors),
                            diff: None,
                        }
                    };
                }

                // Compare with expected
                if actual.len() != expected.len() {
                    return TestResult::Failed {
                        expected: format!("{} tokens", expected.len()),
                        actual: format!("{} tokens: {:?}", actual.len(), actual),
                        diff: None,
                    };
                }

                for (i, (exp, act)) in expected.iter().zip(actual.iter()).enumerate() {
                    if !Self::values_equal(exp, act) {
                        return TestResult::Failed {
                            expected: format!("Token {i}: {exp:?}"),
                            actual: format!("Token {i}: {act:?}"),
                            diff: None,
                        };
                    }
                }

                TestResult::Passed
            }
            _ => TestResult::Skipped { reason: "Not handled by HTML lexer runner".into() },
        }
    }
}
