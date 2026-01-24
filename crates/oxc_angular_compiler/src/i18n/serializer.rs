//! I18n message serialization.
//!
//! Serializes i18n messages to various formats including $localize format.
//!
//! Ported from Angular's `i18n/serializers/` and `render3/view/i18n/util.ts`.

use super::ast::{Icu, Node, Visitor};

/// Name of the i18n attributes.
pub const I18N_ATTR: &str = "i18n";
/// Prefix of i18n attribute names.
pub const I18N_ATTR_PREFIX: &str = "i18n-";
/// Prefix of var expressions used in ICUs.
pub const I18N_ICU_VAR_PREFIX: &str = "VAR_";

/// Check if an attribute name is an i18n attribute.
pub fn is_i18n_attribute(name: &str) -> bool {
    name == I18N_ATTR || name.starts_with(I18N_ATTR_PREFIX)
}

/// Convert internal placeholder name to public format.
///
/// XMB/XTB placeholders can only contain A-Z, 0-9 and _.
/// This converts the name to uppercase and replaces invalid characters with underscore.
///
/// Example: `startTagDiv` -> `START_TAG_DIV`
///
/// Ported from Angular's `i18n/serializers/xmb.ts:toPublicName`.
pub fn to_public_name(internal_name: &str) -> String {
    internal_name
        .to_uppercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' { c } else { '_' })
        .collect()
}

/// Format an i18n placeholder name for external use.
///
/// Converts internal placeholder names to public-facing format
/// (for example to use in goog.getMsg call).
///
/// Example: `START_TAG_DIV_1` is converted to `startTagDiv_1` (camelCase)
/// or `START_TAG_DIV_1` (no camelCase).
///
/// Ported from Angular's `render3/view/i18n/util.ts:formatI18nPlaceholderName`.
pub fn format_i18n_placeholder_name(name: &str, use_camel_case: bool) -> String {
    let public_name = to_public_name(name);

    if !use_camel_case {
        return public_name;
    }

    let chunks: Vec<&str> = public_name.split('_').collect();

    if chunks.len() == 1 {
        // If no "_" found - just lowercase the value
        return name.to_lowercase();
    }

    let mut chunks = chunks;
    let mut postfix: Option<&str> = None;

    // Eject last element if it's a number
    if let Some(last) = chunks.last() {
        if last.chars().all(|c| c.is_ascii_digit()) && !last.is_empty() {
            postfix = chunks.pop();
        }
    }

    // First chunk lowercase
    let first = chunks.remove(0).to_lowercase();

    // Remaining chunks: capitalize first letter, lowercase rest
    let rest: String = chunks
        .iter()
        .map(|chunk| {
            let mut chars = chunk.chars();
            match chars.next() {
                Some(first_char) => {
                    let upper = first_char.to_uppercase().collect::<String>();
                    let lower = chars.as_str().to_lowercase();
                    format!("{upper}{lower}")
                }
                None => String::new(),
            }
        })
        .collect();

    let raw = format!("{first}{rest}");

    match postfix {
        Some(p) => format!("{raw}_{p}"),
        None => raw,
    }
}

/// Format i18n placeholder names in a map.
///
/// The placeholder names are converted from "internal" format (e.g. `START_TAG_DIV_1`)
/// to "external" format (e.g. `startTagDiv_1`).
///
/// Ported from Angular's `render3/view/i18n/util.ts:formatI18nPlaceholderNamesInMap`.
pub fn format_i18n_placeholder_names_in_map<V: Clone>(
    params: &[(String, V)],
    use_camel_case: bool,
) -> Vec<(String, V)> {
    params
        .iter()
        .map(|(key, value)| (format_i18n_placeholder_name(key, use_camel_case), value.clone()))
        .collect()
}

/// Escape character used in $localize format.
pub const ESCAPE: char = '\u{FFFD}';

