//! XMB (XML Message Bundle) serializer.
//!
//! Serializes i18n messages to XMB format (Google Closure Compiler format).
//!
//! Ported from Angular's `i18n/serializers/xmb.ts`.

use super::xml_helper::XmlBuilder;
use super::{LoadResult, PlaceholderMapper, Serializer, SerializerError, SimplePlaceholderMapper};
use crate::i18n::ast::{Message, Node, Visitor};
use crate::i18n::digest::decimal_digest;

/// XMB DOCTYPE DTD.
const XMB_DTD: &str = r#"  <!ELEMENT messagebundle (msg)*>
  <!ATTLIST messagebundle class CDATA #IMPLIED>

  <!ELEMENT msg (#PCDATA|ph|source)*>
  <!ATTLIST msg id CDATA #IMPLIED>
  <!ATTLIST msg seq CDATA #IMPLIED>
  <!ATTLIST msg name CDATA #IMPLIED>
  <!ATTLIST msg desc CDATA #IMPLIED>
  <!ATTLIST msg meaning CDATA #IMPLIED>
  <!ATTLIST msg obsolete (obsolete) #IMPLIED>
  <!ATTLIST msg xml:space (default|preserve) "default">
  <!ATTLIST msg is_hidden CDATA #IMPLIED>

  <!ELEMENT source (#PCDATA)>

  <!ELEMENT ph (#PCDATA|ex)*>
  <!ATTLIST ph name CDATA #REQUIRED>

  <!ELEMENT ex (#PCDATA)>
"#;

/// XMB serializer (produces .xmb files).
#[derive(Debug, Default)]
pub struct XmbSerializer;

impl XmbSerializer {
    /// Creates a new XMB serializer.
    pub fn new() -> Self {
        Self
    }
}

/// Converts a placeholder name to XMB-compatible public name.
/// XMB placeholders can only contain A-Z, 0-9 and _.
fn to_public_name(internal_name: &str) -> String {
    internal_name
        .to_uppercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' { c } else { '_' })
        .collect()
}

impl Serializer for XmbSerializer {
    fn write(
        &self,
        messages: &[Message],
        _locale: Option<&str>,
    ) -> Result<String, SerializerError> {
        let mut builder = XmlBuilder::new();

        builder.xml_declaration();
        builder.doctype("messagebundle", XMB_DTD);

        // Open messagebundle with handler attribute (Angular sets this for analytics)
        builder.open_element("messagebundle", &[("handler", "angular")], false);

        // Serialize each message
        for message in messages {
            serialize_message(&mut builder, message);
        }

        builder.close_element("messagebundle");
        Ok(builder.build())
    }

    fn load(&self, _content: &str, _url: &str) -> Result<LoadResult, SerializerError> {
        // XMB is a source format - use XTB for loading translations
        Err(SerializerError::InvalidFormat(
            "XMB is a source format. Use XTB to load translations.".to_string(),
        ))
    }

    fn digest(&self, message: &Message) -> String {
        decimal_digest(message)
    }

    fn create_name_mapper(&self, message: &Message) -> Option<Box<dyn PlaceholderMapper>> {
        // XMB requires placeholder name normalization (A-Z, 0-9, _)
        Some(Box::new(SimplePlaceholderMapper::new(message, to_public_name)))
    }
}

/// Serializes a single message to XMB.
fn serialize_message(builder: &mut XmlBuilder, message: &Message) {
    // Compute message ID using fingerprint if no custom ID
    let id = if message.custom_id.is_empty() {
        compute_xmb_id(message)
    } else {
        message.custom_id.clone()
    };

    // Build attributes
    let mut attrs: Vec<(&str, &str)> = vec![("id", &id)];

    // Add meaning and description as attributes
    if !message.meaning.is_empty() {
        attrs.push(("meaning", &message.meaning));
    }
    if !message.description.is_empty() {
        attrs.push(("desc", &message.description));
    }

    builder.open_element("msg", &attrs, false);

    // Add source locations (format: filePath:startLine,endLine)
    for source in &message.sources {
        let source_text = if source.end_line != source.start_line {
            format!("{}:{},{}", source.file_path, source.start_line, source.end_line)
        } else {
            format!("{}:{}", source.file_path, source.start_line)
        };
        builder.text_element("source", &[], &source_text);
    }

    // Serialize message content
    let mut visitor = XmbMessageVisitor::new(builder);
    for node in &message.nodes {
        node.visit(&mut visitor, &mut ());
    }

    builder.close_element("msg");
}

/// Computes the XMB message ID using decimalDigest algorithm.
/// This matches Angular's xmb.ts digest() function.
fn compute_xmb_id(message: &Message) -> String {
    decimal_digest(message)
}

/// Visitor for serializing i18n nodes to XMB format.
struct XmbMessageVisitor<'a> {
    builder: &'a mut XmlBuilder,
}

impl<'a> XmbMessageVisitor<'a> {
    fn new(builder: &'a mut XmlBuilder) -> Self {
        Self { builder }
    }

    fn serialize(&mut self, nodes: &[Node]) {
        for node in nodes {
            node.visit(self, &mut ());
        }
    }
}

impl Visitor for XmbMessageVisitor<'_> {
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
        // Opening tag placeholder
        // Content appears both inside <ex> AND as text sibling (Angular format)
        self.builder.open_element_inline("ph", &[("name", &ph.start_name)]);
        self.builder.raw(&format!("<ex>&lt;{}&gt;</ex>&lt;{}&gt;", ph.tag, ph.tag));
        self.builder.close_element_inline("ph");

        // Children
        self.serialize(&ph.children);

        // Closing tag placeholder
        if !ph.close_name.is_empty() && !ph.is_void {
            self.builder.open_element_inline("ph", &[("name", &ph.close_name)]);
            self.builder.raw(&format!("<ex>&lt;/{}&gt;</ex>&lt;/{}&gt;", ph.tag, ph.tag));
            self.builder.close_element_inline("ph");
        }
    }

    fn visit_placeholder(&mut self, ph: &crate::i18n::ast::Placeholder, _: &mut Self::Context) {
        // Content appears both inside <ex> AND as text sibling (Angular format)
        self.builder.open_element_inline("ph", &[("name", &ph.name)]);
        self.builder.raw(&format!("<ex>{{{{{}}}}}</ex>{{{{{}}}}}", ph.value, ph.value));
        self.builder.close_element_inline("ph");
    }

    fn visit_icu_placeholder(
        &mut self,
        ph: &crate::i18n::ast::IcuPlaceholder,
        context: &mut Self::Context,
    ) {
        // Content appears both inside <ex> AND as text sibling (Angular format)
        self.builder.open_element_inline("ph", &[("name", &ph.name)]);
        self.builder.raw("<ex>");
        self.visit_icu(&ph.value, context);
        self.builder.raw("</ex>");
        // Include ICU content again as sibling
        self.visit_icu(&ph.value, context);
        self.builder.close_element_inline("ph");
    }

    fn visit_block_placeholder(
        &mut self,
        ph: &crate::i18n::ast::BlockPlaceholder,
        _: &mut Self::Context,
    ) {
        // Opening block placeholder
        // Content appears both inside <ex> AND as text sibling (Angular format)
        self.builder.open_element_inline("ph", &[("name", &ph.start_name)]);
        self.builder.raw(&format!("<ex>@{}</ex>@{}", ph.name, ph.name));
        self.builder.close_element_inline("ph");

        // Children
        self.serialize(&ph.children);

        // Closing block placeholder
        // Content appears both inside <ex> AND as text sibling (Angular format)
        if !ph.close_name.is_empty() {
            self.builder.open_element_inline("ph", &[("name", &ph.close_name)]);
            self.builder.raw("<ex>}</ex>}");
            self.builder.close_element_inline("ph");
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
    fn test_write_xmb() {
        let serializer = XmbSerializer::new();

        let message = Message::new(
            vec![Node::Text(Text::new("Hello World".to_string(), ParseSourceSpan::default()))],
            FxHashMap::default(),
            FxHashMap::default(),
            "greeting".to_string(),
            "A greeting message".to_string(),
            String::new(),
        );

        let output = serializer.write(&[message], None).unwrap();

        assert!(output.contains("<!DOCTYPE messagebundle"));
        assert!(output.contains("<messagebundle handler=\"angular\">"));
        assert!(output.contains("Hello World"));
        assert!(output.contains("meaning=\"greeting\""));
        assert!(output.contains("desc=\"A greeting message\""));
    }

    #[test]
    fn test_write_xmb_with_placeholder() {
        let serializer = XmbSerializer::new();

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

        let output = serializer.write(&[message], None).unwrap();

        assert!(output.contains("<ph name=\"INTERPOLATION\">"));
        // Angular format: content appears both inside <ex> AND as text sibling
        assert!(output.contains("<ex>{{name}}</ex>{{name}}"));
    }

    #[test]
    fn test_to_public_name() {
        assert_eq!(to_public_name("interpolation"), "INTERPOLATION");
        assert_eq!(to_public_name("start-tag-div"), "START_TAG_DIV");
        assert_eq!(to_public_name("VAR_COUNT"), "VAR_COUNT");
    }
}
