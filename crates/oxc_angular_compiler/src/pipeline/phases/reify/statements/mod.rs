//! Statement generation helpers for the reify phase.
//!
//! This module contains functions that generate Angular runtime instruction calls
//! (e.g., ɵɵelementStart, ɵɵproperty, ɵɵtext, etc.) as Output AST statements.

mod bindings;
mod control_flow;
mod defer;
mod elements;
mod i18n;
mod misc;

pub use bindings::*;
pub use control_flow::*;
pub use defer::*;
pub use elements::*;
pub use i18n::*;
pub use misc::*;
