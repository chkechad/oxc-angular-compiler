//! HTML/Angular template parser.
//!
//! Parses Angular template syntax including:
//! - Standard HTML elements and attributes
//! - Angular control flow blocks: `@if`, `@for`, `@switch`, `@defer`
//! - Let declarations: `@let name = expression`
//! - Structural directives: `*ngIf`, `*ngFor`
//! - Template references: `#ref`
//! - i18n attributes
//! - HTML entities: named (&amp;) and numeric (&#123;, &#xABC;)

pub mod entities;
mod lexer;
mod parser;
mod tags;
mod whitespace;

pub use entities::{NGSP_UNICODE, decode_entities_in_string, decode_entity, get_named_entities};
pub use lexer::*;
pub use parser::*;
pub use tags::{
    ContentType, HtmlTagDefinition, TagContentType, get_html_tag_definition, get_ns_prefix,
    is_void_element, merge_ns_and_name, namespace_uri, split_ns_name,
};
pub use whitespace::{PRESERVE_WS_ATTR_NAME, WhitespaceVisitor, remove_whitespaces};
