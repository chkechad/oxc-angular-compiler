//! XLIFF 1.2 serializer.
//!
//! Serializes i18n messages to XLIFF 1.2 format.
//!
//! Ported from Angular's `i18n/serializers/xliff.ts`.

use indexmap::IndexMap;
use oxc_allocator::Allocator;
use rustc_hash::FxHashMap;

use super::xml_helper::{XmlBuilder, XmlParser, unescape_xml};
use super::{LoadResult, PlaceholderMapper, Serializer, SerializerError};
use crate::ast::html::{HtmlElement, HtmlExpansion, HtmlExpansionCase, HtmlNode, HtmlText};
use crate::i18n::ast::{Container, Icu, Message, Node, Placeholder, Text, Visitor};
use crate::i18n::digest;
use crate::parser::ParseTemplateOptions;
use crate::parser::html::HtmlParser;
use crate::util::ParseSourceSpan;

/// XLIFF 1.2 version string.
const VERSION: &str = "1.2";

/// XLIFF 1.2 namespace.
const XLIFF_NS: &str = "urn:oasis:names:tc:xliff:document:1.2";

/// Default source language.
const DEFAULT_SOURCE_LANG: &str = "en";

/// XLIFF 1.2 serializer.
#[derive(Debug, Default)]
pub struct Xliff1Serializer;

impl Xliff1Serializer {
    /// Creates a new XLIFF 1.2 serializer.
    pub fn new() -> Self {
        Self
    }
}

impl Serializer for Xliff1Serializer {
    fn write(&self, messages: &[Message], locale: Option<&str>) -> Result<String, SerializerError> {
        let mut builder = XmlBuilder::new();

        builder.xml_declaration();

        // Open xliff root element
        builder.open_element("xliff", &[("version", VERSION), ("xmlns", XLIFF_NS)], false);

        // Open file element - no target-language attribute (matches Angular)
        builder.open_element(
            "file",
            &[
                ("source-language", locale.unwrap_or(DEFAULT_SOURCE_LANG)),
                ("datatype", "plaintext"),
                ("original", "ng2.template"),
            ],
            false,
        );

        // Open body
        builder.open_element("body", &[], false);

        // Serialize each message
        for message in messages {
            serialize_message(&mut builder, message);
        }

        // Close body, file, xliff
        builder.close_element("body");
        builder.close_element("file");
        builder.close_element("xliff");

        Ok(builder.build())
    }

    fn load(&self, content: &str, _url: &str) -> Result<LoadResult, SerializerError> {
        let mut i18n_nodes_by_msg_id: FxHashMap<String, Vec<Node>> = FxHashMap::default();
        let mut locale: Option<String> = None;
        let mut parser = XmlParser::new(content);

        parser.skip_xml_declaration();
        parser.skip_whitespace();

        // Find file element and extract target-language for locale
        if parser.find_element("file") {
            if let Some(target_lang) = parser.read_attribute("target-language") {
                locale = Some(target_lang.to_string());
            }
        }

        // Reset parser to find trans-unit elements
        parser = XmlParser::new(content);
        parser.skip_xml_declaration();

        // Find trans-unit elements
        while parser.find_element("trans-unit") {
            let id = match parser.read_attribute("id") {
                Some(id) => id.to_string(),
                None => continue,
            };

            // Read target element content
            if parser.find_element("target") {
                let target_text = unescape_xml(parser.read_element_text());
                // Parse the target text into i18n nodes
                // For now, we create a simple Text node. A full implementation would
                // parse placeholders and ICU expressions from the XML.
                let nodes = parse_target_content(&target_text);
                i18n_nodes_by_msg_id.insert(id, nodes);
            }
        }

        Ok(LoadResult { locale, i18n_nodes_by_msg_id })
    }

    fn digest(&self, message: &Message) -> String {
        digest::digest(message)
    }

    fn create_name_mapper(&self, _message: &Message) -> Option<Box<dyn PlaceholderMapper>> {
        // XLIFF 1.2 doesn't require placeholder name mapping
        None
    }
}

