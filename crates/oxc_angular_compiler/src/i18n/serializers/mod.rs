//! I18n serializers for various translation file formats.
//!
//! Ported from Angular's `i18n/serializers/` directory.
//!
//! Supported formats:
//! - XLIFF 1.2: Industry-standard translation format
//! - XLIFF 2.0: Updated XLIFF specification
//! - XMB: XML Message Bundle (Google Closure Compiler format)
//! - XTB: XML Translation Bundle (companion to XMB)

pub mod xliff;
pub mod xliff2;
pub mod xmb;
pub mod xml_helper;
pub mod xtb;

pub use xliff::Xliff1Serializer;
pub use xliff2::Xliff2Serializer;
pub use xmb::XmbSerializer;
pub use xtb::XtbSerializer;

use rustc_hash::FxHashMap;

use crate::i18n::ast::{
    BlockPlaceholder, Container, Icu, IcuPlaceholder, Message, Node, Placeholder, TagPlaceholder,
    Text, Visitor,
};

/// Result of loading translations from a serialized format.
pub struct LoadResult {
    /// The locale of the loaded translations.
    pub locale: Option<String>,
    /// Map of message IDs to their i18n AST nodes.
    pub i18n_nodes_by_msg_id: FxHashMap<String, Vec<Node>>,
}

/// Trait for i18n message serializers.
///
/// Each serializer format (XLIFF, XMB, etc.) implements this trait to handle
/// serialization and deserialization of i18n messages.
pub trait Serializer {
    /// Serializes messages to a translation file format.
    ///
    /// The `messages` parameter contains messages that have already been processed:
    /// - Placeholder names are already mapped to public names using the provided mapper
    /// - The `id` contains the message id that the serializer is expected to use
    fn write(&self, messages: &[Message], locale: Option<&str>) -> Result<String, SerializerError>;

    /// Loads translations from the given content.
    ///
    /// Returns the locale (if available) and a map of message IDs to i18n AST nodes.
    fn load(&self, content: &str, url: &str) -> Result<LoadResult, SerializerError>;

    /// Computes the message digest (ID) for the given message.
    ///
    /// Different formats use different digest algorithms:
    /// - XLIFF 1.2: SHA1-based digest
    /// - XLIFF 2.0: Decimal digest
    /// - XMB/XTB: Decimal digest
    fn digest(&self, message: &Message) -> String;

    /// Creates a name mapper for the given message.
    ///
    /// Returns `None` if no name mapping is needed (default).
    /// Serializers like XMB that have placeholder naming constraints should
    /// return a mapper that transforms internal placeholder names to valid public names.
    fn create_name_mapper(&self, message: &Message) -> Option<Box<dyn PlaceholderMapper>>;
}

/// A `PlaceholderMapper` converts placeholder names from internal to serialized
/// representation and back.
///
/// It should be used for serialization formats that put constraints on placeholder names.
/// For example, XMB placeholders can only contain A-Z, 0-9 and _.
pub trait PlaceholderMapper {
    /// Converts an internal placeholder name to its public/serialized form.
    fn to_public_name(&self, internal_name: &str) -> Option<String>;

    /// Converts a public/serialized placeholder name back to its internal form.
    fn to_internal_name(&self, public_name: &str) -> Option<String>;
}

/// A simple mapper that uses a function to transform internal names to public names.
///
/// This is a port of Angular's `SimplePlaceholderMapper` class.
pub struct SimplePlaceholderMapper {
    internal_to_public: FxHashMap<String, String>,
    public_to_internal: FxHashMap<String, String>,
    public_to_next_id: FxHashMap<String, u32>,
    map_name: fn(&str) -> String,
}

