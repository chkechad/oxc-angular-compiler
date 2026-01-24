//! XLIFF 2.0 serializer.
//!
//! Serializes i18n messages to XLIFF 2.0 format.
//!
//! Ported from Angular's `i18n/serializers/xliff2.ts`.

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

/// XLIFF 2.0 version string.
const VERSION: &str = "2.0";

/// XLIFF 2.0 namespace.
const XLIFF_NS: &str = "urn:oasis:names:tc:xliff:document:2.0";

/// Default source language.
const DEFAULT_SOURCE_LANG: &str = "en";

/// XLIFF 2.0 serializer.
#[derive(Debug, Default)]
pub struct Xliff2Serializer;

impl Xliff2Serializer {
    /// Creates a new XLIFF 2.0 serializer.
    pub fn new() -> Self {
        Self
    }
}

impl Serializer for Xliff2Serializer {
    fn write(&self, messages: &[Message], locale: Option<&str>) -> Result<String, SerializerError> {
        let mut builder = XmlBuilder::new();

        builder.xml_declaration();

        // Open xliff root element - no trgLang attribute (matches Angular)
        builder.open_element(
            "xliff",
            &[
                ("version", VERSION),
                ("xmlns", XLIFF_NS),
                ("srcLang", locale.unwrap_or(DEFAULT_SOURCE_LANG)),
            ],
            false,
        );

        // Open file element
        builder.open_element("file", &[("id", "ngi18n"), ("original", "ng.template")], false);

        // Serialize each message as a unit
        for message in messages {
            serialize_message(&mut builder, message);
        }

        // Close file, xliff
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

        // Find xliff element and extract srcLang for locale
        if parser.find_element("xliff") {
            if let Some(src_lang) = parser.read_attribute("srcLang") {
                locale = Some(src_lang.to_string());
            }
        }

        // Reset parser to find unit elements
        parser = XmlParser::new(content);
        parser.skip_xml_declaration();

        // Find unit elements
        while parser.find_element("unit") {
            let id = match parser.read_attribute("id") {
                Some(id) => id.to_string(),
                None => continue,
            };

            // Read target from segment
            if parser.find_element("target") {
                let target_text = unescape_xml(parser.read_element_text());
                // Parse the target text into i18n nodes
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
        // XLIFF 2.0 doesn't require placeholder name mapping
        None
    }
}

/// XLIFF 2.0 placeholder tag name.
const PLACEHOLDER_TAG: &str = "ph";

/// XLIFF 2.0 paired code tag name.
const PLACEHOLDER_SPANNING_TAG: &str = "pc";

/// XLIFF marker tag name.
const MARKER_TAG: &str = "mrk";

/// Parse target content into i18n nodes using HtmlParser with ICU expansion support.
///
/// This uses the HtmlParser with `tokenize_expansion_forms: true` to properly parse
/// ICU expressions (plural, select, selectordinal) in translation files.
fn parse_target_content(content: &str) -> Vec<Node> {
    let allocator = Allocator::default();
    let options = ParseTemplateOptions { tokenize_expansion_forms: true, ..Default::default() };

    let parser = HtmlParser::with_options(&allocator, content, "xliff2", &options);
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
/// - `<ph>` placeholder elements → i18n::Placeholder (using `equiv` attribute)
/// - `<pc>` paired code elements → start placeholder + children + end placeholder
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
            // <ph equiv="PLACEHOLDER_NAME"/> - placeholder element
            let equiv = element
                .attrs
                .iter()
                .find(|attr| attr.name.as_str() == "equiv")
                .map(|attr| attr.value.as_str().to_string())
                .unwrap_or_default();

            if !equiv.is_empty() {
                return Some(vec![Node::Placeholder(Placeholder::new(
                    String::new(),
                    equiv,
                    ParseSourceSpan::default(),
                ))]);
            }
            // Missing equiv attribute - skip this element
            None
        } else if tag_name == PLACEHOLDER_SPANNING_TAG {
            // <pc equivStart="START_NAME" equivEnd="END_NAME">...</pc>
            let start_equiv = element
                .attrs
                .iter()
                .find(|attr| attr.name.as_str() == "equivStart")
                .map(|attr| attr.value.as_str().to_string())
                .unwrap_or_default();

            let end_equiv = element
                .attrs
                .iter()
                .find(|attr| attr.name.as_str() == "equivEnd")
                .map(|attr| attr.value.as_str().to_string())
                .unwrap_or_default();

            if start_equiv.is_empty() || end_equiv.is_empty() {
                // Missing required attributes - skip
                return None;
            }

            let mut nodes = Vec::new();

            // Start placeholder
            nodes.push(Node::Placeholder(Placeholder::new(
                String::new(),
                start_equiv,
                ParseSourceSpan::default(),
            )));

            // Children
            nodes.extend(self.convert_nodes(&element.children));

            // End placeholder
            nodes.push(Node::Placeholder(Placeholder::new(
                String::new(),
                end_equiv,
                ParseSourceSpan::default(),
            )));

            Some(nodes)
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

/// Serializes a single message to XLIFF 2.0.
fn serialize_message(builder: &mut XmlBuilder, message: &Message) {
    let id = if message.custom_id.is_empty() { &message.id } else { &message.custom_id };

    builder.open_element("unit", &[("id", id)], false);

    // Notes for meaning, description, and location
    let has_notes = !message.meaning.is_empty()
        || !message.description.is_empty()
        || !message.sources.is_empty();

    if has_notes {
        builder.open_element("notes", &[], false);

        if !message.description.is_empty() {
            builder.text_element("note", &[("category", "description")], &message.description);
        }

        if !message.meaning.is_empty() {
            builder.text_element("note", &[("category", "meaning")], &message.meaning);
        }

        // Add location notes for each source
        for source in &message.sources {
            let location = if source.end_line != source.start_line {
                format!("{}:{},{}", source.file_path, source.start_line, source.end_line)
            } else {
                format!("{}:{}", source.file_path, source.start_line)
            };
            builder.text_element("note", &[("category", "location")], &location);
        }

        builder.close_element("notes");
    }

    // Segment with source only (no target element - matches Angular)
    builder.open_element("segment", &[], false);

    // Source element
    builder.open_element_inline("source", &[]);
    let mut visitor = Xliff2MessageVisitor::new(builder);
    for node in &message.nodes {
        node.visit(&mut visitor, &mut ());
    }
    builder.close_element_inline("source");

    builder.close_element("segment");
    builder.close_element("unit");
}

/// Visitor for serializing i18n nodes to XLIFF 2.0 format.
struct Xliff2MessageVisitor<'a> {
    builder: &'a mut XmlBuilder,
    /// Sequential ID counter for placeholders (XLIFF 2.0 requires unique IDs).
    next_placeholder_id: u32,
}

impl<'a> Xliff2MessageVisitor<'a> {
    fn new(builder: &'a mut XmlBuilder) -> Self {
        Self { builder, next_placeholder_id: 0 }
    }

    /// Gets the next placeholder ID and increments the counter.
    fn next_id(&mut self) -> u32 {
        let id = self.next_placeholder_id;
        self.next_placeholder_id += 1;
        id
    }

    fn serialize(&mut self, nodes: &[Node]) {
        for node in nodes {
            node.visit(self, &mut ());
        }
    }
}

/// Returns the XLIFF 2.0 type for a given tag.
/// Matches Angular's `getTypeForTag()` function exactly.
fn get_type_for_tag(tag: &str) -> &'static str {
    match tag.to_lowercase().as_str() {
        // Formatting tags (exact match with Angular)
        "br" | "b" | "i" | "u" => "fmt",
        // Image tags
        "img" => "image",
        // Link tags
        "a" => "link",
        // Other tags
        _ => "other",
    }
}

impl Visitor for Xliff2MessageVisitor<'_> {
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
        // ICU expressions are serialized inline
        // Use expressionPlaceholder if available, otherwise fall back to expression
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
        let tag_type = get_type_for_tag(&ph.tag);

