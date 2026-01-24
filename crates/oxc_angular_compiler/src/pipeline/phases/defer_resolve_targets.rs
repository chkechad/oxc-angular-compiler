//! Defer target resolution phase.
//!
//! Resolves defer block target names for viewport/interaction/hover triggers.
//!
//! When a defer trigger targets a specific element (e.g., `@defer (on viewport(target))`),
//! this phase resolves the target name to an element XrefId.
//!
//! The algorithm:
//! 1. Collects all local references (#refName) from elements in each view
//! 2. For each DeferOnOp with a target_name, traverses parent views to find the reference
//! 3. Sets target_xref, target_view, target_slot, and target_slot_view_steps
//! 4. For null target_name, defaults to first element in placeholder (or main for HYDRATE)
//!
//! Ported from Angular's `template/pipeline/src/phases/defer_resolve_targets.ts`.

use oxc_diagnostics::OxcDiagnostic;
use rustc_hash::FxHashMap;

use crate::ir::enums::{DeferOpModifierKind, DeferTriggerKind};
use crate::ir::ops::{CreateOp, XrefId};
use crate::pipeline::compilation::ComponentCompilationJob;

/// Target information for resolving defer triggers.
/// Note: We only store xref here since slots are not allocated yet during this phase.
/// The slot will be resolved during the allocate_slots phase.
#[derive(Debug, Clone)]
struct TargetInfo {
    /// The xref of the target element.
    xref: XrefId,
}

/// Information about a DeferOp for trigger resolution.
#[derive(Debug, Clone)]
struct DeferInfo {
    /// Main content view xref.
    main_view: Option<XrefId>,
    /// Placeholder view xref.
    placeholder_view: Option<XrefId>,
}