/// Element marker in i18n placeholders.
pub const ELEMENT_MARKER: char = '#';

/// Template marker in i18n placeholders.
pub const TEMPLATE_MARKER: char = '*';

/// Tag close marker.
pub const TAG_CLOSE_MARKER: char = '/';

/// Context marker.
pub const CONTEXT_MARKER: char = ':';

/// Serialize an ICU expression to a string.
///
/// This creates the ICU message format string like:
/// `{count, plural, =0 {none} one {one item} other {{count} items}}`
pub fn serialize_icu(icu: &Icu) -> String {
    let mut visitor = IcuSerializerVisitor { is_nested: false };
    let mut ctx = ();

    let cases: Vec<String> = icu
        .cases
        .iter()
        .map(|(k, v)| format!("{} {{{}}}", k, serialize_icu_node(v, &mut visitor, &mut ctx)))
        .collect();

    // Use expression_placeholder if available (for $localize format), otherwise fall back to expression
    let expr = icu.expression_placeholder.as_deref().unwrap_or(&icu.expression);
    format!("{{{}, {}, {}}}", expr, icu.icu_type.as_str(), cases.join(" "))
}

/// Serialize an ICU case node.
fn serialize_icu_node(node: &Node, visitor: &mut IcuSerializerVisitor, ctx: &mut ()) -> String {
    node.visit(visitor, ctx)
}

/// Visitor for serializing ICU expressions.
struct IcuSerializerVisitor {
    is_nested: bool,
}

impl Visitor for IcuSerializerVisitor {
    type Context = ();
    type Result = String;

    fn visit_text(
        &mut self,
        text: &super::ast::Text,
        _context: &mut Self::Context,
    ) -> Self::Result {
        text.value.clone()
    }

    fn visit_container(
        &mut self,
        container: &super::ast::Container,
        context: &mut Self::Context,
    ) -> Self::Result {
        container
            .children
            .iter()
            .map(|child| child.visit(self, context))
            .collect::<Vec<_>>()
            .join("")
    }

    fn visit_icu(&mut self, icu: &super::ast::Icu, context: &mut Self::Context) -> Self::Result {
        let cases: Vec<String> = icu
            .cases
            .iter()
            .map(|(k, v)| format!("{} {{{}}}", k, v.visit(self, context)))
            .collect();

        // Nested ICU uses expression placeholder, top-level uses expression
        let expr = if self.is_nested {
            icu.expression_placeholder.as_deref().unwrap_or(&icu.expression)
        } else {
            &icu.expression
        };

        format!("{{{}, {}, {}}}", expr, icu.icu_type.as_str(), cases.join(" "))
    }

    fn visit_tag_placeholder(
        &mut self,
        _ph: &super::ast::TagPlaceholder,
        _context: &mut Self::Context,
    ) -> Self::Result {
        // Tags are not typically inside ICU expressions
        String::new()
    }

    fn visit_placeholder(
        &mut self,
        ph: &super::ast::Placeholder,
        _context: &mut Self::Context,
    ) -> Self::Result {
        // In ICU, placeholders use curly braces
        format!("{{{}}}", ph.name)
    }

    fn visit_icu_placeholder(
        &mut self,
        ph: &super::ast::IcuPlaceholder,
        context: &mut Self::Context,
    ) -> Self::Result {
        // Nested ICU
        let mut nested_visitor = IcuSerializerVisitor { is_nested: true };
        nested_visitor.visit_icu(&ph.value, context)
    }

    fn visit_block_placeholder(
        &mut self,
        _ph: &super::ast::BlockPlaceholder,
        _context: &mut Self::Context,
    ) -> Self::Result {
        // Blocks are not typically inside ICU expressions
        String::new()
    }
}

