//! Message bundle for i18n message extraction.
//!
//! This module provides a container for extracting translatable messages
//! from HTML templates.
//!
//! Ported from Angular's `i18n/message_bundle.ts`.

use rustc_hash::FxHashMap;

use crate::i18n::ast::{
    BlockPlaceholder, Container, Icu, IcuPlaceholder, Message, Node, Placeholder, TagPlaceholder,
    Text, Visitor,
};
use crate::i18n::serializers::{PlaceholderMapper, Serializer};

/// A container for messages extracted from templates.
pub struct MessageBundle {
    /// The extracted messages.
    messages: Vec<Message>,
    /// Implicit tags that should be translated.
    implicit_tags: Vec<String>,
    /// Implicit attributes that should be translated.
    implicit_attrs: FxHashMap<String, Vec<String>>,
    /// The locale.
    locale: Option<String>,
    /// Whether to preserve whitespace.
    preserve_whitespace: bool,
}

impl MessageBundle {
    /// Creates a new message bundle.
    pub fn new(
        implicit_tags: Vec<String>,
        implicit_attrs: FxHashMap<String, Vec<String>>,
        locale: Option<String>,
        preserve_whitespace: bool,
    ) -> Self {
        Self { messages: Vec::new(), implicit_tags, implicit_attrs, locale, preserve_whitespace }
    }

    /// Adds a message to the bundle.
    pub fn add_message(&mut self, message: Message) {
        self.messages.push(message);
    }

    /// Adds multiple messages to the bundle.
    pub fn add_messages(&mut self, messages: impl IntoIterator<Item = Message>) {
        self.messages.extend(messages);
    }

    /// Returns the extracted messages.
    pub fn get_messages(&self) -> &[Message] {
        &self.messages
    }

    /// Returns the number of messages.
    pub fn len(&self) -> usize {
        self.messages.len()
    }

    /// Returns true if there are no messages.
    pub fn is_empty(&self) -> bool {
        self.messages.is_empty()
    }

    /// Returns the implicit tags.
    pub fn implicit_tags(&self) -> &[String] {
        &self.implicit_tags
    }

    /// Returns the implicit attributes.
    pub fn implicit_attrs(&self) -> &FxHashMap<String, Vec<String>> {
        &self.implicit_attrs
    }

    /// Returns whether whitespace should be preserved.
    pub fn preserve_whitespace(&self) -> bool {
        self.preserve_whitespace
    }

    /// Writes the messages to a serialized format.
    ///
    /// # Arguments
    /// * `serializer` - The serializer to use.
    /// * `filter_sources` - Optional function to filter source paths.
    ///
    /// # Errors
    /// Returns an error if the serializer fails (e.g., XTB serializer doesn't support serialization).
    pub fn write(
        &self,
        serializer: &dyn Serializer,
        filter_sources: Option<fn(&str) -> String>,
    ) -> Result<String, super::serializers::SerializerError> {
        // Deduplicate messages based on their ID
        let mut messages_by_id: FxHashMap<String, Message> = FxHashMap::default();

        for message in &self.messages {
            // Use serializer's digest for ID, respecting custom_id
            let id = if !message.custom_id.is_empty() {
                message.custom_id.clone()
            } else {
                serializer.digest(message)
            };

            if let Some(existing) = messages_by_id.get_mut(&id) {
                // Merge sources
                existing.sources.extend(message.sources.clone());
            } else {
                messages_by_id.insert(id.clone(), message.clone());
            }
        }

        // Transform placeholder names and prepare messages
        let msg_list: Vec<Message> = messages_by_id
            .into_iter()
            .map(|(id, mut msg)| {
                // Apply source filter if provided
                if let Some(filter) = filter_sources {
                    for source in &mut msg.sources {
                        source.file_path = filter(&source.file_path);
                    }
                }

                // Map placeholder names using serializer's mapper
                let mapper = serializer.create_name_mapper(&msg);
                let nodes = MapPlaceholderNames::convert(&msg.nodes, mapper.as_deref());

                Message {
                    nodes,
                    placeholders: FxHashMap::default(),
                    placeholder_to_message: FxHashMap::default(),
                    meaning: msg.meaning,
                    description: msg.description,
                    custom_id: msg.custom_id,
                    id,
                    message_string: msg.message_string,
                    sources: msg.sources,
                    legacy_ids: msg.legacy_ids,
                }
            })
            .collect();

        serializer.write(&msg_list, self.locale.as_deref())
    }
}

