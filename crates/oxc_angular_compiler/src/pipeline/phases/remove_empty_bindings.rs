//! Remove empty bindings phase.
//!
//! Removes binding operations with no effect.
//!
//! Bindings with no content (EmptyExpr) can be safely deleted.
//!
//! Ported from Angular's `template/pipeline/src/phases/remove_empty_bindings.ts`.

use std::ptr::NonNull;

use crate::ir::enums::BindingKind;
use crate::ir::ops::{UpdateOp, XrefId};
use crate::pipeline::compilation::ComponentCompilationJob;

/// Removes empty or no-op binding operations.
///
/// This phase removes update ops with `EmptyExpr` expressions for:
/// - Attribute
/// - Binding
/// - ClassProp
/// - ClassMap
/// - Property
/// - StyleProp
/// - StyleMap
pub fn remove_empty_bindings(job: &mut ComponentCompilationJob<'_>) {
    // Process root view
    remove_empty_bindings_in_view(job, job.root.xref);

    // Process all other views
    let view_xrefs: Vec<XrefId> = job.views.keys().copied().collect();
    for xref in view_xrefs {
        remove_empty_bindings_in_view(job, xref);
    }
}

/// Removes empty bindings in a single view.
fn remove_empty_bindings_in_view(job: &mut ComponentCompilationJob<'_>, view_xref: XrefId) {
    // Collect pointers to ops that should be removed
    let mut ops_to_remove: Vec<NonNull<UpdateOp<'_>>> = Vec::new();

    {
        let view = if view_xref.0 == 0 { Some(&job.root) } else { job.view(view_xref) };

        if let Some(view) = view {
            for op in view.update.iter() {
                if should_remove_binding(op) {
                    ops_to_remove.push(NonNull::from(op));
                }
            }
        }
    }

    // Remove the collected ops
    for op_ptr in ops_to_remove {
        if view_xref.0 == 0 {
            // SAFETY: op_ptr is a valid pointer we obtained from iteration
            unsafe {
                job.root.update.remove(op_ptr);
            }
        } else if let Some(view) = job.view_mut(view_xref) {
            unsafe {
                view.update.remove(op_ptr);
            }
        }
    }
}

/// Check if a binding operation should be removed (has EmptyExpr).
///
/// Note: Animation bindings with empty expressions should NOT be removed.
/// They produce `ɵɵproperty("@animationName", undefined)` calls in the output.
fn should_remove_binding(op: &UpdateOp<'_>) -> bool {
    match op {
        UpdateOp::Attribute(attr) => attr.expression.is_empty(),
        UpdateOp::Binding(binding) => {
            // Don't remove animation bindings - they should emit undefined
            if matches!(binding.kind, BindingKind::Animation | BindingKind::LegacyAnimation) {
                return false;
            }
            binding.expression.is_empty()
        }
        UpdateOp::ClassProp(class) => class.expression.is_empty(),
        UpdateOp::ClassMap(class_map) => class_map.expression.is_empty(),
        UpdateOp::Property(prop) => {
            // Don't remove animation bindings - they should emit undefined
            if matches!(prop.binding_kind, BindingKind::Animation | BindingKind::LegacyAnimation) {
                return false;
            }
            prop.expression.is_empty()
        }
        UpdateOp::StyleProp(style) => style.expression.is_empty(),
        UpdateOp::StyleMap(style_map) => style_map.expression.is_empty(),
        _ => false,
    }
}
