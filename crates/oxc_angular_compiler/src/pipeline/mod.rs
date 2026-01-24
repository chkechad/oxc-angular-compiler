//! Template compilation pipeline.
//!
//! This module orchestrates the template compilation process:
//!
//! 1. Template ingestion (R3 AST → IR)
//! 2. 66 transformation phases
//! 3. Code emission (IR → Output AST → JavaScript)
//!
//! Key components:
//!
//! - [`compilation`]: CompilationJob and ViewCompilationUnit
//! - [`constant_pool`]: Constant deduplication
//! - [`expression_store`]: Expression storage with Reference + Index pattern
//! - [`ingest`]: Template ingestion from R3 AST
//! - [`phases`]: The 66 transformation phases
//! - [`emit`]: Final code emission

pub mod compilation;
pub mod constant_pool;
pub mod conversion;
pub mod emit;
pub mod expression_store;
pub mod ingest;
pub mod phases;
pub mod selector;