/// Format an i18n parameter value with escape markers.
pub fn format_i18n_placeholder_value(
    slot_index: u32,
    placeholder: &str,
    is_closing: bool,
    is_template: bool,
) -> String {
    let close_marker = if is_closing { TAG_CLOSE_MARKER } else { ' ' };
    let tag_marker = if is_template { TEMPLATE_MARKER } else { ELEMENT_MARKER };

    format!(
        "{}{}{}{}{CONTEXT_MARKER}{placeholder}{ESCAPE}",
        ESCAPE, close_marker, tag_marker, slot_index,
    )
}

/// Format an i18n expression placeholder.
pub fn format_i18n_expression_placeholder(slot_index: u32) -> String {
    format!("{ESCAPE}{ELEMENT_MARKER}{slot_index}{ESCAPE}")
}

/// Serialize an i18n message for goog.getMsg format.
///
/// This walks the i18n AST and generates the message string with placeholders
/// in the `{$placeholderName}` format (camelCase).
///
/// Ported from Angular's `render3/view/i18n/get_msg_utils.ts:serializeI18nMessageForGetMsg`.
pub fn serialize_i18n_message_for_get_msg(message: &super::ast::Message) -> String {
    let mut visitor = GetMsgSerializerVisitor;
    let mut ctx = ();
    message.nodes.iter().map(|n| n.visit(&mut visitor, &mut ctx)).collect::<Vec<_>>().join("")
}

/// Visitor that serializes i18n nodes to goog.getMsg format.
///
/// Uses `{$placeholderName}` format with camelCase for placeholders.
struct GetMsgSerializerVisitor;

impl GetMsgSerializerVisitor {
    /// Format a placeholder name for goog.getMsg (camelCase).
    fn format_ph(&self, value: &str) -> String {
        format!("{{${}}}", format_i18n_placeholder_name(value, true))
    }
}

impl super::ast::Visitor for GetMsgSerializerVisitor {
    type Context = ();
    type Result = String;

    fn visit_text(
        &mut self,
        text: &super::ast::Text,
        _context: &mut Self::Context,
    ) -> Self::Result {
        text.value.clone()
    }

    fn visit_container(
        &mut self,
        container: &super::ast::Container,
        context: &mut Self::Context,
    ) -> Self::Result {
        container.children.iter().map(|child| child.visit(self, context)).collect()
    }

    fn visit_icu(&mut self, icu: &super::ast::Icu, _context: &mut Self::Context) -> Self::Result {
        // ICU expressions are serialized using their specialized serializer
        serialize_icu(icu)
    }

    fn visit_tag_placeholder(
        &mut self,
        ph: &super::ast::TagPlaceholder,
        context: &mut Self::Context,
    ) -> Self::Result {
        if ph.is_void {
            self.format_ph(&ph.start_name)
        } else {
            let children: String =
                ph.children.iter().map(|child| child.visit(self, context)).collect();
            format!(
                "{}{}{}",
                self.format_ph(&ph.start_name),
                children,
                self.format_ph(&ph.close_name)
            )
        }
    }

    fn visit_placeholder(
        &mut self,
        ph: &super::ast::Placeholder,
        _context: &mut Self::Context,
    ) -> Self::Result {
        self.format_ph(&ph.name)
    }

    fn visit_icu_placeholder(
        &mut self,
        ph: &super::ast::IcuPlaceholder,
        _context: &mut Self::Context,
    ) -> Self::Result {
        self.format_ph(&ph.name)
    }

