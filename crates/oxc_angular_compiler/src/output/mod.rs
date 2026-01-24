//! Output AST and JavaScript emitter for Angular template compilation.
//!
//! This module contains:
//! - [`ast`]: Output AST types that represent JavaScript code
//! - [`emitter`]: JavaScript code emitter
//! - [`oxc_converter`]: OXC Expression to OutputExpression converter
//!
//! Ported from Angular's `output/output_ast.ts` and `output/abstract_emitter.ts`.

pub mod ast;
pub mod emitter;
pub mod oxc_converter;
