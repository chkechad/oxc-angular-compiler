//! I18n parameter value types.
//!
//! This module defines the types used to represent i18n placeholder values
//! in the IR. These values are used to build the params map for i18n messages.
//!
//! Ported from Angular's `template/pipeline/ir/src/ops/create.ts`.

use super::enums::I18nParamValueFlags;

/// The value content of an i18n parameter.
///
/// This can be a slot number or a compound value consisting of an element slot
/// and template slot.
///
/// Note: This type intentionally does not implement Drop to allow arena allocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum I18nParamValueContent {
    /// A slot number reference.
    Slot(u32),
    /// A compound value with element and template slots.
    /// Used for structural directives where both element and template need tracking.
    Compound {
        /// The element slot number.
        element: u32,
        /// The template slot number.
        template: u32,
    },
}

impl I18nParamValueContent {
    /// Create a slot value.
    pub const fn slot(slot: u32) -> Self {
        Self::Slot(slot)
    }

    /// Create a compound value.
    pub const fn compound(element: u32, template: u32) -> Self {
        Self::Compound { element, template }
    }
}

/// Represents a single value in an i18n param map.
///
/// Each placeholder in the map may have multiple of these values associated with it.
/// For example, an element tag will have both an opening and closing value.
///
/// Note: This type intentionally does not implement Drop to allow arena allocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct I18nParamValue {
    /// The value. This can be a slot number or compound value
    /// consisting of an element slot number and template slot number.
    pub value: I18nParamValueContent,

    /// The sub-template index associated with the value.
    /// This is used for nested templates within i18n blocks.
    pub sub_template_index: Option<u32>,

    /// Flags associated with the value.
    /// These determine how the value is serialized into the final map.
    pub flags: I18nParamValueFlags,
}

impl I18nParamValue {
    /// Create a new I18nParamValue.
    pub fn new(
        value: I18nParamValueContent,
        sub_template_index: Option<u32>,
        flags: I18nParamValueFlags,
    ) -> Self {
        Self { value, sub_template_index, flags }
    }

    /// Create a param value for an element start tag.
    pub fn element_start(slot: u32, sub_template_index: Option<u32>) -> Self {
        Self::new(
            I18nParamValueContent::Slot(slot),
            sub_template_index,
            I18nParamValueFlags::ELEMENT_TAG.with(I18nParamValueFlags::OPEN_TAG),
        )
    }

    /// Create a param value for an element end tag.
    pub fn element_end(slot: u32, sub_template_index: Option<u32>) -> Self {
        Self::new(
            I18nParamValueContent::Slot(slot),
            sub_template_index,
            I18nParamValueFlags::ELEMENT_TAG.with(I18nParamValueFlags::CLOSE_TAG),
        )
    }

    /// Create a param value for a template start tag.
    pub fn template_start(slot: u32, sub_template_index: Option<u32>) -> Self {
        Self::new(
            I18nParamValueContent::Slot(slot),
            sub_template_index,
            I18nParamValueFlags::TEMPLATE_TAG.with(I18nParamValueFlags::OPEN_TAG),
        )
    }

    /// Create a param value for a template end tag.
    pub fn template_end(slot: u32, sub_template_index: Option<u32>) -> Self {
        Self::new(
            I18nParamValueContent::Slot(slot),
            sub_template_index,
            I18nParamValueFlags::TEMPLATE_TAG.with(I18nParamValueFlags::CLOSE_TAG),
        )
    }

    /// Create a param value for an expression.
    pub fn expression(index: u32, sub_template_index: Option<u32>) -> Self {
        Self::new(
            I18nParamValueContent::Slot(index),
            sub_template_index,
            I18nParamValueFlags::EXPRESSION_INDEX,
        )
    }

    /// Check if this is an element tag.
    pub fn is_element_tag(&self) -> bool {
        self.flags.contains(I18nParamValueFlags::ELEMENT_TAG)
    }

    /// Check if this is a template tag.
    pub fn is_template_tag(&self) -> bool {
        self.flags.contains(I18nParamValueFlags::TEMPLATE_TAG)
    }

    /// Check if this is an opening tag.
    pub fn is_open_tag(&self) -> bool {
        self.flags.contains(I18nParamValueFlags::OPEN_TAG)
    }

    /// Check if this is a closing tag.
    pub fn is_close_tag(&self) -> bool {
        self.flags.contains(I18nParamValueFlags::CLOSE_TAG)
    }

    /// Check if this is an expression index.
    pub fn is_expression(&self) -> bool {
        self.flags.contains(I18nParamValueFlags::EXPRESSION_INDEX)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_element_start() {
        let value = I18nParamValue::element_start(0, None);
        assert!(value.is_element_tag());
        assert!(value.is_open_tag());
        assert!(!value.is_close_tag());
        assert!(!value.is_template_tag());
    }

    #[test]
    fn test_element_end() {
        let value = I18nParamValue::element_end(0, None);
        assert!(value.is_element_tag());
        assert!(value.is_close_tag());
        assert!(!value.is_open_tag());
    }

    #[test]
    fn test_template_start() {
        let value = I18nParamValue::template_start(1, Some(0));
        assert!(value.is_template_tag());
        assert!(value.is_open_tag());
        assert_eq!(value.sub_template_index, Some(0));
    }

    #[test]
    fn test_expression() {
        let value = I18nParamValue::expression(5, None);
        assert!(value.is_expression());
        assert!(!value.is_element_tag());
        assert!(!value.is_template_tag());
    }

    #[test]
    fn test_compound_value() {
        let value = I18nParamValue::new(
            I18nParamValueContent::compound(1, 2),
            None,
            I18nParamValueFlags::ELEMENT_TAG
                .with(I18nParamValueFlags::TEMPLATE_TAG)
                .with(I18nParamValueFlags::OPEN_TAG),
        );
        assert!(value.is_element_tag());
        assert!(value.is_template_tag());
        assert!(value.is_open_tag());
        match &value.value {
            I18nParamValueContent::Compound { element, template } => {
                assert_eq!(*element, 1);
                assert_eq!(*template, 2);
            }
            _ => panic!("Expected compound value"),
        }
    }
}
