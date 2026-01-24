//! XTB (XML Translation Bundle) serializer.
//!
//! Loads translations from XTB format (companion to XMB).
//!
//! XTB DTD format:
//! ```text
//! <!ELEMENT translationbundle (translation)*>
//! <!ATTLIST translationbundle lang CDATA #REQUIRED>
//! <!ELEMENT translation (#PCDATA|ph)*>
//! <!ATTLIST translation id CDATA #REQUIRED>
//! <!ATTLIST translation key CDATA #IMPLIED>
//! <!ELEMENT ph EMPTY>
//! <!ATTLIST ph name CDATA #REQUIRED>
//! ```
//!
//! Ported from Angular's `i18n/serializers/xtb.ts`.

use indexmap::IndexMap;
use rustc_hash::FxHashMap;

use super::xml_helper::{XmlParser, unescape_xml};
use super::{LoadResult, PlaceholderMapper, Serializer, SerializerError, SimplePlaceholderMapper};
use crate::i18n::ast::{Icu, Message, Node, Placeholder, Text};
use crate::i18n::digest::decimal_digest;
use crate::util::ParseSourceSpan;

/// XTB serializer (loads .xtb files).
#[derive(Debug, Default)]
pub struct XtbSerializer;

impl XtbSerializer {
    /// Creates a new XTB serializer.
    pub fn new() -> Self {
        Self
    }
}

/// Converts a placeholder name to XMB-compatible public name.
/// XMB/XTB placeholders can only contain A-Z, 0-9 and _.
fn to_public_name(internal_name: &str) -> String {
    internal_name
        .to_uppercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' { c } else { '_' })
        .collect()
}

impl Serializer for XtbSerializer {
    fn write(
        &self,
        _messages: &[Message],
        _locale: Option<&str>,
    ) -> Result<String, SerializerError> {
        // XTB is a translation format - use XMB for extraction
        Err(SerializerError::UnsupportedOperation(
            "XTB is a translation format. Use XMB for extraction.".to_string(),
        ))
    }

    fn load(&self, content: &str, _url: &str) -> Result<LoadResult, SerializerError> {
        let mut i18n_nodes_by_msg_id: FxHashMap<String, Vec<Node>> = FxHashMap::default();
        let mut locale: Option<String> = None;
        let mut parser = XmlParser::new(content);

        // Skip XML declaration and DOCTYPE
        parser.skip_xml_declaration();
        parser.skip_whitespace();
        parser.skip_doctype();
        parser.skip_whitespace();

        // Find translationbundle element and extract lang for locale
        if parser.find_element("translationbundle") {
            if let Some(lang) = parser.read_attribute("lang") {
                locale = Some(lang.to_string());
            }
        }

        // Reset parser to find translation elements
        parser = XmlParser::new(content);
        parser.skip_xml_declaration();

        // Find all translation elements
        while parser.find_element("translation") {
            // Read the id attribute
            let id = match parser.read_attribute("id") {
                Some(id) => id.to_string(),
                None => {
                    // Missing id attribute - skip this translation
                    // TypeScript reports: "Missing translation id attribute"
                    continue;
                }
            };

            // Check for duplicate translation ID
            // TypeScript reports: "Duplicated translations for msg {id}"
            if i18n_nodes_by_msg_id.contains_key(&id) {
                // Skip duplicate - first translation wins (matching TypeScript behavior)
                continue;
            }

            // Read the content (everything until </translation>)
            let element_text = parser.read_element_text();
            let nodes = parse_translation_content(element_text);
            i18n_nodes_by_msg_id.insert(id, nodes);
        }

        Ok(LoadResult { locale, i18n_nodes_by_msg_id })
    }

    fn digest(&self, message: &Message) -> String {
        decimal_digest(message)
    }

    fn create_name_mapper(&self, message: &Message) -> Option<Box<dyn PlaceholderMapper>> {
        // XTB uses the same placeholder naming as XMB (A-Z, 0-9, _)
        Some(Box::new(SimplePlaceholderMapper::new(message, to_public_name)))
    }
}

