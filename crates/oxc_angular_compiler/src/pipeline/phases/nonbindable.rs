//! Nonbindable phase.
//!
//! Handles the ngNonBindable directive. When a container is marked with
//! `ngNonBindable`, the non-bindable characteristic applies to all descendants.
//! This phase emits `disableBindings` and `enableBindings` instructions for
//! every such container.
//!
//! Ported from Angular's `template/pipeline/src/phases/nonbindable.ts`.

use rustc_hash::FxHashSet;

use crate::ir::ops::{CreateOp, CreateOpBase, DisableBindingsOp, EnableBindingsOp, XrefId};
use crate::pipeline::compilation::ComponentCompilationJob;

/// Disables bindings for ngNonBindable elements.
///
/// This phase:
/// 1. Builds a set of element/container xrefs that have nonBindable=true
/// 2. Inserts DisableBindings after each nonBindable element/container start
/// 3. Inserts EnableBindings before each corresponding end op
pub fn disable_bindings(job: &mut ComponentCompilationJob<'_>) {
    // First pass: collect xrefs of non-bindable elements/containers
    let mut non_bindable_xrefs = FxHashSet::default();

    // Collect from root view
    collect_non_bindable_xrefs(&job.root.create, &mut non_bindable_xrefs);

    // Collect from other views
    let view_xrefs: Vec<XrefId> = job.views.keys().copied().collect();
    for view_xref in &view_xrefs {
        if let Some(view) = job.view(*view_xref) {
            collect_non_bindable_xrefs(&view.create, &mut non_bindable_xrefs);
        }
    }

    // If no non-bindable elements, nothing to do
    if non_bindable_xrefs.is_empty() {
        return;
    }

    // Second pass: insert DisableBindings/EnableBindings ops
    insert_binding_ops(&mut job.root.create, &non_bindable_xrefs);

    for view_xref in view_xrefs {
        if let Some(view) = job.view_mut(view_xref) {
            insert_binding_ops(&mut view.create, &non_bindable_xrefs);
        }
    }
}

/// Collects xrefs of elements/containers with non_bindable=true.
fn collect_non_bindable_xrefs(
    list: &crate::ir::list::CreateOpList<'_>,
    xrefs: &mut FxHashSet<XrefId>,
) {
    for op in list.iter() {
        match op {
            CreateOp::ElementStart(e) if e.non_bindable => {
                xrefs.insert(e.xref);
            }
            CreateOp::ContainerStart(c) if c.non_bindable => {
                xrefs.insert(c.xref);
            }
            // Note: Element and Container (self-closing) ops don't need
            // binding control since there's no content between start/end.
            _ => {}
        }
    }
}

/// Inserts DisableBindings after start ops and EnableBindings before end ops.
fn insert_binding_ops(
    list: &mut crate::ir::list::CreateOpList<'_>,
    non_bindable_xrefs: &FxHashSet<XrefId>,
) {
    if list.is_empty() {
        return;
    }

    // We need to collect insertion points first, then apply them.
    // Using a two-phase approach to avoid borrowing issues.

    use std::ptr::NonNull;

    // Phase 1: Collect insertion points
    // (op_ptr, insert_type) where insert_type: true = insert_after, false = insert_before
    let mut insertions: Vec<(NonNull<CreateOp<'_>>, XrefId, bool)> = Vec::new();

    let mut cursor = list.cursor_front();
    loop {
        if let Some(ptr) = cursor.current_ptr() {
            // SAFETY: pointer is valid from cursor
            let op = unsafe { ptr.as_ref() };
            match op {
                CreateOp::ElementStart(e) if non_bindable_xrefs.contains(&e.xref) => {
                    // Insert DisableBindings after this op
                    insertions.push((ptr, e.xref, true));
                }
                CreateOp::ContainerStart(c) if non_bindable_xrefs.contains(&c.xref) => {
                    // Insert DisableBindings after this op
                    insertions.push((ptr, c.xref, true));
                }
                CreateOp::ElementEnd(e) if non_bindable_xrefs.contains(&e.xref) => {
                    // Insert EnableBindings before this op
                    insertions.push((ptr, e.xref, false));
                }
                CreateOp::ContainerEnd(c) if non_bindable_xrefs.contains(&c.xref) => {
                    // Insert EnableBindings before this op
                    insertions.push((ptr, c.xref, false));
                }
                _ => {}
            }
        }

        if !cursor.move_next() {
            break;
        }
    }

    // Phase 2: Apply insertions
    // Process in reverse order for insert_before to maintain correct positions
    for (ptr, xref, is_after) in insertions.into_iter().rev() {
        if is_after {
            let disable_op = CreateOp::DisableBindings(DisableBindingsOp {
                base: CreateOpBase::default(),
                xref,
            });
            // SAFETY: ptr is valid from our cursor traversal
            unsafe { list.insert_after(ptr, disable_op) };
        } else {
            let enable_op =
                CreateOp::EnableBindings(EnableBindingsOp { base: CreateOpBase::default(), xref });
            // SAFETY: ptr is valid from our cursor traversal
            unsafe { list.insert_before(ptr, enable_op) };
        }
    }
}
