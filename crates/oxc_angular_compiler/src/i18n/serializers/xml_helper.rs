//! XML helper utilities for i18n serialization.
//!
//! Ported from Angular's `i18n/serializers/xml_helper.ts`.

/// Escapes XML special characters in text content.
pub fn escape_xml(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            '<' => result.push_str("&lt;"),
            '>' => result.push_str("&gt;"),
            '&' => result.push_str("&amp;"),
            '"' => result.push_str("&quot;"),
            '\'' => result.push_str("&apos;"),
            _ => result.push(c),
        }
    }
    result
}

/// Escapes XML special characters in attribute values.
pub fn escape_xml_attr(text: &str) -> String {
    escape_xml(text)
}

/// XML document builder for serialization.
#[derive(Debug)]
pub struct XmlBuilder {
    content: String,
    indent_level: usize,
    indent_string: String,
}

impl XmlBuilder {
    /// Creates a new XML builder.
    pub fn new() -> Self {
        Self { content: String::new(), indent_level: 0, indent_string: "  ".to_string() }
    }

    /// Creates a new XML builder with custom indentation.
    pub fn with_indent(indent: &str) -> Self {
        Self { content: String::new(), indent_level: 0, indent_string: indent.to_string() }
    }

    /// Adds the XML declaration.
    pub fn xml_declaration(&mut self) -> &mut Self {
        self.content.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n");
        self
    }

    /// Adds a DOCTYPE declaration.
    pub fn doctype(&mut self, name: &str, dtd: &str) -> &mut Self {
        self.content.push_str(&format!("<!DOCTYPE {name} [\n{dtd}]>\n"));
        self
    }

    /// Opens an element with attributes.
    pub fn open_element(
        &mut self,
        name: &str,
        attrs: &[(&str, &str)],
        self_closing: bool,
    ) -> &mut Self {
        self.write_indent();
        self.content.push('<');
        self.content.push_str(name);

        for (key, value) in attrs {
            self.content.push(' ');
            self.content.push_str(key);
            self.content.push_str("=\"");
            self.content.push_str(&escape_xml_attr(value));
            self.content.push('"');
        }

        if self_closing {
            self.content.push_str("/>\n");
        } else {
            self.content.push_str(">\n");
            self.indent_level += 1;
        }

        self
    }

    /// Opens an element without line break (for inline content).
    pub fn open_element_inline(&mut self, name: &str, attrs: &[(&str, &str)]) -> &mut Self {
        self.write_indent();
        self.content.push('<');
        self.content.push_str(name);

        for (key, value) in attrs {
            self.content.push(' ');
            self.content.push_str(key);
            self.content.push_str("=\"");
            self.content.push_str(&escape_xml_attr(value));
            self.content.push('"');
        }

        self.content.push('>');
        self
    }

    /// Closes an element.
    pub fn close_element(&mut self, name: &str) -> &mut Self {
        self.indent_level = self.indent_level.saturating_sub(1);
        self.write_indent();
        self.content.push_str("</");
        self.content.push_str(name);
        self.content.push_str(">\n");
        self
    }

    /// Closes an inline element (no indentation before closing tag).
    pub fn close_element_inline(&mut self, name: &str) -> &mut Self {
        self.content.push_str("</");
        self.content.push_str(name);
        self.content.push_str(">\n");
        self
    }

    /// Adds text content (escaped).
    pub fn text(&mut self, content: &str) -> &mut Self {
        self.content.push_str(&escape_xml(content));
        self
    }

    /// Adds raw content (not escaped).
    pub fn raw(&mut self, content: &str) -> &mut Self {
        self.content.push_str(content);
        self
    }

    /// Adds an element with text content.
    pub fn text_element(&mut self, name: &str, attrs: &[(&str, &str)], content: &str) -> &mut Self {
        self.open_element_inline(name, attrs);
        self.text(content);
        self.close_element_inline(name);
        self
    }

    /// Adds a comment.
    pub fn comment(&mut self, content: &str) -> &mut Self {
        self.write_indent();
        self.content.push_str("<!-- ");
        self.content.push_str(content);
        self.content.push_str(" -->\n");
        self
    }

    /// Returns the built XML content.
    pub fn build(self) -> String {
        self.content
    }

    fn write_indent(&mut self) {
        for _ in 0..self.indent_level {
            self.content.push_str(&self.indent_string);
        }
    }
}

impl Default for XmlBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// Simple XML parser for loading translation files.
#[derive(Debug)]
pub struct XmlParser<'a> {
    content: &'a str,
    position: usize,
}

impl<'a> XmlParser<'a> {
    /// Creates a new XML parser.
    pub fn new(content: &'a str) -> Self {
        Self { content, position: 0 }
    }

    /// Skips whitespace.
    pub fn skip_whitespace(&mut self) {
        while self.position < self.content.len() {
            let c = self.content.as_bytes()[self.position];
            if c.is_ascii_whitespace() {
                self.position += 1;
            } else {
                break;
            }
        }
    }

    /// Checks if at end of content.
    pub fn is_eof(&self) -> bool {
        self.position >= self.content.len()
    }

    /// Peeks at the next character.
    pub fn peek(&self) -> Option<char> {
        self.content[self.position..].chars().next()
    }

