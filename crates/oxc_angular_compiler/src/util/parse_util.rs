//! Parse utilities for source locations and error handling.
//!
//! Ported from Angular's `parse_util.ts`.

use std::fmt;
use std::sync::{Arc, OnceLock};

use oxc_diagnostics::OxcDiagnostic;
use oxc_span::Span;

use super::chars;

/// A source file being parsed.
#[derive(Debug)]
pub struct ParseSourceFile {
    /// The content of the source file.
    pub content: Arc<str>,
    /// The URL or path of the source file.
    pub url: Arc<str>,
    /// Cached line start offsets for fast line/column lookup.
    line_starts: OnceLock<Vec<u32>>,
}

impl Clone for ParseSourceFile {
    fn clone(&self) -> Self {
        Self {
            content: Arc::clone(&self.content),
            url: Arc::clone(&self.url),
            line_starts: OnceLock::new(),
        }
    }
}

impl ParseSourceFile {
    /// Creates a new `ParseSourceFile`.
    pub fn new(content: impl Into<Arc<str>>, url: impl Into<Arc<str>>) -> Self {
        Self { content: content.into(), url: url.into(), line_starts: OnceLock::new() }
    }

    /// Returns a vector of line start offsets (in bytes).
    fn line_starts(&self) -> &Vec<u32> {
        self.line_starts.get_or_init(|| {
            let bytes = self.content.as_bytes();
            let mut starts = Vec::new();
            starts.push(0);
            for (i, b) in bytes.iter().enumerate() {
                if *b == chars::LF as u8 {
                    let next = i + 1;
                    if next < bytes.len() {
                        starts.push(next as u32);
                    }
                }
            }
            starts
        })
    }

    /// Computes a `ParseLocation` for the given byte offset.
    pub fn location_at(self: &Arc<Self>, offset: u32) -> ParseLocation {
        let starts = self.line_starts();
        let offset = offset.min(self.content.len() as u32);
        let line_index = match starts.binary_search(&offset) {
            Ok(i) => i,
            Err(i) => i.saturating_sub(1),
        };
        let line_start = starts.get(line_index).copied().unwrap_or(0);
        let col = offset.saturating_sub(line_start);
        ParseLocation::new(Arc::clone(self), offset, line_index as u32, col)
    }
}

/// A location within a source file.
#[derive(Debug, Clone)]
pub struct ParseLocation {
    /// The source file this location is in.
    pub file: Arc<ParseSourceFile>,
    /// The byte offset from the start of the file.
    pub offset: u32,
    /// The line number (0-indexed).
    pub line: u32,
    /// The column number (0-indexed).
    pub col: u32,
}

impl ParseLocation {
    /// Creates a new `ParseLocation`.
    pub fn new(file: Arc<ParseSourceFile>, offset: u32, line: u32, col: u32) -> Self {
        Self { file, offset, line, col }
    }

    /// Returns a new location moved by the given delta.
    #[expect(clippy::cast_possible_truncation)]
    pub fn move_by(&self, delta: i32) -> Self {
        let content = self.file.content.as_bytes();
        let len = content.len() as u32;
        let mut offset = self.offset;
        let mut line = self.line;
        let mut col = self.col;
        let mut remaining = delta;

        // Move backwards
        while offset > 0 && remaining < 0 {
            offset -= 1;
            remaining += 1;
            if content.get(offset as usize) == Some(&(chars::LF as u8)) {
                line -= 1;
                // Find the previous line's length
                let prior_line = content[..offset as usize]
                    .iter()
                    .rposition(|&b| b == chars::LF as u8)
                    .map(|p| p as u32 + 1)
                    .unwrap_or(0);
                col = offset - prior_line;
            } else {
                col -= 1;
            }
        }

        // Move forwards
        while offset < len && remaining > 0 {
            if content.get(offset as usize) == Some(&(chars::LF as u8)) {
                line += 1;
                col = 0;
            } else {
                col += 1;
            }
            offset += 1;
            remaining -= 1;
        }

        Self::new(Arc::clone(&self.file), offset, line, col)
    }

    /// Returns the source context around this location.
    pub fn get_context(&self, max_chars: usize, max_lines: usize) -> Option<SourceContext> {
        let content = self.file.content.as_bytes();
        if content.is_empty() {
            return None;
        }

        let mut start_offset = self.offset as usize;
        if start_offset >= content.len() {
            start_offset = content.len() - 1;
        }

        let mut end_offset = start_offset;
        let mut ctx_chars = 0;
        let mut ctx_lines = 0;

        // Expand backwards
        while ctx_chars < max_chars && start_offset > 0 {
            start_offset -= 1;
            ctx_chars += 1;
            if content[start_offset] == b'\n' {
                ctx_lines += 1;
                if ctx_lines == max_lines {
                    break;
                }
            }
        }

        // Expand forwards
        ctx_chars = 0;
        ctx_lines = 0;
        while ctx_chars < max_chars && end_offset < content.len() - 1 {
            end_offset += 1;
            ctx_chars += 1;
            if content[end_offset] == b'\n' {
                ctx_lines += 1;
                if ctx_lines == max_lines {
                    break;
                }
            }
        }

        let before =
            String::from_utf8_lossy(&content[start_offset..self.offset as usize]).to_string();
        let after =
            String::from_utf8_lossy(&content[self.offset as usize..=end_offset]).to_string();

        Some(SourceContext { before, after })
    }
}

