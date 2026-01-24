//! I18n HTML parser wrapper.
//!
//! This module wraps the HTML parser to support i18n translation loading and merging.
//!
//! Ported from Angular's `i18n/i18n_html_parser.ts`.

use crate::i18n::Message;
use crate::i18n::digest::compute_digest;
use crate::i18n::serializers::{
    Serializer, SerializerError, Xliff1Serializer, Xliff2Serializer, XmbSerializer, XtbSerializer,
};
use crate::i18n::translation_bundle::TranslationBundle;

/// Strategy for handling missing translations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum MissingTranslationStrategy {
    /// Report an error when a translation is missing.
    Error,
    /// Report a warning when a translation is missing.
    #[default]
    Warning,
    /// Silently ignore missing translations.
    Ignore,
}

/// Options for the I18n HTML parser.
#[derive(Debug, Clone, Default)]
pub struct I18nHtmlParserOptions {
    /// The translation file content.
    pub translations: Option<String>,
    /// The translation file format (xlf, xlf2, xmb, xtb).
    pub translations_format: Option<String>,
    /// Strategy for handling missing translations.
    pub missing_translation: MissingTranslationStrategy,
    /// The locale.
    pub locale: Option<String>,
}

/// I18n HTML parser that wraps the standard HTML parser with translation support.
pub struct I18nHtmlParser {
    /// The translation bundle.
    translation_bundle: TranslationBundle,
}

impl I18nHtmlParser {
    /// Creates a new I18n HTML parser.
    pub fn new(options: I18nHtmlParserOptions) -> Result<Self, SerializerError> {
        let translation_bundle = if let Some(translations) = options.translations {
            let serializer = create_serializer(options.translations_format.as_deref());
            TranslationBundle::load(
                &translations,
                "i18n",
                serializer.as_ref(),
                options.missing_translation,
                options.locale,
            )?
        } else {
            TranslationBundle::new_empty(
                compute_digest,
                options.missing_translation,
                options.locale,
            )
        };

        Ok(Self { translation_bundle })
    }

    /// Returns a reference to the translation bundle.
    pub fn translation_bundle(&self) -> &TranslationBundle {
        &self.translation_bundle
    }

    /// Returns a mutable reference to the translation bundle.
    pub fn translation_bundle_mut(&mut self) -> &mut TranslationBundle {
        &mut self.translation_bundle
    }

    /// Gets the translation for a message.
    pub fn get_translation(&self, message: &Message) -> Option<String> {
        self.translation_bundle.get(message)
    }

    /// Checks if a translation exists for the message.
    pub fn has_translation(&self, message: &Message) -> bool {
        self.translation_bundle.has(message)
    }
}

/// Creates a serializer based on the format string.
fn create_serializer(format: Option<&str>) -> Box<dyn Serializer> {
    let format = format.unwrap_or("xlf").to_lowercase();

    match format.as_str() {
        "xmb" => Box::new(XmbSerializer::new()),
        "xtb" => Box::new(XtbSerializer::new()),
        "xliff2" | "xlf2" => Box::new(Xliff2Serializer::new()),
        "xliff" | "xlf" | _ => Box::new(Xliff1Serializer::new()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_missing_translation_strategy_default() {
        let strategy = MissingTranslationStrategy::default();
        assert_eq!(strategy, MissingTranslationStrategy::Warning);
    }
}