    fn visit_block_placeholder(
        &mut self,
        ph: &super::ast::BlockPlaceholder,
        context: &mut Self::Context,
    ) -> Self::Result {
        let children: String = ph.children.iter().map(|child| child.visit(self, context)).collect();
        format!("{}{}{}", self.format_ph(&ph.start_name), children, self.format_ph(&ph.close_name))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::i18n::ast::{Container, Icu, Node, Placeholder, Text};
    use crate::util::ParseSourceSpan;
    use indexmap::IndexMap;

    #[test]
    fn test_serialize_simple_icu() {
        let mut cases: IndexMap<String, Node> = IndexMap::default();
        cases.insert(
            "=0".to_string(),
            Node::Text(Text::new("no items".to_string(), ParseSourceSpan::default())),
        );
        cases.insert(
            "one".to_string(),
            Node::Text(Text::new("one item".to_string(), ParseSourceSpan::default())),
        );
        cases.insert(
            "other".to_string(),
            Node::Text(Text::new("many items".to_string(), ParseSourceSpan::default())),
        );

        let icu = Icu::new(
            "count".to_string(),
            "plural".to_string(),
            cases,
            ParseSourceSpan::default(),
            None,
        );

        let result = serialize_icu(&icu);
        assert!(result.starts_with("{count, plural,"));
        assert!(result.contains("=0 {no items}"));
        assert!(result.contains("one {one item}"));
        assert!(result.contains("other {many items}"));
    }

    #[test]
    fn test_serialize_icu_with_placeholder() {
        let mut cases: IndexMap<String, Node> = IndexMap::default();
        cases.insert(
            "other".to_string(),
            Node::Container(Container::new(
                vec![
                    Node::Placeholder(Placeholder::new(
                        "count".to_string(),
                        "count".to_string(),
                        ParseSourceSpan::default(),
                    )),
                    Node::Text(Text::new(" items".to_string(), ParseSourceSpan::default())),
                ],
                ParseSourceSpan::default(),
            )),
        );

        let icu = Icu::new(
            "count".to_string(),
            "plural".to_string(),
            cases,
            ParseSourceSpan::default(),
            None,
        );

        let result = serialize_icu(&icu);
        assert!(result.contains("{count} items"));
    }

    #[test]
    fn test_format_i18n_placeholder_value() {
        let result = format_i18n_placeholder_value(0, "START_TAG_DIV", false, false);
        assert!(result.contains("START_TAG_DIV"));
        assert!(result.starts_with('\u{FFFD}'));
        assert!(result.ends_with('\u{FFFD}'));
    }

    #[test]
    fn test_to_public_name() {
        assert_eq!(to_public_name("startTagDiv"), "STARTTAGDIV");
        assert_eq!(to_public_name("START_TAG_DIV"), "START_TAG_DIV");
        assert_eq!(to_public_name("start-tag-div"), "START_TAG_DIV");
    }

    #[test]
    fn test_format_i18n_placeholder_name_camel_case() {
        // Basic conversion
        assert_eq!(format_i18n_placeholder_name("START_TAG_DIV", true), "startTagDiv");
        assert_eq!(format_i18n_placeholder_name("CLOSE_TAG_DIV", true), "closeTagDiv");
        assert_eq!(format_i18n_placeholder_name("INTERPOLATION", true), "interpolation");

        // With numeric suffix
        assert_eq!(format_i18n_placeholder_name("START_TAG_DIV_1", true), "startTagDiv_1");
        assert_eq!(format_i18n_placeholder_name("INTERPOLATION_2", true), "interpolation_2");

        // Single word without underscore
        assert_eq!(format_i18n_placeholder_name("NAME", true), "name");
    }

    #[test]
    fn test_format_i18n_placeholder_name_no_camel_case() {
        assert_eq!(format_i18n_placeholder_name("START_TAG_DIV", false), "START_TAG_DIV");
        assert_eq!(format_i18n_placeholder_name("start_tag_div", false), "START_TAG_DIV");
        assert_eq!(format_i18n_placeholder_name("START_TAG_DIV_1", false), "START_TAG_DIV_1");
    }

    #[test]
    fn test_is_i18n_attribute() {
        assert!(is_i18n_attribute("i18n"));
        assert!(is_i18n_attribute("i18n-title"));
        assert!(is_i18n_attribute("i18n-placeholder"));
        assert!(!is_i18n_attribute("title"));
        assert!(!is_i18n_attribute("i18"));
    }
}
