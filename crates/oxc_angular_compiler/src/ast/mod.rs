//! AST definitions for the Angular compiler.
//!
//! This module contains all AST node types used throughout the Angular
//! compilation pipeline:
//!
//! - [`expression`]: Angular binding expression AST (PropertyRead, Binary, Pipe, etc.)
//! - [`html`]: HTML template AST (Element, Attribute, Text, Block)
//! - [`r3`]: R3 intermediate AST (BoundText, BoundAttribute, Template, etc.)
//! - [`output`]: Output AST for code generation

pub mod expression;
pub mod html;
// pub mod output;
pub mod r3;
