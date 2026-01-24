//! Translation bundle for i18n message lookups.
//!
//! This module provides a container for loaded translations that can be used
//! to lookup translated messages by their source message.
//!
//! Ported from Angular's `i18n/translation_bundle.ts`.

use rustc_hash::FxHashMap;

use crate::i18n::ast::{Message, Node};
use crate::i18n::i18n_html_parser::MissingTranslationStrategy;
use crate::i18n::serializers::{Serializer, SerializerError};

/// A container for translated messages.
pub struct TranslationBundle {
    /// Maps message IDs to translated node trees.
    i18n_nodes_by_msg_id: FxHashMap<String, Vec<Node>>,
    /// The locale.
    locale: Option<String>,
    /// Function to compute the message digest/ID.
    digest_fn: fn(&Message) -> String,
    /// Strategy for handling missing translations.
    missing_translation: MissingTranslationStrategy,
}

impl TranslationBundle {
    /// Creates a new empty translation bundle.
    pub fn new_empty(
        digest_fn: fn(&Message) -> String,
        missing_translation: MissingTranslationStrategy,
        locale: Option<String>,
    ) -> Self {
        Self { i18n_nodes_by_msg_id: FxHashMap::default(), locale, digest_fn, missing_translation }
    }

    /// Creates a new translation bundle with the given translations.
    pub fn new(
        i18n_nodes_by_msg_id: FxHashMap<String, Vec<Node>>,
        locale: Option<String>,
        digest_fn: fn(&Message) -> String,
        missing_translation: MissingTranslationStrategy,
    ) -> Self {
        Self { i18n_nodes_by_msg_id, locale, digest_fn, missing_translation }
    }

    /// Loads translations from the given content using the specified serializer.
    pub fn load(
        content: &str,
        url: &str,
        serializer: &dyn Serializer,
        missing_translation: MissingTranslationStrategy,
        locale_override: Option<String>,
    ) -> Result<Self, SerializerError> {
        let result = serializer.load(content, url)?;

        // Use override locale if provided, otherwise use locale from file
        let locale = locale_override.or(result.locale);

        Ok(Self {
            i18n_nodes_by_msg_id: result.i18n_nodes_by_msg_id,
            locale,
            digest_fn: crate::i18n::digest::compute_digest,
            missing_translation,
        })
    }

    /// Computes the digest for a message.
    pub fn digest(&self, message: &Message) -> String {
        (self.digest_fn)(message)
    }

    /// Returns the translation for the given source message as a string.
    ///
    /// Returns `None` if no translation is found.
    pub fn get(&self, src_msg: &Message) -> Option<String> {
        let id = self.digest(src_msg);

        if let Some(nodes) = self.i18n_nodes_by_msg_id.get(&id) {
            // Convert nodes back to text
            Some(self.convert_to_text(nodes, src_msg))
        } else {
            // Handle missing translation based on strategy
            match self.missing_translation {
                MissingTranslationStrategy::Error => {
                    let ctx = self
                        .locale
                        .as_ref()
                        .map(|l| format!(" for locale \"{l}\""))
                        .unwrap_or_default();
                    eprintln!("Error: Missing translation for message \"{id}\"{ctx}");
                }
                MissingTranslationStrategy::Warning => {
                    let ctx = self
                        .locale
                        .as_ref()
                        .map(|l| format!(" for locale \"{l}\""))
                        .unwrap_or_default();
                    eprintln!("Warning: Missing translation for message \"{id}\"{ctx}");
                }
                MissingTranslationStrategy::Ignore => {}
            }
            None
        }
    }

    /// Returns the translated nodes for the given source message.
    ///
    /// Returns `None` if no translation is found.
    pub fn get_nodes(&self, src_msg: &Message) -> Option<&Vec<Node>> {
        let id = self.digest(src_msg);
        self.i18n_nodes_by_msg_id.get(&id)
    }

    /// Checks if a translation exists for the given source message.
    pub fn has(&self, src_msg: &Message) -> bool {
        let id = self.digest(src_msg);
        self.i18n_nodes_by_msg_id.contains_key(&id)
    }

    /// Returns the locale.
    pub fn locale(&self) -> Option<&str> {
        self.locale.as_deref()
    }

    /// Returns the number of translations in the bundle.
    pub fn len(&self) -> usize {
        self.i18n_nodes_by_msg_id.len()
    }

    /// Returns true if the bundle is empty.
    pub fn is_empty(&self) -> bool {
        self.i18n_nodes_by_msg_id.is_empty()
    }

    /// Converts i18n nodes to text string.
    fn convert_to_text(&self, nodes: &[Node], src_msg: &Message) -> String {
        let mut result = String::new();
        for node in nodes {
            self.node_to_text(node, src_msg, &mut result);
        }
        result
    }

