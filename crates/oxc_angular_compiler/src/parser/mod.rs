//! Parsers for Angular templates and expressions.
//!
//! This module contains:
//!
//! - [`expression`]: Parser for Angular binding expressions (interpolation, property bindings, pipes)
//! - [`html`]: Parser for HTML/Angular templates (elements, blocks, control flow)

pub mod expression;
pub mod html;

/// Template parsing options.
///
/// These options control how the template parser processes HTML templates.
/// They mirror Angular's `ParseTemplateOptions` interface.
#[derive(Debug, Clone, Default)]
pub struct ParseTemplateOptions {
    /// Include whitespace nodes in the parsed output.
    /// When false (default), whitespace-only text nodes are removed
    /// and consecutive whitespace is collapsed.
    pub preserve_whitespaces: bool,

    /// Preserve original line endings instead of normalizing '\r\n' to '\n'.
    pub preserve_line_endings: bool,

    /// Preserve whitespace significant to rendering.
    /// This is separate from preserve_whitespaces and affects how
    /// whitespace near inline elements is handled.
    pub preserve_significant_whitespace: bool,

    /// Whether @ block syntax is enabled (@if, @for, @switch, etc.).
    pub enable_block_syntax: bool,

    /// Whether @let syntax is enabled.
    pub enable_let_syntax: bool,

    /// Whether selectorless component syntax is enabled.
    pub enable_selectorless: bool,

    /// Whether to tokenize ICU expansion forms.
    pub tokenize_expansion_forms: bool,

    /// Include HTML Comment nodes in output.
    pub collect_comment_nodes: bool,

    /// Characters considered as leading trivia for source maps.
    pub leading_trivia_chars: Option<Vec<char>>,

    /// Custom interpolation delimiters.
    /// Default is ("{{", "}}").
    pub interpolation: Option<(String, String)>,
}
