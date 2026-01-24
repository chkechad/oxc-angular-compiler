//! Utility functions for R3 transform conformance tests.

use std::fmt::Write;

use oxc_angular_compiler::ast::expression::BindingType;

/// Normalize a numeric string by removing trailing .0
pub fn normalize_number(s: &str) -> String {
    if let Some(stripped) = s.strip_suffix(".0") {
        // Check if it's really a number (not something like "foo.0")
        if stripped.chars().all(|c| c.is_ascii_digit() || c == '-') {
            return stripped.to_string();
        }
    }
    s.to_string()
}

/// Convert escape sequences like \t and \n to actual characters.
/// This handles the case where JSON files have \\t which becomes literal \t in the string.
pub fn unescape_sequences(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '\\' {
            if let Some(&next) = chars.peek() {
                match next {
                    't' => {
                        result.push('\t');
                        chars.next();
                    }
                    'n' => {
                        result.push('\n');
                        chars.next();
                    }
                    'r' => {
                        result.push('\r');
                        chars.next();
                    }
                    '\\' => {
                        result.push('\\');
                        chars.next();
                    }
                    _ => {
                        result.push(c);
                    }
                }
            } else {
                result.push(c);
            }
        } else {
            result.push(c);
        }
    }

    result
}

/// Convert JSON expected values to comparable row format
pub fn json_to_rows(expected: &[serde_json::Value]) -> Vec<Vec<String>> {
    expected
        .iter()
        .filter_map(|row| {
            if let serde_json::Value::Array(arr) = row {
                Some(
                    arr.iter()
                        .map(|v| match v {
                            serde_json::Value::String(s) => s.clone(),
                            // Normalize numbers: 6.0 -> 6
                            serde_json::Value::Number(n) => normalize_number(&n.to_string()),
                            serde_json::Value::Null => "null".to_string(),
                            serde_json::Value::Bool(b) => b.to_string(),
                            _ => format!("{v}"),
                        })
                        .collect(),
                )
            } else {
                None
            }
        })
        .collect()
}

/// Format rows for display
pub fn format_rows(rows: &[Vec<String>]) -> String {
    rows.iter().map(|row| format!("[{}]", row.join(", "))).collect::<Vec<_>>().join("\n")
}

/// Create a simple diff between expected and actual
pub fn create_diff(expected: &str, actual: &str) -> String {
    use similar::{ChangeTag, TextDiff};

    let diff = TextDiff::from_lines(expected, actual);
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

/// Convert BindingType enum to string matching Angular's humanizer convention.
/// Angular enum order: Property=0, Attribute=1, Class=2, Style=3, LegacyAnimation=4, TwoWay=5, Animation=6
pub fn binding_type_to_string(bt: BindingType) -> String {
    match bt {
        BindingType::Property => "0".to_string(),
        BindingType::Attribute => "1".to_string(),
        BindingType::Class => "2".to_string(),
        BindingType::Style => "3".to_string(),
        BindingType::LegacyAnimation => "4".to_string(),
        BindingType::TwoWay => "5".to_string(),
        BindingType::Animation => "6".to_string(),
    }
}

/// Convert ParsedEventType to string matching Angular's humanizer convention.
/// Angular enum order: Regular=0, LegacyAnimation=1, TwoWay=2, Animation=3
pub fn event_type_to_string(et: oxc_angular_compiler::ast::expression::ParsedEventType) -> String {
    use oxc_angular_compiler::ast::expression::ParsedEventType;
    match et {
        ParsedEventType::Regular => "0".to_string(),
        ParsedEventType::LegacyAnimation => "1".to_string(),
        ParsedEventType::TwoWay => "2".to_string(),
        ParsedEventType::Animation => "3".to_string(),
    }
}