impl fmt::Display for ParseLocation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}@{}:{}", self.file.url, self.line + 1, self.col + 1)
    }
}

impl Default for ParseLocation {
    fn default() -> Self {
        let file = Arc::new(ParseSourceFile::new("", "<unknown>"));
        Self { file, offset: 0, line: 0, col: 0 }
    }
}

/// Context around a source location for error messages.
#[derive(Debug, Clone)]
pub struct SourceContext {
    /// Source text before the location.
    pub before: String,
    /// Source text after (and including) the location.
    pub after: String,
}

/// A span of source code with start and end locations.
#[derive(Debug, Clone)]
pub struct ParseSourceSpan {
    /// The start location (after skipping leading trivia).
    pub start: ParseLocation,
    /// The end location.
    pub end: ParseLocation,
    /// The start location including leading trivia.
    pub full_start: ParseLocation,
    /// Additional details (e.g., identifier name).
    pub details: Option<String>,
}

impl ParseSourceSpan {
    /// Creates a new `ParseSourceSpan`.
    pub fn new(start: ParseLocation, end: ParseLocation) -> Self {
        let full_start = start.clone();
        Self { start, end, full_start, details: None }
    }

    /// Creates a new `ParseSourceSpan` with all fields.
    pub fn with_details(
        start: ParseLocation,
        end: ParseLocation,
        full_start: ParseLocation,
        details: Option<String>,
    ) -> Self {
        Self { start, end, full_start, details }
    }

    /// Creates a new `ParseSourceSpan` from raw offsets.
    pub fn from_offsets(
        file: &Arc<ParseSourceFile>,
        start: u32,
        end: u32,
        full_start: Option<u32>,
        details: Option<String>,
    ) -> Self {
        let start_loc = file.location_at(start);
        let end_loc = file.location_at(end);
        let full_start_loc = file.location_at(full_start.unwrap_or(start));
        Self::with_details(start_loc, end_loc, full_start_loc, details)
    }

    /// Converts this span to an `oxc_span::Span`.
    pub fn to_span(&self) -> Span {
        Span::new(self.start.offset, self.end.offset)
    }

    /// Returns the source text covered by this span.
    pub fn source_text(&self) -> &str {
        let start = self.start.offset as usize;
        let end = self.end.offset as usize;
        &self.start.file.content[start..end]
    }
}

impl fmt::Display for ParseSourceSpan {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.source_text())
    }
}

impl Default for ParseSourceSpan {
    fn default() -> Self {
        let loc = ParseLocation::default();
        Self { start: loc.clone(), end: loc.clone(), full_start: loc, details: None }
    }
}

/// Severity level of a parse error.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParseErrorLevel {
    /// Warning - parsing can continue.
    Warning,
    /// Error - parsing may continue but result is invalid.
    Error,
}

/// An error that occurred during parsing.
#[derive(Debug, Clone)]
pub struct ParseError {
    /// The location of the error.
    pub span: ParseSourceSpan,
    /// The error message.
    pub msg: String,
    /// The severity level.
    pub level: ParseErrorLevel,
}

impl ParseError {
    /// Creates a new `ParseError` with `Error` level.
    pub fn new(span: ParseSourceSpan, msg: impl Into<String>) -> Self {
        Self { span, msg: msg.into(), level: ParseErrorLevel::Error }
    }

    /// Creates a new `ParseError` with `Warning` level.
    pub fn warning(span: ParseSourceSpan, msg: impl Into<String>) -> Self {
        Self { span, msg: msg.into(), level: ParseErrorLevel::Warning }
    }

    /// Returns the error message with source context.
    pub fn contextual_message(&self) -> String {
        if let Some(ctx) = self.span.start.get_context(100, 3) {
            let level = match self.level {
                ParseErrorLevel::Warning => "WARNING",
                ParseErrorLevel::Error => "ERROR",
            };
            format!("{} (\"{}[{} ->]{}\")", self.msg, ctx.before, level, ctx.after)
        } else {
            self.msg.clone()
        }
    }

    /// Converts this error to an `OxcDiagnostic`.
    pub fn to_diagnostic(&self) -> OxcDiagnostic {
        let span = self.span.to_span();
        match self.level {
            ParseErrorLevel::Warning => OxcDiagnostic::warn(self.msg.clone()).with_label(span),
            ParseErrorLevel::Error => OxcDiagnostic::error(self.msg.clone()).with_label(span),
        }
    }
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let details = self.span.details.as_ref().map_or(String::new(), |d| format!(", {d}"));
        write!(f, "{}: {}{}", self.contextual_message(), self.span.start, details)
    }
}

impl std::error::Error for ParseError {}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_file() -> Arc<ParseSourceFile> {
        Arc::new(ParseSourceFile::new("line1\nline2\nline3", "test.html"))
    }

    #[test]
    fn test_parse_location_display() {
        let file = make_test_file();
        let loc = ParseLocation::new(file, 6, 1, 0);
        assert_eq!(loc.to_string(), "test.html@2:1");
    }

    #[test]
    fn test_parse_source_span() {
        let file = make_test_file();
        let start = ParseLocation::new(Arc::clone(&file), 0, 0, 0);
        let end = ParseLocation::new(file, 5, 0, 5);
        let span = ParseSourceSpan::new(start, end);
        assert_eq!(span.source_text(), "line1");
    }
}