/// XLIFF placeholder tag name.
const PLACEHOLDER_TAG: &str = "x";

/// XLIFF marker tag name.
const MARKER_TAG: &str = "mrk";

/// Parse target content into i18n nodes using HtmlParser with ICU expansion support.
///
/// This uses the HtmlParser with `tokenize_expansion_forms: true` to properly parse
/// ICU expressions (plural, select, selectordinal) in translation files.
fn parse_target_content(content: &str) -> Vec<Node> {
    let allocator = Allocator::default();
    let options = ParseTemplateOptions { tokenize_expansion_forms: true, ..Default::default() };

    let parser = HtmlParser::with_options(&allocator, content, "xliff", &options);
    let result = parser.parse();

    if !result.errors.is_empty() {
        // On parse errors, return empty - matches Angular behavior
        return Vec::new();
    }

    // Convert HTML nodes to i18n nodes
    let mut converter = XmlToI18n::new();
    converter.convert_nodes(&result.nodes)
}

/// Converts parsed XML/HTML nodes to i18n AST nodes.
///
/// Handles:
/// - Text nodes → i18n::Text
/// - `<x>` placeholder elements → i18n::Placeholder
/// - `<mrk>` marker elements → recurse into children
/// - ICU expansion expressions → i18n::Icu
struct XmlToI18n;

impl XmlToI18n {
    fn new() -> Self {
        Self
    }

    /// Convert a list of HTML nodes to i18n nodes.
    fn convert_nodes(&mut self, nodes: &[HtmlNode<'_>]) -> Vec<Node> {
        let mut result = Vec::new();
        for node in nodes {
            if let Some(i18n_nodes) = self.convert_node(node) {
                result.extend(i18n_nodes);
            }
        }
        result
    }

    /// Convert a single HTML node to i18n node(s).
    fn convert_node(&mut self, node: &HtmlNode<'_>) -> Option<Vec<Node>> {
        match node {
            HtmlNode::Text(text) => Some(vec![self.convert_text(text)]),
            HtmlNode::Element(element) => self.convert_element(element),
            HtmlNode::Expansion(expansion) => Some(vec![self.convert_expansion(expansion)]),
            HtmlNode::ExpansionCase(case) => Some(self.convert_expansion_case(case)),
            // Other node types are not expected in XLIFF target content
            _ => None,
        }
    }

    /// Convert a text node.
    fn convert_text(&self, text: &HtmlText<'_>) -> Node {
        Node::Text(Text::new(text.value.to_string(), ParseSourceSpan::default()))
    }

    /// Convert an element node.
    fn convert_element(&mut self, element: &HtmlElement<'_>) -> Option<Vec<Node>> {
        let tag_name = element.name.as_str();

        if tag_name == PLACEHOLDER_TAG {
            // <x id="PLACEHOLDER_NAME"/> - placeholder element
            let id = element
                .attrs
                .iter()
                .find(|attr| attr.name.as_str() == "id")
                .map(|attr| attr.value.as_str().to_string())
                .unwrap_or_default();

            if !id.is_empty() {
                return Some(vec![Node::Placeholder(Placeholder::new(
                    String::new(),
                    id,
                    ParseSourceSpan::default(),
                ))]);
            }
            // Missing id attribute - skip this element
            None
        } else if tag_name == MARKER_TAG {
            // <mrk>...</mrk> - marker element, recurse into children
            Some(self.convert_nodes(&element.children))
        } else {
            // Unexpected element - skip
            None
        }
    }

    /// Convert an ICU expansion node.
    fn convert_expansion(&mut self, expansion: &HtmlExpansion<'_>) -> Node {
        let mut cases = IndexMap::new();

        for case in &expansion.cases {
            let case_nodes = self.convert_nodes(&case.expansion);
            let container = Node::Container(Container::new(case_nodes, ParseSourceSpan::default()));
            cases.insert(case.value.to_string(), container);
        }

        Node::Icu(Icu::new(
            expansion.switch_value.to_string(),
            expansion.expansion_type.to_string(),
            cases,
            ParseSourceSpan::default(),
            None, // expression_placeholder not used when loading translations
        ))
    }

    /// Convert an ICU expansion case node.
    fn convert_expansion_case(&mut self, case: &HtmlExpansionCase<'_>) -> Vec<Node> {
        self.convert_nodes(&case.expansion)
    }
}

/// Serializes a single message to XLIFF.
fn serialize_message(builder: &mut XmlBuilder, message: &Message) {
    let id = if message.custom_id.is_empty() { &message.id } else { &message.custom_id };

    builder.open_element("trans-unit", &[("id", id), ("datatype", "html")], false);

    // Source element
    builder.open_element_inline("source", &[]);
    let mut visitor = Xliff1MessageVisitor::new(builder);
    for node in &message.nodes {
        node.visit(&mut visitor, &mut ());
    }
    builder.close_element_inline("source");

    // Context groups for source location(s)
    for source in &message.sources {
        builder.open_element("context-group", &[("purpose", "location")], false);
        builder.text_element("context", &[("context-type", "sourcefile")], &source.file_path);
        builder.text_element(
            "context",
            &[("context-type", "linenumber")],
            &source.start_line.to_string(),
        );
        builder.close_element("context-group");
    }

    // Notes for description and meaning (description first, then meaning - matches Angular order)
    if !message.description.is_empty() {
        builder.text_element(
            "note",
            &[("priority", "1"), ("from", "description")],
            &message.description,
        );
    }

    if !message.meaning.is_empty() {
        builder.text_element("note", &[("priority", "1"), ("from", "meaning")], &message.meaning);
    }

    builder.close_element("trans-unit");
}

/// Returns the XLIFF 1.2 ctype for a given tag.
fn get_ctype_for_tag(tag: &str) -> String {
    match tag.to_lowercase().as_str() {
        "br" => "lb".to_string(),
        "img" => "image".to_string(),
        _ => format!("x-{}", tag.to_lowercase()),
    }
}

/// Visitor for serializing i18n nodes to XLIFF 1.2 format.
struct Xliff1MessageVisitor<'a> {
    builder: &'a mut XmlBuilder,
}

