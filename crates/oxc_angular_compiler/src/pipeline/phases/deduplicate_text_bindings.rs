//! Deduplicate text bindings phase.
//!
//! Removes duplicate text binding operations, e.g., `<div class="cls1" class="cls2">`.
//!
//! This phase iterates through update operations in reverse order and removes duplicate
//! text attribute bindings. In TemplateDefinitionBuilder compatibility mode, only `style`
//! and `class` duplicates are removed to match legacy behavior.
//!
//! Ported from Angular's `template/pipeline/src/phases/deduplicate_text_bindings.ts`.

use rustc_hash::{FxHashMap, FxHashSet};

use crate::ir::enums::CompatibilityMode;
use crate::ir::ops::{UpdateOp, XrefId};
use crate::pipeline::compilation::{ComponentCompilationJob, HostBindingCompilationJob};

/// Deduplicates text binding operations.
///
/// This phase removes duplicate text attribute bindings that would produce
/// redundant code. In TemplateDefinitionBuilder mode, for `style` and `class`
/// attributes, only the last occurrence is kept (matching legacy behavior).
pub fn deduplicate_text_bindings(job: &mut ComponentCompilationJob<'_>) {
    let compatibility_mode = job.compatibility_mode;

    // Process root view
    deduplicate_in_view(&mut job.root.update, compatibility_mode);

    // Process embedded views
    for view in job.views.values_mut() {
        deduplicate_in_view(&mut view.update, compatibility_mode);
    }
}

/// Deduplicates text bindings within a single view's update list.
fn deduplicate_in_view<'a>(
    update_ops: &mut crate::ir::list::UpdateOpList<'a>,
    compatibility_mode: CompatibilityMode,
) {
    // Map from target element XrefId to set of seen binding names
    let mut seen: FxHashMap<XrefId, FxHashSet<&str>> = FxHashMap::default();

    // Collect pointers to operations that need to be removed
    let mut to_remove: Vec<std::ptr::NonNull<UpdateOp<'a>>> = Vec::new();

    // First pass: iterate in reverse to find duplicates
    // We iterate forward but track operations to remove, then remove them
    // The "last" binding (first in reverse order) is kept
    let mut cursor = update_ops.cursor();

    // Move to the end of the list
    while cursor.move_next() {}

    // Now iterate backwards
    while cursor.move_prev() {
        if let Some(UpdateOp::Binding(binding)) = cursor.current() {
            if binding.is_text_attribute {
                let entry = seen.entry(binding.target).or_default();
                let name = binding.name.as_str();

                if entry.contains(name) {
                    // This is a duplicate - check if we should remove it
                    match compatibility_mode {
                        CompatibilityMode::TemplateDefinitionBuilder => {
                            // In TDB mode, only remove style/class duplicates
                            // to match legacy behavior
                            if name == "style" || name == "class" {
                                if let Some(ptr) = cursor.current_ptr() {
                                    to_remove.push(ptr);
                                }
                            }
                        }
                        CompatibilityMode::Normal => {
                            // In normal mode, we don't remove duplicates
                            // TODO: Consider throwing an error as HTML doesn't permit
                            // duplicate attributes, or merge style/class values
                        }
                    }
                } else {
                    entry.insert(name);
                }
            }
        }
    }

    // Second pass: remove the marked operations
    for ptr in to_remove {
        // SAFETY: The pointer was obtained from a valid operation in this list
        // and we haven't modified the list between gathering pointers and removing
        unsafe {
            update_ops.remove(ptr);
        }
    }
}

/// Deduplicates text binding operations for host binding compilation.
///
/// Host version - only processes the root unit (no embedded views).
pub fn deduplicate_text_bindings_for_host(job: &mut HostBindingCompilationJob<'_>) {
    let compatibility_mode = job.compatibility_mode;
    deduplicate_in_view(&mut job.root.update, compatibility_mode);
}
