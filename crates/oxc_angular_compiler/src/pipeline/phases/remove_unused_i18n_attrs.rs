//! Remove unused i18n attributes phase.
//!
//! i18nAttributes ops will be generated for each i18n attribute. However, not all i18n attributes
//! will contain dynamic content, and so some of these i18nAttributes ops may be unnecessary.
//!
//! Ported from Angular's `template/pipeline/src/phases/remove_unused_i18n_attrs.ts`.

use std::ptr::NonNull;

use rustc_hash::FxHashSet;

use crate::ir::ops::{CreateOp, UpdateOp, XrefId};
use crate::pipeline::compilation::ComponentCompilationJob;

/// Removes unused i18n attribute operations.
///
/// This phase removes I18nAttributes ops that have no corresponding I18nExpression ops
/// (i.e., they have no dynamic bindings).
pub fn remove_unused_i18n_attributes_ops(job: &mut ComponentCompilationJob<'_>) {
    // Process root view
    remove_unused_i18n_attrs_in_view(job, job.root.xref);

    // Process all other views
    let view_xrefs: Vec<XrefId> = job.views.keys().copied().collect();
    for xref in view_xrefs {
        remove_unused_i18n_attrs_in_view(job, xref);
    }
}

/// Removes unused i18n attribute ops in a single view.
fn remove_unused_i18n_attrs_in_view(job: &mut ComponentCompilationJob<'_>, view_xref: XrefId) {
    // Collect i18n owners that have I18nExpression ops
    let mut owners_with_i18n_expressions: FxHashSet<XrefId> = FxHashSet::default();

    {
        let view = if view_xref.0 == 0 { Some(&job.root) } else { job.view(view_xref) };

        if let Some(view) = view {
            for op in view.update.iter() {
                if let UpdateOp::I18nExpression(i18n_expr) = op {
                    owners_with_i18n_expressions.insert(i18n_expr.i18n_owner);
                }
            }
        }
    }

    // Collect I18nAttributes ops to remove (those without I18nExpression ops)
    let mut ops_to_remove: Vec<NonNull<CreateOp<'_>>> = Vec::new();

    {
        let view = if view_xref.0 == 0 { Some(&job.root) } else { job.view(view_xref) };

        if let Some(view) = view {
            for op in view.create.iter() {
                if let CreateOp::I18nAttributes(i18n_attrs) = op {
                    if !owners_with_i18n_expressions.contains(&i18n_attrs.xref) {
                        ops_to_remove.push(NonNull::from(op));
                    }
                }
            }
        }
    }

    // Remove the ops
    for op_ptr in ops_to_remove {
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
}
