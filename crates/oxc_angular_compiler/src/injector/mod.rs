//! Injector compilation module.
//!
//! This module provides compilation support for Angular injectors,
//! ported from Angular's `render3/r3_injector_compiler.ts`.
//!
//! Injectors aggregate providers and imported modules into a DI container.
//! This is one of the simplest compilation tasks - it just builds a
//! definition map with providers and imports, then calls `ɵɵdefineInjector()`.

mod compiler;
mod metadata;

pub use compiler::{InjectorCompileResult, compile_injector, compile_injector_from_metadata};
pub use metadata::{R3InjectorMetadata, R3InjectorMetadataBuilder};