impl SimplePlaceholderMapper {
    /// Creates a new mapper by visiting all placeholders in the message.
    pub fn new(message: &Message, map_name: fn(&str) -> String) -> Self {
        let mut mapper = Self {
            internal_to_public: FxHashMap::default(),
            public_to_internal: FxHashMap::default(),
            public_to_next_id: FxHashMap::default(),
            map_name,
        };
        // Visit all nodes to collect placeholder names
        let mut ctx = ();
        for node in &message.nodes {
            node.visit(&mut mapper, &mut ctx);
        }
        mapper
    }

    /// Visits a placeholder name and adds the mapping.
    fn visit_placeholder_name(&mut self, internal_name: &str) {
        if internal_name.is_empty() || self.internal_to_public.contains_key(internal_name) {
            return;
        }

        let mut public_name = (self.map_name)(internal_name);

        if self.public_to_internal.contains_key(&public_name) {
            // Create a new name when it has already been used
            let next_id = self.public_to_next_id.get(&public_name).copied().unwrap_or(1);
            self.public_to_next_id.insert(public_name.clone(), next_id + 1);
            public_name = format!("{public_name}_{next_id}");
        } else {
            self.public_to_next_id.insert(public_name.clone(), 1);
        }

        self.internal_to_public.insert(internal_name.to_string(), public_name.clone());
        self.public_to_internal.insert(public_name, internal_name.to_string());
    }
}

impl PlaceholderMapper for SimplePlaceholderMapper {
    fn to_public_name(&self, internal_name: &str) -> Option<String> {
        self.internal_to_public.get(internal_name).cloned()
    }

    fn to_internal_name(&self, public_name: &str) -> Option<String> {
        self.public_to_internal.get(public_name).cloned()
    }
}

impl Visitor for SimplePlaceholderMapper {
    type Context = ();
    type Result = ();

    fn visit_text(&mut self, _text: &Text, _context: &mut Self::Context) -> Self::Result {}

    fn visit_container(&mut self, container: &Container, context: &mut Self::Context) {
        for child in &container.children {
            child.visit(self, context);
        }
    }

    fn visit_icu(&mut self, icu: &Icu, context: &mut Self::Context) {
        for (_, case) in &icu.cases {
            case.visit(self, context);
        }
    }

    fn visit_tag_placeholder(&mut self, ph: &TagPlaceholder, context: &mut Self::Context) {
        self.visit_placeholder_name(&ph.start_name);
        for child in &ph.children {
            child.visit(self, context);
        }
        self.visit_placeholder_name(&ph.close_name);
    }

    fn visit_placeholder(&mut self, ph: &Placeholder, _context: &mut Self::Context) {
        self.visit_placeholder_name(&ph.name);
    }

    fn visit_block_placeholder(&mut self, ph: &BlockPlaceholder, context: &mut Self::Context) {
        self.visit_placeholder_name(&ph.start_name);
        for child in &ph.children {
            child.visit(self, context);
        }
        self.visit_placeholder_name(&ph.close_name);
    }

    fn visit_icu_placeholder(&mut self, ph: &IcuPlaceholder, _context: &mut Self::Context) {
        self.visit_placeholder_name(&ph.name);
    }
}

/// Serializer error.
#[derive(Debug)]
pub enum SerializerError {
    /// XML parsing error.
    XmlParse(String),
    /// Invalid format.
    InvalidFormat(String),
    /// Missing required element.
    MissingElement(String),
    /// Invalid translation ID.
    InvalidId(String),
    /// Unsupported operation for this serializer.
    UnsupportedOperation(String),
}

impl std::fmt::Display for SerializerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SerializerError::XmlParse(msg) => write!(f, "XML parse error: {msg}"),
            SerializerError::InvalidFormat(msg) => write!(f, "Invalid format: {msg}"),
            SerializerError::MissingElement(msg) => write!(f, "Missing element: {msg}"),
            SerializerError::InvalidId(msg) => write!(f, "Invalid ID: {msg}"),
            SerializerError::UnsupportedOperation(msg) => {
                write!(f, "Unsupported operation: {msg}")
            }
        }
    }
}

impl std::error::Error for SerializerError {}
