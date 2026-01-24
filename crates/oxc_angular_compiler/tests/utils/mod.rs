//! Test utilities for Angular compiler tests.
//!
//! These utilities are ported from Angular's test helpers in
//! `test/expression_parser/utils/` and `test/render3/view/util.ts`.

mod unparser;

pub use unparser::unparse;