/// Parses translation content into i18n nodes, handling nested ph elements and ICU messages.
///
/// Handles:
/// - Text content
/// - Placeholder elements: `<ph name="..."/>`
/// - ICU messages: `{VAR_PLURAL, plural, =1 {...} other {...}}`
fn parse_translation_content(content: &str) -> Vec<Node> {
    let mut nodes = Vec::new();
    let mut pos = 0;
    let content_bytes = content.as_bytes();

    while pos < content.len() {
        // Check for ICU message start: {
        if content_bytes.get(pos) == Some(&b'{') {
            if let Some((icu, end_pos)) = parse_icu_message(&content[pos..]) {
                nodes.push(Node::Icu(icu));
                pos += end_pos;
                continue;
            }
        }

        if content[pos..].starts_with("<ph ") {
            // Find the name attribute
            let ph_end = match content[pos..].find("/>") {
                Some(i) => pos + i + 2,
                None => {
                    pos = content.len();
                    continue;
                }
            };

            let ph_content = &content[pos..ph_end];
            if let Some(name_start) = ph_content.find("name=\"") {
                let name_start = name_start + 6;
                let name_end = ph_content[name_start..]
                    .find('"')
                    .map(|i| name_start + i)
                    .unwrap_or(ph_content.len());
                let name = &ph_content[name_start..name_end];
                nodes.push(Node::Placeholder(Placeholder::new(
                    String::new(),
                    name.to_string(),
                    ParseSourceSpan::default(),
                )));
            }

            pos = ph_end;
        } else if content_bytes.get(pos) == Some(&b'<') {
            // Skip any other XML tags
            if let Some(end) = content[pos..].find('>') {
                pos += end + 1;
            } else {
                pos += 1;
            }
        } else {
            // Find the next special character (tag, ICU) or end of content
            let next_special = content[pos..]
                .find(|c| c == '<' || c == '{')
                .map(|i| pos + i)
                .unwrap_or(content.len());
            let text = &content[pos..next_special];
            if !text.is_empty() {
                let unescaped = unescape_xml(text);
                nodes.push(Node::Text(Text::new(unescaped, ParseSourceSpan::default())));
            }
            pos = next_special;
        }
    }

    nodes
}

/// Parses an ICU message starting at the given content.
///
/// ICU message format: `{expression, type, case1 {...} case2 {...}}`
/// Examples:
/// - `{VAR_PLURAL, plural, =0 {none} =1 {one} other {many}}`
/// - `{VAR_SELECT, select, male {He} female {She} other {They}}`
///
/// Returns the parsed ICU node and the end position, or None if not an ICU message.
fn parse_icu_message(content: &str) -> Option<(Icu, usize)> {
    if !content.starts_with('{') {
        return None;
    }

    // Find the comma after the expression
    let first_comma = content.find(',')?;
    let expression = content[1..first_comma].trim().to_string();

    // Find the second comma after the type
    let rest = &content[first_comma + 1..];
    let second_comma = rest.find(',')?;
    let icu_type = rest[..second_comma].trim().to_string();

    // Validate ICU type
    if !matches!(icu_type.as_str(), "plural" | "select" | "selectordinal") {
        return None;
    }

    // Parse cases from the rest
    let cases_content = &rest[second_comma + 1..];
    let (cases, end_pos) = parse_icu_cases(cases_content)?;

    // Calculate total characters consumed:
    // - first_comma + 1: past the first comma
    // - second_comma + 1: past the second comma (within rest)
    // - end_pos: characters consumed by parse_icu_cases
    let total_end = first_comma + 1 + second_comma + 1 + end_pos;

    Some((Icu::new(expression, icu_type, cases, ParseSourceSpan::default(), None), total_end))
}