/// Resolves target names for defer blocks.
///
/// This phase:
/// 1. Collects all local references (#refName) from elements in each view
/// 2. For each DeferOnOp with a target_name, resolves it to a target_xref
/// 3. For null target_name, defaults to first element in placeholder/main view
/// 4. Handles HYDRATE modifier by searching main view instead of placeholder
pub fn resolve_defer_target_names(job: &mut ComponentCompilationJob<'_>) {
    let mut diagnostics = Vec::new();
    // Collect local refs per view - maps ref name to (xref, slot)
    // Only include refs with empty target (matching TS: if (ref.target !== "") continue;)
    let view_refs: FxHashMap<XrefId, FxHashMap<String, TargetInfo>> = job
        .all_views()
        .map(|view| {
            let refs: FxHashMap<String, TargetInfo> = view
                .create
                .iter()
                .flat_map(|op| -> Vec<(String, TargetInfo)> {
                    // Extract local refs from elements - only those with empty target
                    match op {
                        CreateOp::ElementStart(el) => el
                            .local_refs
                            .iter()
                            .filter(|lr| lr.target.is_empty())
                            .map(|lr| (lr.name.to_string(), TargetInfo { xref: el.xref }))
                            .collect(),
                        CreateOp::Element(el) => el
                            .local_refs
                            .iter()
                            .filter(|lr| lr.target.is_empty())
                            .map(|lr| (lr.name.to_string(), TargetInfo { xref: el.xref }))
                            .collect(),
                        _ => vec![],
                    }
                })
                .collect();
            (view.xref, refs)
        })
        .collect();

    // Build parent view mapping for traversal
    let parent_views: FxHashMap<XrefId, XrefId> =
        job.views.iter().filter_map(|(xref, view)| view.parent.map(|p| (*xref, p))).collect();

    // Collect first element/container in each view for null target_name handling.
    // Angular checks `hasConsumesSlotTrait(op) && (isElementOrContainerOp(op) || op.kind === Projection)`.
    // The consumes_slot_trait check ensures we only target ops that actually consume a slot.
    let first_elements: FxHashMap<XrefId, TargetInfo> = job
        .all_views()
        .filter_map(|view| {
            for op in view.create.iter() {
                // Check both consumes_slot_trait AND is element/container/projection
                // This matches Angular's: hasConsumesSlotTrait(placeholderOp) &&
                //   (isElementOrContainerOp(placeholderOp) || placeholderOp.kind === OpKind.Projection)
                if !has_consumes_slot_trait(op) {
                    continue;
                }
                match op {
                    CreateOp::ElementStart(el) => {
                        return Some((view.xref, TargetInfo { xref: el.xref }));
                    }
                    CreateOp::Element(el) => {
                        return Some((view.xref, TargetInfo { xref: el.xref }));
                    }
                    CreateOp::ContainerStart(c) => {
                        return Some((view.xref, TargetInfo { xref: c.xref }));
                    }
                    CreateOp::Container(c) => {
                        return Some((view.xref, TargetInfo { xref: c.xref }));
                    }
                    CreateOp::Projection(p) => {
                        return Some((view.xref, TargetInfo { xref: p.xref }));
                    }
                    _ => {}
                }
            }
            None
        })
        .collect();

    // Collect DeferOp info (main_view, placeholder_view) for each defer xref
    let defer_infos: FxHashMap<XrefId, DeferInfo> = job
        .all_views()
        .flat_map(|view| {
            view.create.iter().filter_map(|op| {
                if let CreateOp::Defer(defer) = op {
                    Some((
                        defer.xref,
                        DeferInfo {
                            main_view: defer.main_view,
                            placeholder_view: defer.placeholder_view,
                        },
                    ))
                } else {
                    None
                }
            })
        })
        .collect();

    // Process DeferOn ops and resolve target names
    for view in job.all_views_mut() {
        let view_xref = view.xref;

        for op in view.create.iter_mut() {
            if let CreateOp::DeferOn(defer_on) = op {
                // Only viewport, interaction, and hover triggers need target resolution
                match defer_on.trigger {
                    DeferTriggerKind::Viewport
                    | DeferTriggerKind::Interaction
                    | DeferTriggerKind::Hover => {
                        // Get the DeferOp info
                        let defer_info = defer_infos.get(&defer_on.defer);

                        // Determine which view to search: placeholder for normal, main for HYDRATE
                        let search_view = defer_info.and_then(|info| {
                            if defer_on.modifier == DeferOpModifierKind::Hydrate {
                                info.main_view
                            } else {
                                info.placeholder_view
                            }
                        });

                        if let Some(ref target_name) = defer_on.target_name {
                            // Named target - search from placeholder/main view up through parents
                            let (start_view, start_step) = if let Some(sv) = search_view {
                                (sv, -1i32)
                            } else {
                                (view_xref, 0i32)
                            };

                            let mut current_view = start_view;
                            let mut steps = start_step;

                            loop {
                                if let Some(refs) = view_refs.get(&current_view) {
                                    if let Some(target) = refs.get(target_name.as_str()) {
                                        defer_on.target_xref = Some(target.xref);
                                        defer_on.target_view = Some(current_view);
                                        // target_slot will be resolved during allocate_slots phase
                                        defer_on.target_slot_view_steps = Some(steps);
                                        break;
                                    }
                                }

                                // Move to parent view
                                if let Some(&parent) = parent_views.get(&current_view) {
                                    current_view = parent;
                                    steps += 1;
                                } else {
                                    // Reached root without finding target
                                    break;
                                }
                            }
                        } else {
                            // Null target_name - default to first element in placeholder/main view
                            // Angular throws if no placeholder view exists for null target_name
                            if let Some(sv) = search_view {
                                if let Some(first_elem) = first_elements.get(&sv) {
                                    defer_on.target_xref = Some(first_elem.xref);
                                    defer_on.target_view = Some(sv);
                                    // target_slot will be resolved during allocate_slots phase
                                    defer_on.target_slot_view_steps = Some(-1);
                                }
                            } else {
                                // Error: defer on trigger with no target name must have a placeholder block
                                diagnostics.push(OxcDiagnostic::error(
                                    "defer on trigger with no target name must have a placeholder block",
                                ));
                            }
                        }
                    }
                    _ => {
                        // Other triggers (Idle, Immediate, Timer, Never) don't need target resolution
                    }
                }
            }
        }
    }

    job.diagnostics.extend(diagnostics);
}

/// Checks if a create op consumes a slot.
///
/// This matches Angular's `hasConsumesSlotTrait` which is used when finding
/// the first element in a placeholder view for null target_name handling.
fn has_consumes_slot_trait(op: &CreateOp<'_>) -> bool {
    matches!(
        op,
        CreateOp::ElementStart(_)
            | CreateOp::Element(_)
            | CreateOp::Template(_)
            | CreateOp::Text(_)
            | CreateOp::Pipe(_)
            | CreateOp::Projection(_)
            | CreateOp::RepeaterCreate(_)
            | CreateOp::Defer(_)
            | CreateOp::I18nStart(_)
            | CreateOp::DeclareLet(_)
            | CreateOp::ContainerStart(_)
            | CreateOp::Container(_)
    )
}
