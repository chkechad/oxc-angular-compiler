use super::SubsystemRunner;
use crate::test_case::{TestAssertion, TestResult};

/// Runner for Angular style parser conformance tests
/// Tests parseStyle() and hyphenate() functions
pub struct StyleParserRunner;

impl StyleParserRunner {
    pub fn new() -> Self {
        Self
    }

    /// Parse a style string into key-value pairs
    /// Returns a flat array: [key1, value1, key2, value2, ...]
    fn parse_style(&self, input: &str) -> Vec<String> {
        let input = input.trim();
        if input.is_empty() {
            return vec![];
        }

        let mut result = Vec::new();
        let chars: Vec<char> = input.chars().collect();
        let len = chars.len();
        let mut i = 0;

        while i < len {
            // Skip leading whitespace
            while i < len && chars[i].is_whitespace() {
                i += 1;
            }
            if i >= len {
                break;
            }

            // Parse property name (up to ':')
            let prop_start = i;
            while i < len && chars[i] != ':' {
                i += 1;
            }
            if i >= len {
                break; // No colon found, invalid
            }
            let prop_name = chars[prop_start..i].iter().collect::<String>().trim().to_string();
            let hyphenated_prop = self.hyphenate(&prop_name);
            i += 1; // Skip ':'

            // Parse value (respecting quotes and parentheses)
            let value = self.parse_style_value(&chars, &mut i);

            result.push(hyphenated_prop);
            result.push(value);
        }

        result
    }

    /// Parse a single style value, respecting quotes and parentheses
    fn parse_style_value(&self, chars: &[char], i: &mut usize) -> String {
        let len = chars.len();

        // Skip leading whitespace
        while *i < len && chars[*i].is_whitespace() {
            *i += 1;
        }

        let value_start = *i;
        let mut paren_depth: i32 = 0;
        let mut in_string = false;
        let mut string_char = '"';

        while *i < len {
            let c = chars[*i];

            if in_string {
                if c == '\\' && *i + 1 < len {
                    *i += 2; // Skip escaped character
                    continue;
                }
                if c == string_char {
                    in_string = false;
                }
                *i += 1;
            } else {
                match c {
                    '"' | '\'' => {
                        in_string = true;
                        string_char = c;
                        *i += 1;
                    }
                    '(' => {
                        paren_depth += 1;
                        *i += 1;
                    }
                    ')' => {
                        paren_depth = paren_depth.saturating_sub(1);
                        *i += 1;
                    }
                    ';' if paren_depth == 0 => {
                        // End of value
                        break;
                    }
                    _ => {
                        *i += 1;
                    }
                }
            }
        }

        let value_end = *i;
        if *i < len && chars[*i] == ';' {
            *i += 1; // Skip ';'
        }

        chars[value_start..value_end].iter().collect::<String>().trim().to_string()
    }

    /// Convert camelCase to hyphenated form
    /// Only adds hyphens between lowercase and uppercase transitions
    fn hyphenate(&self, input: &str) -> String {
        let mut result = String::new();
        let chars: Vec<char> = input.chars().collect();
        for (i, c) in chars.iter().enumerate() {
            if c.is_ascii_uppercase() {
                // Only add hyphen if previous char is not already a hyphen
                if i > 0 && chars[i - 1] != '-' {
                    result.push('-');
                }
                result.push(c.to_ascii_lowercase());
            } else {
                result.push(*c);
            }
        }
        result
    }
}

impl Default for StyleParserRunner {
    fn default() -> Self {
        Self::new()
    }
}

impl SubsystemRunner for StyleParserRunner {
    fn name(&self) -> &'static str {
        "style_parser"
    }

    fn description(&self) -> &'static str {
        "Angular style parser (parseStyle, hyphenate)"
    }

    fn can_handle(&self, assertion: &TestAssertion) -> bool {
        matches!(assertion, TestAssertion::ParseStyle { .. } | TestAssertion::Hyphenate { .. })
    }

    fn run_assertion(&self, assertion: &TestAssertion) -> TestResult {
        match assertion {
            TestAssertion::ParseStyle { input, expected } => {
                let result = self.parse_style(input);
                if result == *expected {
                    TestResult::Passed
                } else {
                    TestResult::Failed {
                        expected: format!("{expected:?}"),
                        actual: format!("{result:?}"),
                        diff: None,
                    }
                }
            }
            TestAssertion::Hyphenate { input, expected } => {
                let result = self.hyphenate(input);
                if result == *expected {
                    TestResult::Passed
                } else {
                    TestResult::Failed { expected: expected.clone(), actual: result, diff: None }
                }
            }
            _ => TestResult::Skipped { reason: "Not handled by style parser runner".to_string() },
        }
    }
}