/// Visitor that maps placeholder names using a mapper function.
struct MapPlaceholderNames;

impl MapPlaceholderNames {
    /// Converts nodes by applying placeholder name mapping.
    fn convert(nodes: &[Node], mapper: Option<&dyn PlaceholderMapper>) -> Vec<Node> {
        let mut visitor = PlaceholderNameMapper { mapper };
        let mut ctx = ();
        nodes.iter().map(|n| n.visit(&mut visitor, &mut ctx)).collect()
    }
}

/// Visitor that maps placeholder names.
struct PlaceholderNameMapper<'a> {
    mapper: Option<&'a dyn PlaceholderMapper>,
}

impl PlaceholderNameMapper<'_> {
    fn map_name(&self, name: &str) -> String {
        self.mapper.and_then(|m| m.to_public_name(name)).unwrap_or_else(|| name.to_string())
    }
}

impl Visitor for PlaceholderNameMapper<'_> {
    type Context = ();
    type Result = Node;

    fn visit_text(&mut self, text: &Text, _: &mut Self::Context) -> Self::Result {
        Node::Text(text.clone())
    }

    fn visit_container(
        &mut self,
        container: &Container,
        context: &mut Self::Context,
    ) -> Self::Result {
        let children = container.children.iter().map(|c| c.visit(self, context)).collect();
        Node::Container(Container { children, source_span: container.source_span.clone() })
    }

    fn visit_icu(&mut self, icu: &Icu, context: &mut Self::Context) -> Self::Result {
        let cases = icu.cases.iter().map(|(k, v)| (k.clone(), v.visit(self, context))).collect();
        Node::Icu(Icu {
            expression: icu.expression.clone(),
            expression_placeholder: icu.expression_placeholder.clone(),
            icu_type: icu.icu_type.clone(),
            cases,
            source_span: icu.source_span.clone(),
        })
    }

    fn visit_tag_placeholder(
        &mut self,
        ph: &TagPlaceholder,
        context: &mut Self::Context,
    ) -> Self::Result {
        let children = ph.children.iter().map(|c| c.visit(self, context)).collect();
        Node::TagPlaceholder(TagPlaceholder {
            tag: ph.tag.clone(),
            attrs: ph.attrs.clone(),
            start_name: self.map_name(&ph.start_name),
            close_name: self.map_name(&ph.close_name),
            is_void: ph.is_void,
            children,
            source_span: ph.source_span.clone(),
            start_source_span: ph.start_source_span.clone(),
            end_source_span: ph.end_source_span.clone(),
        })
    }

    fn visit_placeholder(&mut self, ph: &Placeholder, _: &mut Self::Context) -> Self::Result {
        Node::Placeholder(Placeholder {
            value: ph.value.clone(),
            name: self.map_name(&ph.name),
            source_span: ph.source_span.clone(),
        })
    }

    fn visit_icu_placeholder(
        &mut self,
        ph: &IcuPlaceholder,
        context: &mut Self::Context,
    ) -> Self::Result {
        let icu = if let Node::Icu(icu) = self.visit_icu(&ph.value, context) {
            Box::new(icu)
        } else {
            ph.value.clone()
        };
        Node::IcuPlaceholder(IcuPlaceholder {
            value: icu,
            name: self.map_name(&ph.name),
            source_span: ph.source_span.clone(),
            previous_message: ph.previous_message.clone(),
        })
    }

    fn visit_block_placeholder(
        &mut self,
        ph: &BlockPlaceholder,
        context: &mut Self::Context,
    ) -> Self::Result {
        let children = ph.children.iter().map(|c| c.visit(self, context)).collect();
        Node::BlockPlaceholder(BlockPlaceholder {
            name: ph.name.clone(),
            parameters: ph.parameters.clone(),
            start_name: self.map_name(&ph.start_name),
            close_name: self.map_name(&ph.close_name),
            children,
            source_span: ph.source_span.clone(),
            start_source_span: ph.start_source_span.clone(),
            end_source_span: ph.end_source_span.clone(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
        let bundle = MessageBundle::new(vec![], FxHashMap::default(), None, true);
        assert!(bundle.is_empty());
        assert_eq!(bundle.len(), 0);
    }

    #[test]
    fn test_add_message() {
        let mut bundle = MessageBundle::new(vec![], FxHashMap::default(), None, true);
        bundle.add_message(create_test_message("Hello"));
        assert_eq!(bundle.len(), 1);
    }
}