        if ph.is_void {
            // Self-closing tag - use <ph> element with sequential ID and type
            let id = self.next_id();
            self.builder.raw(&format!(
                "<ph id=\"{}\" equiv=\"{}\" type=\"{}\" disp=\"&lt;{}/&gt;\"/>",
                id, ph.start_name, tag_type, ph.tag
            ));
        } else {
            // Opening tag - use <pc> element with sequential ID and type
            let id = self.next_id();
            self.builder.raw(&format!(
                "<pc id=\"{}\" equivStart=\"{}\" equivEnd=\"{}\" type=\"{}\" dispStart=\"&lt;{}&gt;\" dispEnd=\"&lt;/{}&gt;\">",
                id, ph.start_name, ph.close_name, tag_type, ph.tag, ph.tag
            ));

            // Children
            self.serialize(&ph.children);

            // Closing paired code
            self.builder.raw("</pc>");
        }
    }

    fn visit_placeholder(&mut self, ph: &crate::i18n::ast::Placeholder, _: &mut Self::Context) {
        let id = self.next_id();
        self.builder.raw(&format!(
            "<ph id=\"{}\" equiv=\"{}\" disp=\"{{{{{}}}}}\"/>",
            id, ph.name, ph.value
        ));
    }

    fn visit_icu_placeholder(
        &mut self,
        ph: &crate::i18n::ast::IcuPlaceholder,
        _: &mut Self::Context,
    ) {
        // ICU placeholder uses collapsed form {value {...}} instead of full ICU content
        let cases: Vec<String> =
            ph.value.cases.keys().map(|value| format!("{value} {{...}}")).collect();
        let disp = format!(
            "{{{}, {}, {}}}",
            ph.value.expression,
            ph.value.icu_type.as_str(),
            cases.join(" ")
        );
        let id = self.next_id();
        self.builder.raw(&format!("<ph id=\"{}\" equiv=\"{}\" disp=\"{}\"/>", id, ph.name, disp));
    }

    fn visit_block_placeholder(
        &mut self,
        ph: &crate::i18n::ast::BlockPlaceholder,
        _: &mut Self::Context,
    ) {
        // Opening block - use <pc> with sequential ID and type="other"
        let id = self.next_id();
        self.builder.raw(&format!(
            "<pc id=\"{}\" equivStart=\"{}\" equivEnd=\"{}\" type=\"other\" dispStart=\"@{}\" dispEnd=\"}}\">",
            id, ph.start_name, ph.close_name, ph.name
        ));

        // Children
        self.serialize(&ph.children);

        self.builder.raw("</pc>");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::i18n::ast::{Node, Text};
    use crate::util::ParseSourceSpan;
    use rustc_hash::FxHashMap;

    #[test]
    fn test_write_xliff2() {
        let serializer = Xliff2Serializer::new();

        let message = Message::new(
            vec![Node::Text(Text::new("Hello World".to_string(), ParseSourceSpan::default()))],
            FxHashMap::default(),
            FxHashMap::default(),
            "greeting".to_string(),
            "A greeting message".to_string(),
            "msg_greeting".to_string(),
        );

        let output = serializer.write(&[message], Some("en")).unwrap();

        assert!(output.contains("version=\"2.0\""));
        assert!(output.contains("srcLang=\"en\""));
        // Should NOT contain trgLang attribute
        assert!(!output.contains("trgLang"));
        assert!(output.contains("Hello World"));
        assert!(output.contains("msg_greeting"));
        assert!(output.contains("category=\"meaning\""));
        assert!(output.contains("category=\"description\""));
        // Should NOT contain empty <target/> element
        assert!(!output.contains("<target"));
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
        let nodes = parse_target_content("Hello <ph equiv=\"INTERPOLATION\"/> World");
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
    fn test_parse_target_content_with_paired_code() {
        // <pc equivStart="START_TAG" equivEnd="CLOSE_TAG">inner</pc>
        let nodes =
            parse_target_content("<pc equivStart=\"START_TAG\" equivEnd=\"CLOSE_TAG\">inner</pc>");
        assert_eq!(nodes.len(), 3);

        if let Node::Placeholder(ph) = &nodes[0] {
            assert_eq!(ph.name, "START_TAG");
        } else {
            panic!("Expected start Placeholder node");
        }

        if let Node::Text(text) = &nodes[1] {
            assert_eq!(text.value, "inner");
        } else {
            panic!("Expected Text node");
        }

        if let Node::Placeholder(ph) = &nodes[2] {
            assert_eq!(ph.name, "CLOSE_TAG");
        } else {
            panic!("Expected end Placeholder node");
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