    /// Advances and returns the next character.
    pub fn advance(&mut self) -> Option<char> {
        let c = self.content[self.position..].chars().next()?;
        self.position += c.len_utf8();
        Some(c)
    }

    /// Expects a specific string.
    pub fn expect(&mut self, s: &str) -> bool {
        if self.content[self.position..].starts_with(s) {
            self.position += s.len();
            true
        } else {
            false
        }
    }

    /// Reads until a delimiter.
    pub fn read_until(&mut self, delim: char) -> &'a str {
        let start = self.position;
        while self.position < self.content.len() {
            if self.content[self.position..].chars().next() == Some(delim) {
                break;
            }
            self.position += 1;
        }
        &self.content[start..self.position]
    }

    /// Reads until a string.
    pub fn read_until_str(&mut self, delim: &str) -> &'a str {
        let start = self.position;
        while self.position < self.content.len() {
            if self.content[self.position..].starts_with(delim) {
                break;
            }
            self.position += 1;
        }
        &self.content[start..self.position]
    }

    /// Skips the XML declaration if present.
    pub fn skip_xml_declaration(&mut self) {
        self.skip_whitespace();
        if self.content[self.position..].starts_with("<?xml") {
            while !self.is_eof() && !self.content[self.position..].starts_with("?>") {
                self.position += 1;
            }
            if self.expect("?>") {
                // Skip past ?>
            }
        }
    }

    /// Skips DOCTYPE if present.
    pub fn skip_doctype(&mut self) {
        self.skip_whitespace();
        if self.content[self.position..].starts_with("<!DOCTYPE") {
            let mut depth = 0;
            while !self.is_eof() {
                if self.peek() == Some('[') {
                    depth += 1;
                    self.advance();
                } else if self.peek() == Some(']') {
                    depth -= 1;
                    self.advance();
                } else if depth == 0 && self.peek() == Some('>') {
                    self.advance();
                    break;
                } else {
                    self.advance();
                }
            }
        }
    }

    /// Finds the next element with the given name.
    pub fn find_element(&mut self, name: &str) -> bool {
        let pattern = format!("<{name}");
        while !self.is_eof() {
            if self.content[self.position..].starts_with(&pattern) {
                // Verify this is the complete element name, not a prefix
                // (e.g., "translation" should not match "translationbundle")
                let after_name = self.position + pattern.len();
                if after_name < self.content.len() {
                    let next_char = self.content.as_bytes()[after_name];
                    if next_char.is_ascii_whitespace() || next_char == b'>' || next_char == b'/' {
                        return true;
                    }
                }
            }
            self.position += 1;
        }
        false
    }

    /// Reads an attribute value.
    pub fn read_attribute(&mut self, name: &str) -> Option<&'a str> {
        let start = self.position;
        let pattern = format!("{name}=\"");

        // Search for the attribute in the current element
        while !self.is_eof() {
            let remaining = &self.content[self.position..];
            if remaining.starts_with(&pattern) {
                self.position += pattern.len();
                let value = self.read_until('"');
                self.advance(); // Skip closing quote
                return Some(value);
            }
            if remaining.starts_with('>') || remaining.starts_with("/>") {
                break;
            }
            self.position += 1;
        }

        self.position = start;
        None
    }

    /// Gets the inner text of the current element.
    pub fn read_element_text(&mut self) -> &'a str {
        // Skip to after the opening tag
        while !self.is_eof() && self.peek() != Some('>') {
            self.advance();
        }
        self.advance(); // Skip '>'

        let start = self.position;
        let mut depth = 1;

        while !self.is_eof() && depth > 0 {
            if self.content[self.position..].starts_with("</") {
                depth -= 1;
                if depth == 0 {
                    break;
                }
            } else if self.peek() == Some('<')
                && !self.content[self.position..].starts_with("</")
                && !self.content[self.position..].starts_with("<!--")
            {
                // Check if self-closing
                let tag_end = self.content[self.position..]
                    .find('>')
                    .map(|i| self.position + i)
                    .unwrap_or(self.content.len());
                if !self.content[self.position..tag_end].ends_with('/') {
                    depth += 1;
                }
            }
            self.position += 1;
        }

        &self.content[start..self.position]
    }
}

/// Unescapes XML entities in text content.
pub fn unescape_xml(text: &str) -> String {
    text.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_escape_xml() {
        assert_eq!(escape_xml("<div>"), "&lt;div&gt;");
        assert_eq!(escape_xml("a & b"), "a &amp; b");
        assert_eq!(escape_xml("\"quoted\""), "&quot;quoted&quot;");
    }

    #[test]
    fn test_xml_builder() {
        let mut builder = XmlBuilder::new();
        builder
            .xml_declaration()
            .open_element("root", &[], false)
            .text_element("child", &[("attr", "value")], "content")
            .close_element("root");

        let xml = builder.build();
        assert!(xml.contains("<?xml"));
        assert!(xml.contains("<root>"));
        assert!(xml.contains("attr=\"value\""));
        assert!(xml.contains("content"));
        assert!(xml.contains("</root>"));
    }

    #[test]
    fn test_unescape_xml() {
        assert_eq!(unescape_xml("&lt;div&gt;"), "<div>");
        assert_eq!(unescape_xml("a &amp; b"), "a & b");
    }
}