/// Parses ICU cases: `=0 {none} =1 {one} other {many}}`
///
/// Returns the cases map and the position after the closing `}`.
fn parse_icu_cases(content: &str) -> Option<(IndexMap<String, Node>, usize)> {
    let mut cases: IndexMap<String, Node> = IndexMap::new();
    let mut pos = 0;
    let content_bytes = content.as_bytes();

    loop {
        // Skip whitespace
        while pos < content.len() && content_bytes[pos].is_ascii_whitespace() {
            pos += 1;
        }

        if pos >= content.len() {
            break;
        }

        // Check for closing brace (end of ICU)
        if content_bytes[pos] == b'}' {
            return Some((cases, pos + 1));
        }

        // Parse case key (e.g., "=0", "=1", "one", "other", "male", etc.)
        let key_start = pos;
        while pos < content.len()
            && !content_bytes[pos].is_ascii_whitespace()
            && content_bytes[pos] != b'{'
        {
            pos += 1;
        }
        let key = content[key_start..pos].trim().to_string();

        if key.is_empty() {
            break;
        }

        // Skip whitespace before {
        while pos < content.len() && content_bytes[pos].is_ascii_whitespace() {
            pos += 1;
        }

        // Parse case content {content}
        if pos >= content.len() || content_bytes[pos] != b'{' {
            break;
        }

        pos += 1; // Skip opening {
        let case_start = pos;
        let mut brace_depth = 1;

        // Find matching closing brace, handling nested braces
        while pos < content.len() && brace_depth > 0 {
            match content_bytes[pos] {
                b'{' => brace_depth += 1,
                b'}' => brace_depth -= 1,
                _ => {}
            }
            if brace_depth > 0 {
                pos += 1;
            }
        }

        if brace_depth != 0 {
            break;
        }

        let case_content = &content[case_start..pos];

        // Recursively parse case content (may contain nested ICU or placeholders)
        let case_nodes = parse_translation_content(case_content);

        // Always wrap in Container node to match TypeScript behavior
        // Reference: xtb.ts:204 - caseMap[c.value] = new i18n.Container(c.nodes, icu.sourceSpan)
        let case_node = Node::Container(crate::i18n::ast::Container::new(
            case_nodes,
            ParseSourceSpan::default(),
        ));

        cases.insert(key, case_node);
        pos += 1; // Skip closing }
    }

    if cases.is_empty() { None } else { Some((cases, pos)) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_simple_xtb() {
        let xtb = r#"<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE translationbundle>
<translationbundle lang="de">
  <translation id="msg1">Hallo Welt</translation>
  <translation id="msg2">Guten Tag</translation>
</translationbundle>"#;

        let serializer = XtbSerializer::new();
        let result = serializer.load(xtb, "test.xtb").unwrap();

        assert_eq!(result.locale, Some("de".to_string()));
        assert_eq!(result.i18n_nodes_by_msg_id.len(), 2);

        let msg1_nodes = result.i18n_nodes_by_msg_id.get("msg1").unwrap();
        assert_eq!(msg1_nodes.len(), 1);
        if let Node::Text(text) = &msg1_nodes[0] {
            assert_eq!(text.value, "Hallo Welt");
        } else {
            panic!("Expected text node");
        }
    }

    #[test]
    fn test_load_xtb_with_placeholders() {
        let xtb = r#"<?xml version="1.0" encoding="UTF-8" ?>
<translationbundle lang="de">
  <translation id="msg1">Hallo <ph name="NAME"/></translation>
</translationbundle>"#;

        let serializer = XtbSerializer::new();
        let result = serializer.load(xtb, "test.xtb").unwrap();

        assert_eq!(result.i18n_nodes_by_msg_id.len(), 1);
        let nodes = result.i18n_nodes_by_msg_id.get("msg1").unwrap();
        assert_eq!(nodes.len(), 2);

        if let Node::Text(text) = &nodes[0] {
            assert_eq!(text.value, "Hallo ");
        } else {
            panic!("Expected text node");
        }

        if let Node::Placeholder(ph) = &nodes[1] {
            assert_eq!(ph.name, "NAME");
        } else {
            panic!("Expected placeholder node");
        }
    }

    #[test]
    fn test_to_public_name() {
        assert_eq!(to_public_name("interpolation"), "INTERPOLATION");
        assert_eq!(to_public_name("start-tag-div"), "START_TAG_DIV");
        assert_eq!(to_public_name("VAR_COUNT"), "VAR_COUNT");
    }

    #[test]
    fn test_load_xtb_with_icu_plural() {
        let xtb = r#"<?xml version="1.0" encoding="UTF-8" ?>
<translationbundle lang="de">
  <translation id="msg1">{VAR_PLURAL, plural, =0 {keine} =1 {eins} other {viele}}</translation>
</translationbundle>"#;

        let serializer = XtbSerializer::new();
        let result = serializer.load(xtb, "test.xtb").unwrap();

        assert_eq!(result.i18n_nodes_by_msg_id.len(), 1);
        let nodes = result.i18n_nodes_by_msg_id.get("msg1").unwrap();
        assert_eq!(nodes.len(), 1);

        if let Node::Icu(icu) = &nodes[0] {
            assert_eq!(icu.expression, "VAR_PLURAL");
            assert_eq!(icu.icu_type, "plural");
            assert_eq!(icu.cases.len(), 3);

            // Check cases - ICU cases are always wrapped in Container to match TypeScript behavior
            // Reference: xtb.ts:204 - caseMap[c.value] = new i18n.Container(c.nodes, icu.sourceSpan)
            if let Some(Node::Container(container)) = icu.cases.get("=0") {
                if let Some(Node::Text(text)) = container.children.first() {
                    assert_eq!(text.value, "keine");
                } else {
                    panic!("Expected text node inside container for =0 case");
                }
            } else {
                panic!("Expected container node for =0 case");
            }

            if let Some(Node::Container(container)) = icu.cases.get("=1") {
                if let Some(Node::Text(text)) = container.children.first() {
                    assert_eq!(text.value, "eins");
                } else {
                    panic!("Expected text node inside container for =1 case");
                }
            } else {
                panic!("Expected container node for =1 case");
            }

            if let Some(Node::Container(container)) = icu.cases.get("other") {
                if let Some(Node::Text(text)) = container.children.first() {
                    assert_eq!(text.value, "viele");
                } else {
                    panic!("Expected text node inside container for other case");
                }
            } else {
                panic!("Expected container node for other case");
            }
        } else {
            panic!("Expected ICU node");
        }
    }

    #[test]
    fn test_load_xtb_with_icu_select() {
        let xtb = r#"<?xml version="1.0" encoding="UTF-8" ?>
<translationbundle lang="de">
  <translation id="msg1">{VAR_SELECT, select, male {Er} female {Sie} other {Sie}}</translation>
</translationbundle>"#;

        let serializer = XtbSerializer::new();
        let result = serializer.load(xtb, "test.xtb").unwrap();

        let nodes = result.i18n_nodes_by_msg_id.get("msg1").unwrap();
        assert_eq!(nodes.len(), 1);

        if let Node::Icu(icu) = &nodes[0] {
            assert_eq!(icu.expression, "VAR_SELECT");
            assert_eq!(icu.icu_type, "select");
            assert_eq!(icu.cases.len(), 3);
        } else {
            panic!("Expected ICU node");
        }
    }

    #[test]
    fn test_load_xtb_with_icu_and_text() {
        let xtb = r#"<?xml version="1.0" encoding="UTF-8" ?>
<translationbundle lang="de">
  <translation id="msg1">Es gibt {VAR_PLURAL, plural, =1 {ein Element} other {Elemente}}.</translation>
</translationbundle>"#;

        let serializer = XtbSerializer::new();
        let result = serializer.load(xtb, "test.xtb").unwrap();

        let nodes = result.i18n_nodes_by_msg_id.get("msg1").unwrap();
        assert_eq!(nodes.len(), 3);

        // First should be text
        if let Node::Text(text) = &nodes[0] {
            assert_eq!(text.value, "Es gibt ");
        } else {
            panic!("Expected text node first");
        }

        // Second should be ICU
        if let Node::Icu(icu) = &nodes[1] {
            assert_eq!(icu.expression, "VAR_PLURAL");
            assert_eq!(icu.icu_type, "plural");
        } else {
            panic!("Expected ICU node second");
        }

        // Third should be text
        if let Node::Text(text) = &nodes[2] {
            assert_eq!(text.value, ".");
        } else {
            panic!("Expected text node third");
        }
    }

    #[test]
    fn test_load_xtb_with_icu_containing_placeholders() {
        let xtb = r#"<?xml version="1.0" encoding="UTF-8" ?>
<translationbundle lang="de">
  <translation id="msg1">{VAR_PLURAL, plural, =1 {Hallo <ph name="NAME"/>} other {Hallo alle}}</translation>
</translationbundle>"#;

        let serializer = XtbSerializer::new();
        let result = serializer.load(xtb, "test.xtb").unwrap();

        let nodes = result.i18n_nodes_by_msg_id.get("msg1").unwrap();
        assert_eq!(nodes.len(), 1);

        if let Node::Icu(icu) = &nodes[0] {
            assert_eq!(icu.icu_type, "plural");

            // The =1 case should have a container with text and placeholder
            if let Some(Node::Container(container)) = icu.cases.get("=1") {
                assert_eq!(container.children.len(), 2);
                if let Node::Text(text) = &container.children[0] {
                    assert_eq!(text.value, "Hallo ");
                }
                if let Node::Placeholder(ph) = &container.children[1] {
                    assert_eq!(ph.name, "NAME");
                }
            } else {
                panic!("Expected container node for =1 case");
            }
        } else {
            panic!("Expected ICU node");
        }
    }
}
