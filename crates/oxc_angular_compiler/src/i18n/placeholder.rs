//! Placeholder registry for i18n.
//!
//! Creates unique names for placeholders with different content.
//! Returns the same placeholder name when the content is identical.
//!
//! Ported from Angular's `i18n/serializers/placeholder.ts`.

use indexmap::IndexMap;
use rustc_hash::FxHashMap;

/// Mapping of HTML tags to semantic placeholder names.
static TAG_TO_PLACEHOLDER_NAMES: &[(&str, &str)] = &[
    ("A", "LINK"),
    ("B", "BOLD_TEXT"),
    ("BR", "LINE_BREAK"),
    ("EM", "EMPHASISED_TEXT"),
    ("H1", "HEADING_LEVEL1"),
    ("H2", "HEADING_LEVEL2"),
    ("H3", "HEADING_LEVEL3"),
    ("H4", "HEADING_LEVEL4"),
    ("H5", "HEADING_LEVEL5"),
    ("H6", "HEADING_LEVEL6"),
    ("HR", "HORIZONTAL_RULE"),
    ("I", "ITALIC_TEXT"),
    ("LI", "LIST_ITEM"),
    ("LINK", "MEDIA_LINK"),
    ("OL", "ORDERED_LIST"),
    ("P", "PARAGRAPH"),
    ("Q", "QUOTATION"),
    ("S", "STRIKETHROUGH_TEXT"),
    ("SMALL", "SMALL_TEXT"),
    ("SUB", "SUBSTRIPT"),
    ("SUP", "SUPERSCRIPT"),
    ("TBODY", "TABLE_BODY"),
    ("TD", "TABLE_CELL"),
    ("TFOOT", "TABLE_FOOTER"),
    ("TH", "TABLE_HEADER_CELL"),
    ("THEAD", "TABLE_HEADER"),
    ("TR", "TABLE_ROW"),
    ("TT", "MONOSPACED_TEXT"),
    ("U", "UNDERLINED_TEXT"),
    ("UL", "UNORDERED_LIST"),
];

/// Get the placeholder name for a tag.
fn get_tag_placeholder_name(tag: &str) -> String {
    let upper_tag = tag.to_uppercase();
    for (t, name) in TAG_TO_PLACEHOLDER_NAMES {
        if *t == upper_tag {
            return (*name).to_string();
        }
    }
    format!("TAG_{}", upper_tag)
}

/// Creates unique names for placeholders with different content.
///
/// Returns the same placeholder name when the content is identical.
#[derive(Debug, Default)]
pub struct PlaceholderRegistry {
    /// Count the occurrence of the base name to generate a unique name.
    placeholder_name_counts: FxHashMap<String, u32>,
    /// Maps signature to placeholder names.
    signature_to_name: FxHashMap<String, String>,
}

impl PlaceholderRegistry {
    /// Creates a new placeholder registry.
    pub fn new() -> Self {
        Self::default()
    }

    /// Get or create a placeholder name for a start tag.
    pub fn get_start_tag_placeholder_name(
        &mut self,
        tag: &str,
        attrs: &IndexMap<String, String>,
        is_void: bool,
    ) -> String {
        let signature = self.hash_tag(tag, attrs, is_void);
        if let Some(name) = self.signature_to_name.get(&signature) {
            return name.clone();
        }

        let base_name = get_tag_placeholder_name(tag);
        let name = if is_void {
            self.generate_unique_name(&base_name)
        } else {
            self.generate_unique_name(&format!("START_{}", base_name))
        };

        self.signature_to_name.insert(signature, name.clone());
        name
    }

    /// Get or create a placeholder name for a close tag.
    pub fn get_close_tag_placeholder_name(&mut self, tag: &str) -> String {
        let signature = self.hash_closing_tag(tag);
        if let Some(name) = self.signature_to_name.get(&signature) {
            return name.clone();
        }

        let base_name = get_tag_placeholder_name(tag);
        let name = self.generate_unique_name(&format!("CLOSE_{}", base_name));

        self.signature_to_name.insert(signature, name.clone());
        name
    }

    /// Get or create a placeholder name for an expression/interpolation.
    pub fn get_placeholder_name(&mut self, name: &str, content: &str) -> String {
        let upper_name = name.to_uppercase();
        let signature = format!("PH: {}={}", upper_name, content);
        if let Some(existing) = self.signature_to_name.get(&signature) {
            return existing.clone();
        }

        let unique_name = self.generate_unique_name(&upper_name);
        self.signature_to_name.insert(signature, unique_name.clone());
        unique_name
    }

    /// Generate a unique placeholder name without caching.
    pub fn get_unique_placeholder(&mut self, name: &str) -> String {
        self.generate_unique_name(&name.to_uppercase())
    }

    /// Get or create a placeholder name for a start block (@if, @for, etc.).
    pub fn get_start_block_placeholder_name(
        &mut self,
        name: &str,
        parameters: &[String],
    ) -> String {
        let signature = self.hash_block(name, parameters);
        if let Some(existing) = self.signature_to_name.get(&signature) {
            return existing.clone();
        }

        let placeholder =
            self.generate_unique_name(&format!("START_BLOCK_{}", Self::to_snake_case(name)));
        self.signature_to_name.insert(signature, placeholder.clone());
        placeholder
    }

