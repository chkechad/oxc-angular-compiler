//! Intermediate Representation for the Angular template compiler.
//!
//! The IR represents a template as a sequence of operations that can be
//! transformed through 67 compilation phases before being converted to
//! executable JavaScript.
//!
//! This module contains:
//!
//! - [`enums`]: Operation and expression kind enumerations
//! - [`expression`]: IR expression types
//! - [`i18n_params`]: I18n parameter value types
//! - [`ops`]: Create and Update operations
//! - [`list`]: OpList doubly-linked list container

pub mod enums;
pub mod expression;
pub mod i18n_params;
pub mod list;
pub mod ops;