    /// Converts a single node to text.
    fn node_to_text(&self, node: &Node, src_msg: &Message, result: &mut String) {
        match node {
            Node::Text(text) => {
                result.push_str(&text.value);
            }
            Node::Container(container) => {
                for child in &container.children {
                    self.node_to_text(child, src_msg, result);
                }
            }
            Node::Icu(icu) => {
                // Reconstruct ICU expression
                let exp = if src_msg.placeholders.contains_key(&icu.expression) {
                    &src_msg.placeholders[&icu.expression].text
                } else {
                    &icu.expression
                };
                result.push('{');
                result.push_str(exp);
                result.push_str(", ");
                result.push_str(&icu.icu_type);
                result.push_str(", ");
                for (i, (key, value)) in icu.cases.iter().enumerate() {
                    if i > 0 {
                        result.push(' ');
                    }
                    result.push_str(key);
                    result.push_str(" {");
                    self.node_to_text(value, src_msg, result);
                    result.push('}');
                }
                result.push('}');
            }
            Node::Placeholder(ph) => {
                // Lookup placeholder value in source message
                if let Some(placeholder_value) = src_msg.placeholders.get(&ph.name) {
                    result.push_str(&placeholder_value.text);
                } else if let Some(nested_msg) = src_msg.placeholder_to_message.get(&ph.name) {
                    result.push_str(&self.convert_to_text(&nested_msg.nodes, src_msg));
                }
            }
            Node::TagPlaceholder(ph) => {
                // Reconstruct tag
                result.push('<');
                result.push_str(&ph.tag);
                for (name, value) in &ph.attrs {
                    result.push(' ');
                    result.push_str(name);
                    result.push_str("=\"");
                    result.push_str(value);
                    result.push('"');
                }
                if ph.is_void {
                    result.push_str("/>");
                } else {
                    result.push('>');
                    for child in &ph.children {
                        self.node_to_text(child, src_msg, result);
                    }
                    result.push_str("</");
                    result.push_str(&ph.tag);
                    result.push('>');
                }
            }
            Node::IcuPlaceholder(ph) => {
                // Lookup nested ICU message
                if let Some(nested_msg) = src_msg.placeholder_to_message.get(&ph.name) {
                    result.push_str(&self.convert_to_text(&nested_msg.nodes, src_msg));
                }
            }
            Node::BlockPlaceholder(ph) => {
                // Reconstruct block
                result.push('@');
                result.push_str(&ph.name);
                if !ph.parameters.is_empty() {
                    result.push_str(" (");
                    result.push_str(&ph.parameters.join("; "));
                    result.push(')');
                }
                result.push_str(" {");
                for child in &ph.children {
                    self.node_to_text(child, src_msg, result);
                }
                result.push('}');
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::i18n::ast::{Message, Text};
    use crate::i18n::digest::compute_digest;

    fn create_test_message(text: &str) -> Message {
        Message::new(
            vec![Node::Text(Text::new(text.to_string(), crate::util::ParseSourceSpan::default()))],
            FxHashMap::default(),
            FxHashMap::default(),
            String::new(),
            String::new(),
            String::new(),
        )
    }

    #[test]
    fn test_empty_bundle() {
        let bundle =
            TranslationBundle::new_empty(compute_digest, MissingTranslationStrategy::Ignore, None);
        assert!(bundle.is_empty());
        assert_eq!(bundle.len(), 0);
    }

    #[test]
    fn test_has_translation() {
        let mut nodes_map = FxHashMap::default();
        let id = "test_id".to_string();
        nodes_map.insert(
            id.clone(),
            vec![Node::Text(Text::new(
                "translated".to_string(),
                crate::util::ParseSourceSpan::default(),
            ))],
        );

        let bundle = TranslationBundle::new(
            nodes_map,
            None,
            |_| "test_id".to_string(),
            MissingTranslationStrategy::Ignore,
        );

        let msg = create_test_message("original");
        assert!(bundle.has(&msg));
    }

    #[test]
    fn test_get_translation() {
        let mut nodes_map = FxHashMap::default();
        let id = "test_id".to_string();
        nodes_map.insert(
            id.clone(),
            vec![Node::Text(Text::new(
                "translated".to_string(),
                crate::util::ParseSourceSpan::default(),
            ))],
        );

        let bundle = TranslationBundle::new(
            nodes_map,
            None,
            |_| "test_id".to_string(),
            MissingTranslationStrategy::Ignore,
        );

        let msg = create_test_message("original");
        assert_eq!(bundle.get(&msg), Some("translated".to_string()));
    }

    #[test]
    fn test_missing_translation() {
        let bundle =
            TranslationBundle::new_empty(compute_digest, MissingTranslationStrategy::Ignore, None);

        let msg = create_test_message("original");
        assert_eq!(bundle.get(&msg), None);
    }
}
