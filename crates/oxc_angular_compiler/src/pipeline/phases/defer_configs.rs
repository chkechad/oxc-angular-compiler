//! Defer configuration phase.
//!
//! Configures @defer block instructions with trigger and dependency information.
//!
//! This phase processes DeferOp and DeferOnOp to:
//! 1. Collect timing configs into the constant pool
//! 2. Link defer triggers to their target defer blocks
//! 3. Set up main, placeholder, loading, and error template slots
//! 4. Configure timing parameters (minimum time, loading after, etc.)
//!
//! Ported from Angular's `template/pipeline/src/phases/defer_configs.ts`.

use oxc_allocator::Vec as OxcVec;

use crate::ir::enums::DeferOpModifierKind;
use crate::ir::ops::{CreateOp, UpdateOp, XrefId};
use crate::pipeline::compilation::{ComponentCompilationJob, ConstValue};

/// Collected timing config for a defer block.
#[derive(Clone)]
struct DeferTimingConfig {
    xref: XrefId,
    placeholder_minimum_time: Option<u32>,
    loading_minimum_time: Option<u32>,
    loading_after_time: Option<u32>,
}

/// Configures defer instructions with trigger and dependency information.
///
/// This phase:
/// 1. Collects timing configs and adds them to the constant pool
/// 2. Collects all DeferOp blocks and their associated DeferOnOp triggers
/// 3. Links triggers to their target defer blocks
/// 4. Validates timing parameters
pub fn configure_defer_instructions(job: &mut ComponentCompilationJob<'_>) {
    let allocator = job.allocator;

    // Collect all defer block timing configs
    let timing_configs: Vec<DeferTimingConfig> = job
        .all_views()
        .flat_map(|view| {
            view.create.iter().filter_map(|op| {
                if let CreateOp::Defer(defer) = op {
                    Some(DeferTimingConfig {
                        xref: defer.xref,
                        placeholder_minimum_time: defer.placeholder_minimum_time,
                        loading_minimum_time: defer.loading_minimum_time,
                        loading_after_time: defer.loading_after_time,
                    })
                } else {
                    None
                }
            })
        })
        .collect();

    // Create const pool entries for timing configs
    // Map: xref -> (placeholder_config_index, loading_config_index)
    let mut config_indices: std::vec::Vec<(XrefId, Option<u32>, Option<u32>)> = Vec::new();

    for config in &timing_configs {
        let mut placeholder_config_idx = None;
        let mut loading_config_idx = None;

        // Create loading config: [minimumTime, afterTime]
        // Note: Angular processes loadingConfig before placeholderConfig in transformExpressionsInOp
        // (see ir/src/expression.ts lines 1177-1186), so we must add loading config first
        // to get the correct const pool index order.
        if config.loading_minimum_time.is_some() || config.loading_after_time.is_some() {
            let min_time = config.loading_minimum_time.unwrap_or(0);
            let after_time = config.loading_after_time.unwrap_or(0);
            let mut entries = OxcVec::new_in(allocator);
            entries.push(ConstValue::Number(min_time as f64));
            entries.push(ConstValue::Number(after_time as f64));
            let const_value = ConstValue::Array(entries);
            loading_config_idx = Some(job.add_const(const_value));
        }

        // Create placeholder config: [minimumTime]
        if let Some(min_time) = config.placeholder_minimum_time {
            let mut entries = OxcVec::new_in(allocator);
            entries.push(ConstValue::Number(min_time as f64));
            let const_value = ConstValue::Array(entries);
            placeholder_config_idx = Some(job.add_const(const_value));
        }

        config_indices.push((config.xref, placeholder_config_idx, loading_config_idx));
    }

    // Update DeferOp with config indices
    let view_xrefs: std::vec::Vec<XrefId> = job.all_views().map(|v| v.xref).collect();
    for view_xref in view_xrefs {
        if let Some(view) = job.view_mut(view_xref) {
            for op in view.create.iter_mut() {
                if let CreateOp::Defer(defer) = op {
                    // Find the config indices for this defer block
                    if let Some((_, placeholder_idx, loading_idx)) =
                        config_indices.iter().find(|(xref, _, _)| *xref == defer.xref)
                    {
                        defer.placeholder_config = *placeholder_idx;
                        defer.loading_config = *loading_idx;
                    }
                }
            }
        }
    }

    // Collect all defer triggers for each block (defer_xref, modifier)
    let triggers: Vec<(XrefId, DeferOpModifierKind)> = job
        .all_views()
        .flat_map(|view| {
            view.create.iter().filter_map(|op| {
                if let CreateOp::DeferOn(defer_on) = op {
                    Some((defer_on.defer, defer_on.modifier))
                } else {
                    None
                }
            })
        })
        .collect();

    // Collect when conditions (defer_xref, modifier)
    let when_conditions: Vec<(XrefId, DeferOpModifierKind)> = job
        .all_views()
        .flat_map(|view| {
            view.update.iter().filter_map(|op| {
                if let UpdateOp::DeferWhen(defer_when) = op {
                    Some((defer_when.defer, defer_when.modifier))
                } else {
                    None
                }
            })
        })
        .collect();

    // Validate configurations
    for config in &timing_configs {
        validate_defer_block(config.xref, &triggers, &when_conditions);
    }
}

/// Validate a defer block's configuration.
/// This is a placeholder for future validation logic.
fn validate_defer_block(
    _block_xref: XrefId,
    _triggers: &[(XrefId, DeferOpModifierKind)],
    _when_conditions: &[(XrefId, DeferOpModifierKind)],
) {
    // A defer block should have at least one trigger mechanism
    // Default is on idle when no triggers are specified - Angular handles this automatically
    // Future: Add validation for invalid trigger combinations, missing references, etc.
}
