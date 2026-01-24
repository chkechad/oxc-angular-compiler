//! Apply i18n expressions phase.
//!
//! Adds apply operations after i18n expressions.
//!
//! Ported from Angular's `template/pipeline/src/phases/apply_i18n_expressions.ts`.

use rustc_hash::FxHashMap;

use crate::ir::ops::{CreateOp, I18nApplyOp, UpdateOp, UpdateOpBase, XrefId};
use crate::pipeline::compilation::ComponentCompilationJob;

/// Applies i18n expressions to generate runtime i18n calls.
///
/// This phase adds I18nApply ops after I18nExpression ops that need them.
pub fn apply_i18n_expressions(job: &mut ComponentCompilationJob<'_>) {
    // Collect all I18nContext ops for lookup
    let mut i18n_contexts: FxHashMap<XrefId, I18nContextInfo> = FxHashMap::default();

    // Collect from root view
    for op in job.root.create.iter() {
        if let CreateOp::I18nContext(ctx_op) = op {
            i18n_contexts.insert(ctx_op.xref, I18nContextInfo { i18n_block: ctx_op.i18n_block });
        }
    }

    // Collect from other views
    let view_xrefs: Vec<XrefId> = job.views.keys().copied().collect();
    for view_xref in &view_xrefs {
        if let Some(view) = job.view(*view_xref) {
            for op in view.create.iter() {
                if let CreateOp::I18nContext(ctx_op) = op {
                    i18n_contexts
                        .insert(ctx_op.xref, I18nContextInfo { i18n_block: ctx_op.i18n_block });
                }
            }
        }
    }

    // Process root view
    apply_i18n_expressions_in_view(job, job.root.xref, &i18n_contexts);

    // Process all other views
    for view_xref in view_xrefs {
        apply_i18n_expressions_in_view(job, view_xref, &i18n_contexts);
    }
}

/// Info about an I18nContext op.
struct I18nContextInfo {
    i18n_block: Option<XrefId>,
}

/// Applies i18n expressions in a single view.
fn apply_i18n_expressions_in_view(
    job: &mut ComponentCompilationJob<'_>,
    view_xref: XrefId,
    i18n_contexts: &FxHashMap<XrefId, I18nContextInfo>,
) {
    use std::ptr::NonNull;

    // Collect I18nExpression ops that need I18nApply ops inserted after them
    // We store (pointer to I18nExpression, I18nApplyOp to insert)
    let mut apply_ops_to_insert: Vec<(NonNull<UpdateOp<'_>>, I18nApplyOp<'_>)> = Vec::new();

    {
        let view = if view_xref.0 == 0 { Some(&job.root) } else { job.view(view_xref) };

        if let Some(view) = view {
            let mut prev_op_ptr: Option<NonNull<UpdateOp<'_>>> = None;
            let mut prev_op_ref: Option<&UpdateOp<'_>> = None;

            for op in view.update.iter() {
                // Check if the previous op was an I18nExpression that needs an apply
                if let (Some(ptr), Some(UpdateOp::I18nExpression(prev_i18n_expr))) =
                    (prev_op_ptr, prev_op_ref)
                {
                    if needs_application(i18n_contexts, prev_i18n_expr, op) {
                        let apply_op = I18nApplyOp {
                            base: UpdateOpBase { source_span: None, ..Default::default() },
                            i18n_owner: prev_i18n_expr.i18n_owner,
                            handle: prev_i18n_expr.handle,
                        };
                        // Insert after the previous I18nExpression
                        apply_ops_to_insert.push((ptr, apply_op));
                    }
                }

                prev_op_ptr = Some(NonNull::from(op));
                prev_op_ref = Some(op);
            }

            // Check if the last op was an I18nExpression that needs an apply
            if let (Some(ptr), Some(UpdateOp::I18nExpression(last_i18n_expr))) =
                (prev_op_ptr, prev_op_ref)
            {
                let apply_op = I18nApplyOp {
                    base: UpdateOpBase { source_span: None, ..Default::default() },
                    i18n_owner: last_i18n_expr.i18n_owner,
                    handle: last_i18n_expr.handle,
                };
                apply_ops_to_insert.push((ptr, apply_op));
            }
        }
    }

    // Insert the I18nApply ops after each I18nExpression
    // We iterate in reverse to avoid pointer invalidation issues
    for (expr_ptr, apply_op) in apply_ops_to_insert.into_iter().rev() {
        if view_xref.0 == 0 {
            // SAFETY: expr_ptr is a valid pointer we obtained from iteration
            unsafe {
                job.root.update.insert_after(expr_ptr, UpdateOp::I18nApply(apply_op));
            }
        } else if let Some(view) = job.view_mut(view_xref) {
            unsafe {
                view.update.insert_after(expr_ptr, UpdateOp::I18nApply(apply_op));
            }
        }
    }
}

/// Checks whether the given expression op needs to be followed with an apply op.
fn needs_application<'a>(
    i18n_contexts: &FxHashMap<XrefId, I18nContextInfo>,
    op: &crate::ir::ops::I18nExpressionOp<'a>,
    next_op: &UpdateOp<'a>,
) -> bool {
    // If the next op is not another expression, we need to apply.
    let next_i18n_expr = match next_op {
        UpdateOp::I18nExpression(expr) => expr,
        _ => return true,
    };

    let context = i18n_contexts.get(&op.context);
    let next_context = i18n_contexts.get(&next_i18n_expr.context);

    let context = match context {
        Some(c) => c,
        None => return true, // No context found, apply to be safe
    };

    let next_context = match next_context {
        Some(c) => c,
        None => return true, // No context found, apply to be safe
    };

    // If the next op is an expression targeting a different i18n block (or different element, in the
    // case of i18n attributes), we need to apply.

    // First, handle the case of i18n blocks.
    if context.i18n_block.is_some() {
        // This is a block context. Compare the blocks.
        if context.i18n_block != next_context.i18n_block {
            return true;
        }
        return false;
    }

    // Second, handle the case of i18n attributes.
    if op.i18n_owner != next_i18n_expr.i18n_owner {
        return true;
    }
    false
}