    /// Get or create a placeholder name for a close block.
    pub fn get_close_block_placeholder_name(&mut self, name: &str) -> String {
        let signature = self.hash_closing_block(name);
        if let Some(existing) = self.signature_to_name.get(&signature) {
            return existing.clone();
        }

        let placeholder =
            self.generate_unique_name(&format!("CLOSE_BLOCK_{}", Self::to_snake_case(name)));
        self.signature_to_name.insert(signature, placeholder.clone());
        placeholder
    }

    /// Generate a hash for a tag - does not take attribute order into account.
    fn hash_tag(&self, tag: &str, attrs: &IndexMap<String, String>, is_void: bool) -> String {
        let start = format!("<{}", tag);

        let mut attr_keys: Vec<_> = attrs.keys().collect();
        attr_keys.sort();
        let str_attrs: String = attr_keys
            .iter()
            .filter_map(|name| attrs.get(*name).map(|value| format!(" {}={}", name, value)))
            .collect();

        let end = if is_void { "/>".to_string() } else { format!("></{}>", tag) };

        format!("{}{}{}", start, str_attrs, end)
    }

    fn hash_closing_tag(&self, tag: &str) -> String {
        self.hash_tag(&format!("/{}", tag), &IndexMap::default(), false)
    }

    fn hash_block(&self, name: &str, parameters: &[String]) -> String {
        let params = if parameters.is_empty() {
            String::new()
        } else {
            let mut sorted = parameters.to_vec();
            sorted.sort();
            format!(" ({})", sorted.join("; "))
        };
        format!("@{}{} {{}}", name, params)
    }

    fn hash_closing_block(&self, name: &str) -> String {
        self.hash_block(&format!("close_{}", name), &[])
    }

    fn to_snake_case(name: &str) -> String {
        name.to_uppercase()
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
            .collect()
    }

    fn generate_unique_name(&mut self, base: &str) -> String {
        let base = base.to_string();
        if let Some(count) = self.placeholder_name_counts.get_mut(&base) {
            let id = *count;
            *count += 1;
            format!("{}_{}", base, id)
        } else {
            self.placeholder_name_counts.insert(base.clone(), 1);
            base
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unique_placeholder_generation() {
        let mut registry = PlaceholderRegistry::new();

        let name1 = registry.get_placeholder_name("INTERPOLATION", "{{foo}}");
        let name2 = registry.get_placeholder_name("INTERPOLATION", "{{bar}}");
        let name3 = registry.get_placeholder_name("INTERPOLATION", "{{foo}}");

        assert_eq!(name1, "INTERPOLATION");
        assert_eq!(name2, "INTERPOLATION_1");
        assert_eq!(name3, "INTERPOLATION"); // Same content returns same name
    }

    #[test]
    fn test_tag_placeholder_names() {
        let mut registry = PlaceholderRegistry::new();

        let start = registry.get_start_tag_placeholder_name("span", &IndexMap::default(), false);
        let close = registry.get_close_tag_placeholder_name("span");

        assert_eq!(start, "START_TAG_SPAN");
        assert_eq!(close, "CLOSE_TAG_SPAN");
    }

    #[test]
    fn test_void_element_placeholder() {
        let mut registry = PlaceholderRegistry::new();

        let br = registry.get_start_tag_placeholder_name("br", &IndexMap::default(), true);
        assert_eq!(br, "LINE_BREAK");
    }

    #[test]
    fn test_semantic_tag_names() {
        let mut registry = PlaceholderRegistry::new();

        let a = registry.get_start_tag_placeholder_name("a", &IndexMap::default(), false);
        let b = registry.get_start_tag_placeholder_name("b", &IndexMap::default(), false);
        let h1 = registry.get_start_tag_placeholder_name("h1", &IndexMap::default(), false);

        assert_eq!(a, "START_LINK");
        assert_eq!(b, "START_BOLD_TEXT");
        assert_eq!(h1, "START_HEADING_LEVEL1");
    }

    #[test]
    fn test_block_placeholder_names() {
        let mut registry = PlaceholderRegistry::new();

        let start = registry.get_start_block_placeholder_name("if", &["condition".to_string()]);
        let close = registry.get_close_block_placeholder_name("if");

        assert_eq!(start, "START_BLOCK_IF");
        assert_eq!(close, "CLOSE_BLOCK_IF");
    }

    #[test]
    fn test_get_unique_placeholder() {
        let mut registry = PlaceholderRegistry::new();

        let p1 = registry.get_unique_placeholder("icu");
        let p2 = registry.get_unique_placeholder("icu");
        let p3 = registry.get_unique_placeholder("icu");

        assert_eq!(p1, "ICU");
        assert_eq!(p2, "ICU_1");
        assert_eq!(p3, "ICU_2");
    }
}
