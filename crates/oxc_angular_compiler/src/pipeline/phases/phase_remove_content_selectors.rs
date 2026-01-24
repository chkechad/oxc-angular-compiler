//! Remove content selectors phase.
//!
//! Attributes of `ng-content` named 'select' are specifically removed, because they control
//! which content matches as a property of the `projection`, and are not a plain attribute.
//!
//! Ported from Angular's `template/pipeline/src/phases/phase_remove_content_selectors.ts`.

use rustc_hash::FxHashSet;

use crate::ir::ops::{CreateOp, UpdateOp, XrefId};
use crate::pipeline::compilation::ComponentCompilationJob;

/// Removes content selector operations after processing.
///
/// This phase removes binding operations with name "select" that target ng-content
/// (Projection) elements. The "select" attribute controls content projection matching
/// and is not a regular attribute binding.
pub fn remove_content_selectors(job: &mut ComponentCompilationJob<'_>) {
    // Collect all view xrefs
    let view_xrefs: Vec<XrefId> = job.all_views().map(|v| v.xref).collect();

    for view_xref in view_xrefs {
        // First pass: build a set of xrefs that are Projection ops
        let projection_xrefs: FxHashSet<XrefId> = {
            let view = match job.view(view_xref) {
                Some(v) => v,
                None => continue,
            };

            view.create
                .iter()
                .filter_map(|op| {
                    if let CreateOp::Projection(proj) = op { Some(proj.xref) } else { None }
                })
                .collect()
        };

        // Second pass: remove Binding ops with name "select" targeting Projection ops
        if let Some(view) = job.view_mut(view_xref) {
            let mut cursor = view.update.cursor_front();
            loop {
                let should_remove = if let Some(op) = cursor.current() {
                    if let UpdateOp::Binding(binding) = op {
                        // Check if name is "select" (case-insensitive) and target is a Projection
                        is_select_attribute(&binding.name)
                            && projection_xrefs.contains(&binding.target)
                    } else {
                        false
                    }
                } else {
                    break;
                };

                if should_remove {
                    cursor.remove_current();
                    // remove_current already moves to next
                } else if !cursor.move_next() {
                    break;
                }
            }
        }
    }
}

/// Checks if the attribute name is "select" (case-insensitive).
fn is_select_attribute(name: &str) -> bool {
    name.eq_ignore_ascii_case("select")
}