impl<'a> Xliff1MessageVisitor<'a> {
    fn new(builder: &'a mut XmlBuilder) -> Self {
        Self { builder }
    }

    fn serialize(&mut self, nodes: &[Node]) {
        for node in nodes {
            node.visit(self, &mut ());
        }
    }
}

impl Visitor for Xliff1MessageVisitor<'_> {
    type Context = ();
    type Result = ();

    fn visit_text(&mut self, text: &crate::i18n::ast::Text, _: &mut Self::Context) {
        self.builder.text(&text.value);
    }

    fn visit_container(
        &mut self,
        container: &crate::i18n::ast::Container,
        context: &mut Self::Context,
    ) {
        for child in &container.children {
            child.visit(self, context);
        }
    }

    fn visit_icu(&mut self, icu: &crate::i18n::ast::Icu, context: &mut Self::Context) {
        // Use expressionPlaceholder if available (matches Angular)
        let expr_placeholder = icu.expression_placeholder.as_deref().unwrap_or(&icu.expression);
        self.builder.raw("{");
        self.builder.text(expr_placeholder);
        self.builder.raw(", ");
        self.builder.raw(icu.icu_type.as_str());
        self.builder.raw(", ");

        for (key, value) in &icu.cases {
            self.builder.text(key);
            self.builder.raw(" {");
            value.visit(self, context);
            self.builder.raw("} ");
        }
        self.builder.raw("}");
    }

    fn visit_tag_placeholder(
        &mut self,
        ph: &crate::i18n::ast::TagPlaceholder,
        _: &mut Self::Context,
    ) {
        let ctype = get_ctype_for_tag(&ph.tag);

        if ph.is_void {
            // Void tags have no children nor closing tags
            self.builder.raw(&format!(
                "<x id=\"{}\" ctype=\"{}\" equiv-text=\"&lt;{}/&gt;\"/>",
                ph.start_name, ctype, ph.tag
            ));
        } else {
            // Opening tag
            self.builder.raw(&format!(
                "<x id=\"{}\" ctype=\"{}\" equiv-text=\"&lt;{}&gt;\"/>",
                ph.start_name, ctype, ph.tag
            ));

            // Children
            self.serialize(&ph.children);

            // Closing tag
            if !ph.close_name.is_empty() {
                self.builder.raw(&format!(
                    "<x id=\"{}\" ctype=\"{}\" equiv-text=\"&lt;/{}&gt;\"/>",
                    ph.close_name, ctype, ph.tag
                ));
            }
        }
    }

    fn visit_placeholder(&mut self, ph: &crate::i18n::ast::Placeholder, _: &mut Self::Context) {
        // Angular's XLIFF1 doesn't add ctype for interpolation placeholders
        self.builder.raw(&format!("<x id=\"{}\" equiv-text=\"{{{{{}}}}}\"/>", ph.name, ph.value));
    }

    fn visit_icu_placeholder(
        &mut self,
        ph: &crate::i18n::ast::IcuPlaceholder,
        _: &mut Self::Context,
    ) {
        // ICU placeholder uses collapsed form {value {...}} instead of full ICU content
        let cases: Vec<String> =
            ph.value.cases.keys().map(|value| format!("{value} {{...}}")).collect();
        let equiv_text = format!(
            "{{{}, {}, {}}}",
            ph.value.expression,
            ph.value.icu_type.as_str(),
            cases.join(" ")
        );
        self.builder.raw(&format!("<x id=\"{}\" equiv-text=\"{}\"/>", ph.name, equiv_text));
    }

    fn visit_block_placeholder(
        &mut self,
        ph: &crate::i18n::ast::BlockPlaceholder,
        _: &mut Self::Context,
    ) {
        // Dynamic ctype based on block name (matches Angular)
        let ctype = format!(
            "x-{}",
            ph.name.to_lowercase().replace(|c: char| !c.is_ascii_alphanumeric(), "-")
        );

        // Opening block marker
        self.builder.raw(&format!(
            "<x id=\"{}\" ctype=\"{}\" equiv-text=\"@{}\"/>",
            ph.start_name, ctype, ph.name
        ));

        // Children
        self.serialize(&ph.children);

        // Closing block marker
        if !ph.close_name.is_empty() {
            self.builder.raw(&format!(
                "<x id=\"{}\" ctype=\"{}\" equiv-text=\"}}\"/>",
                ph.close_name, ctype
            ));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::i18n::ast::{Node, Placeholder, Text};
    use crate::util::ParseSourceSpan;
    use rustc_hash::FxHashMap;

    #[test]
    fn test_write_simple_message() {
        let serializer = Xliff1Serializer::new();

        let message = Message::new(
            vec![Node::Text(Text::new("Hello World".to_string(), ParseSourceSpan::default()))],
            FxHashMap::default(),
            FxHashMap::default(),
            String::new(),
            "A greeting".to_string(),
            "greeting".to_string(),
        );

        let output = serializer.write(&[message], Some("en")).unwrap();

        assert!(output.contains("xliff"));
        assert!(output.contains("version=\"1.2\""));
        assert!(output.contains("Hello World"));
        assert!(output.contains("greeting"));
        assert!(output.contains("A greeting"));
        // Should NOT contain target-language attribute
        assert!(!output.contains("target-language"));
    }

    #[test]
    fn test_write_message_with_placeholder() {
        let serializer = Xliff1Serializer::new();

        let message = Message::new(
            vec![
                Node::Text(Text::new("Hello ".to_string(), ParseSourceSpan::default())),
                Node::Placeholder(Placeholder::new(
                    "name".to_string(),
                    "INTERPOLATION".to_string(),
                    ParseSourceSpan::default(),
                )),
            ],
            FxHashMap::default(),
            FxHashMap::default(),
            String::new(),
            String::new(),
            String::new(),
        );

        let output = serializer.write(&[message], Some("en")).unwrap();

        assert!(output.contains("Hello "));
        assert!(output.contains("<x id=\"INTERPOLATION\""));
        // Angular doesn't add ctype for interpolation placeholders
        assert!(!output.contains("ctype=\"x-text\""));
    }

    #[test]
    fn test_parse_target_content_simple_text() {
        let nodes = parse_target_content("Hello World");
        assert_eq!(nodes.len(), 1);
        if let Node::Text(text) = &nodes[0] {
            assert_eq!(text.value, "Hello World");
        } else {
            panic!("Expected Text node");
        }
    }

    #[test]
    fn test_parse_target_content_with_placeholder() {
        let nodes = parse_target_content("Hello <x id=\"INTERPOLATION\"/> World");
        assert_eq!(nodes.len(), 3);

        if let Node::Text(text) = &nodes[0] {
            assert_eq!(text.value, "Hello ");
        } else {
            panic!("Expected Text node");
        }

        if let Node::Placeholder(ph) = &nodes[1] {
            assert_eq!(ph.name, "INTERPOLATION");
        } else {
            panic!("Expected Placeholder node");
        }

        if let Node::Text(text) = &nodes[2] {
            assert_eq!(text.value, " World");
        } else {
            panic!("Expected Text node");
        }
    }

    #[test]
    fn test_parse_target_content_with_marker() {
        // <mrk> elements should be transparent - their children are extracted
        let nodes = parse_target_content("Hello <mrk>World</mrk>");
        assert_eq!(nodes.len(), 2);

        if let Node::Text(text) = &nodes[0] {
            assert_eq!(text.value, "Hello ");
        } else {
            panic!("Expected Text node");
        }

        if let Node::Text(text) = &nodes[1] {
            assert_eq!(text.value, "World");
        } else {
            panic!("Expected Text node from marker children");
        }
    }

    #[test]
    fn test_parse_target_content_with_icu_plural() {
        let nodes = parse_target_content("{count, plural, one {item} other {items}}");
        assert_eq!(nodes.len(), 1);

        if let Node::Icu(icu) = &nodes[0] {
            assert_eq!(icu.expression, "count");
            assert_eq!(icu.icu_type, "plural");
            assert_eq!(icu.cases.len(), 2);
            assert!(icu.cases.contains_key("one"));
            assert!(icu.cases.contains_key("other"));
        } else {
            panic!("Expected Icu node");
        }
    }

    #[test]
    fn test_parse_target_content_with_icu_select() {
        let nodes = parse_target_content("{gender, select, male {He} female {She} other {They}}");
        assert_eq!(nodes.len(), 1);

        if let Node::Icu(icu) = &nodes[0] {
            assert_eq!(icu.expression, "gender");
            assert_eq!(icu.icu_type, "select");
            assert_eq!(icu.cases.len(), 3);
            assert!(icu.cases.contains_key("male"));
            assert!(icu.cases.contains_key("female"));
            assert!(icu.cases.contains_key("other"));
        } else {
            panic!("Expected Icu node");
        }
    }

    #[test]
    fn test_parse_target_content_mixed() {
        let nodes =
            parse_target_content("You have {count, plural, one {1 item} other {many items}}");
        assert_eq!(nodes.len(), 2);

        if let Node::Text(text) = &nodes[0] {
            assert_eq!(text.value, "You have ");
        } else {
            panic!("Expected Text node");
        }

        if let Node::Icu(icu) = &nodes[1] {
            assert_eq!(icu.expression, "count");
            assert_eq!(icu.icu_type, "plural");
        } else {
            panic!("Expected Icu node");
        }
    }
}
