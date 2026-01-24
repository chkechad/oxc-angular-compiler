//! Injector metadata structures.
//!
//! Ported from Angular's `render3/r3_injector_compiler.ts`.

use oxc_allocator::Vec;
use oxc_span::Atom;

use crate::output::ast::OutputExpression;

/// Metadata needed to compile an injector.
///
/// Corresponds to Angular's `R3InjectorMetadata` interface.
/// This is one of the simplest metadata structures in the compiler.
#[derive(Debug)]
pub struct R3InjectorMetadata<'a> {
    /// Name of the injector type.
    pub name: Atom<'a>,

    /// An expression representing a reference to the injector class.
    pub r#type: OutputExpression<'a>,

    /// The providers array expression.
    /// Can be None if no providers are defined.
    pub providers: Option<OutputExpression<'a>>,

    /// Imported modules/injectors.
    pub imports: Vec<'a, OutputExpression<'a>>,
}

impl<'a> R3InjectorMetadata<'a> {
    /// Check if this injector has any providers.
    pub fn has_providers(&self) -> bool {
        self.providers.is_some()
    }

    /// Check if this injector has any imports.
    pub fn has_imports(&self) -> bool {
        !self.imports.is_empty()
    }
}

/// Builder for R3InjectorMetadata.
pub struct R3InjectorMetadataBuilder<'a> {
    name: Option<Atom<'a>>,
    r#type: Option<OutputExpression<'a>>,
    providers: Option<OutputExpression<'a>>,
    imports: Vec<'a, OutputExpression<'a>>,
}

impl<'a> R3InjectorMetadataBuilder<'a> {
    /// Create a new builder.
    pub fn new(allocator: &'a oxc_allocator::Allocator) -> Self {
        Self { name: None, r#type: None, providers: None, imports: Vec::new_in(allocator) }
    }

    /// Set the injector name.
    pub fn name(mut self, name: Atom<'a>) -> Self {
        self.name = Some(name);
        self
    }

    /// Set the injector type expression.
    pub fn r#type(mut self, type_expr: OutputExpression<'a>) -> Self {
        self.r#type = Some(type_expr);
        self
    }

    /// Set the providers expression.
    pub fn providers(mut self, providers: OutputExpression<'a>) -> Self {
        self.providers = Some(providers);
        self
    }

    /// Add an import.
    pub fn add_import(mut self, import: OutputExpression<'a>) -> Self {
        self.imports.push(import);
        self
    }

    /// Build the metadata.
    ///
    /// Returns None if required fields (name, type) are missing.
    pub fn build(self) -> Option<R3InjectorMetadata<'a>> {
        let name = self.name?;
        let r#type = self.r#type?;

        Some(R3InjectorMetadata { name, r#type, providers: self.providers, imports: self.imports })
    }
}
