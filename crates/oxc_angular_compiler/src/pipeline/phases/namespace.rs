//! Namespace change phase.
//!
//! Emits namespace change operations for SVG/MathML elements.
//!
//! When the template contains SVG or MathML elements, we need to emit
//! namespace change instructions to ensure proper DOM creation.
//!
//! Ported from Angular's `template/pipeline/src/phases/namespace.ts`.

use std::ptr::NonNull;

use crate::ir::enums::Namespace;
use crate::ir::ops::{CreateOp, CreateOpBase, NamespaceOp, XrefId};
use crate::pipeline::compilation::ComponentCompilationJob;

/// Emits namespace changes for SVG and MathML elements.
///
/// This phase:
/// 1. Tracks the current namespace as we traverse elements
/// 2. Inserts Namespace ops when transitioning between namespaces
pub fn emit_namespace_changes(job: &mut ComponentCompilationJob<'_>) {
    // Process root view
    emit_namespace_changes_in_view(job, job.root.xref);

    // Process all embedded views
    let view_xrefs: Vec<XrefId> = job.views.keys().copied().collect();
    for xref in view_xrefs {
        emit_namespace_changes_in_view(job, xref);
    }
}

/// Emit namespace changes within a single view.
fn emit_namespace_changes_in_view(job: &mut ComponentCompilationJob<'_>, view_xref: XrefId) {
    // Collect ElementStart ops that need namespace change ops inserted before them
    // (pointer to element, namespace to switch to)
    let mut namespace_changes: Vec<(NonNull<CreateOp<'_>>, Namespace)> = Vec::new();

    {
        let view = if view_xref.0 == 0 { Some(&job.root) } else { job.view(view_xref) };

        if let Some(view) = view {
            let mut active_namespace = Namespace::Html;

            for op in view.create.iter() {
                // Only check ElementStart ops (not Element or ElementEnd)
                if let CreateOp::ElementStart(el) = op {
                    if el.namespace != active_namespace {
                        namespace_changes.push((NonNull::from(op), el.namespace));
                        active_namespace = el.namespace;
                    }
                }
            }
        }
    }

    // Insert namespace change ops before the collected elements
    for (element_ptr, namespace) in namespace_changes {
        let namespace_op =
            CreateOp::Namespace(NamespaceOp { base: CreateOpBase::default(), active: namespace });

        if view_xref.0 == 0 {
            // SAFETY: element_ptr is a valid pointer we obtained from iteration
            unsafe {
                job.root.create.insert_before(element_ptr, namespace_op);
            }
        } else if let Some(view) = job.view_mut(view_xref) {
            unsafe {
                view.create.insert_before(element_ptr, namespace_op);
            }
        }
    }
}
