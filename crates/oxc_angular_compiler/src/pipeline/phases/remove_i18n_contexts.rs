//! Remove i18n contexts phase.
//!
//! Remove the i18n context ops after they are no longer needed, and null out references to them to
//! be safe.
//!
//! Ported from Angular's `template/pipeline/src/phases/remove_i18n_contexts.ts`.

use std::ptr::NonNull;

use crate::ir::ops::{CreateOp, XrefId};
use crate::pipeline::compilation::ComponentCompilationJob;

/// Removes i18n context ops after processing.
///
/// This phase removes I18nContext ops and nulls out the context field on I18nStart ops.
pub fn remove_i18n_contexts(job: &mut ComponentCompilationJob<'_>) {
    // Process root view
    remove_i18n_contexts_in_view(job, job.root.xref);

    // Process all other views
    let view_xrefs: Vec<XrefId> = job.views.keys().copied().collect();
    for xref in view_xrefs {
        remove_i18n_contexts_in_view(job, xref);
    }
}

/// Removes i18n context ops in a single view.
fn remove_i18n_contexts_in_view(job: &mut ComponentCompilationJob<'_>, view_xref: XrefId) {
    // Collect I18nContext ops to remove
    let mut context_ops_to_remove: Vec<NonNull<CreateOp<'_>>> = Vec::new();

    {
        let view = if view_xref.0 == 0 { Some(&job.root) } else { job.view(view_xref) };

        if let Some(view) = view {
            for op in view.create.iter() {
                if matches!(op, CreateOp::I18nContext(_)) {
                    context_ops_to_remove.push(NonNull::from(op));
                }
            }
        }
    }

    // Remove the I18nContext ops
    for op_ptr in context_ops_to_remove {
        if view_xref.0 == 0 {
            // SAFETY: op_ptr is a valid pointer we obtained from iteration
            unsafe {
                job.root.create.remove(op_ptr);
            }
        } else if let Some(view) = job.view_mut(view_xref) {
            unsafe {
                view.create.remove(op_ptr);
            }
        }
    }

    // Null out context references on I18nStart ops
    if view_xref.0 == 0 {
        for op in job.root.create.iter_mut() {
            if let CreateOp::I18nStart(i18n_start) = op {
                i18n_start.context = None;
            }
        }
    } else if let Some(view) = job.view_mut(view_xref) {
        for op in view.create.iter_mut() {
            if let CreateOp::I18nStart(i18n_start) = op {
                i18n_start.context = None;
            }
        }
    }
}
