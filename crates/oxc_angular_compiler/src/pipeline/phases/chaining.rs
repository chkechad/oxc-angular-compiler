//! Chaining phase.
//!
//! Chains compatible instructions together for more efficient code generation.
//!
//! For example, two `property` operations in sequence:
//! ```javascript
//! ɵɵproperty("a", x);
//! ɵɵproperty("b", y);
//! ```
//!
//! Can be called as a chain instead:
//! ```javascript
//! ɵɵproperty("a", x)("b", y);
//! ```
//!
//! Ported from Angular's `template/pipeline/src/phases/chaining.ts`.

use std::sync::LazyLock;

use oxc_allocator::Box;
use oxc_diagnostics::OxcDiagnostic;

use crate::output::ast::{InvokeFunctionExpr, OutputExpression, OutputStatement};
use crate::pipeline::compilation::{ComponentCompilationJob, HostBindingCompilationJob};
use crate::r3::Identifiers;

/// Maximum number of chained instructions to prevent stack overflow from deep AST.
const MAX_CHAIN_LENGTH: usize = 256;

/// Maps an instruction to the instruction that can follow it in a chain.
/// This allows different instructions to chain together (e.g., conditionalCreate → conditionalBranchCreate).
static CHAIN_COMPATIBILITY: LazyLock<rustc_hash::FxHashMap<&'static str, &'static str>> =
    LazyLock::new(|| {
        let mut map = rustc_hash::FxHashMap::default();

        // Property and binding instructions - chain with themselves
        map.insert(Identifiers::PROPERTY, Identifiers::PROPERTY);
        map.insert(Identifiers::ATTRIBUTE, Identifiers::ATTRIBUTE);
        map.insert(Identifiers::STYLE_PROP, Identifiers::STYLE_PROP);
        map.insert(Identifiers::CLASS_PROP, Identifiers::CLASS_PROP);
        map.insert(Identifiers::DOM_PROPERTY, Identifiers::DOM_PROPERTY);
        map.insert(Identifiers::TWO_WAY_PROPERTY, Identifiers::TWO_WAY_PROPERTY);
        map.insert(Identifiers::ARIA_PROPERTY, Identifiers::ARIA_PROPERTY);

        // Element instructions
        map.insert(Identifiers::ELEMENT, Identifiers::ELEMENT);
        map.insert(Identifiers::ELEMENT_START, Identifiers::ELEMENT_START);
        map.insert(Identifiers::ELEMENT_END, Identifiers::ELEMENT_END);
        map.insert(Identifiers::ELEMENT_CONTAINER, Identifiers::ELEMENT_CONTAINER);
        map.insert(Identifiers::ELEMENT_CONTAINER_START, Identifiers::ELEMENT_CONTAINER_START);
        map.insert(Identifiers::ELEMENT_CONTAINER_END, Identifiers::ELEMENT_CONTAINER_END);

        // Listener instructions
        map.insert(Identifiers::LISTENER, Identifiers::LISTENER);
        map.insert(Identifiers::SYNTHETIC_HOST_LISTENER, Identifiers::SYNTHETIC_HOST_LISTENER);
        map.insert(Identifiers::SYNTHETIC_HOST_PROPERTY, Identifiers::SYNTHETIC_HOST_PROPERTY);
        map.insert(Identifiers::TWO_WAY_LISTENER, Identifiers::TWO_WAY_LISTENER);

        // Template instructions
        map.insert(Identifiers::TEMPLATE_CREATE, Identifiers::TEMPLATE_CREATE);

        // i18n instructions
        map.insert(Identifiers::I18N_EXP, Identifiers::I18N_EXP);

        // DOM mode instructions
        map.insert(Identifiers::DOM_ELEMENT, Identifiers::DOM_ELEMENT);
        map.insert(Identifiers::DOM_ELEMENT_START, Identifiers::DOM_ELEMENT_START);
        map.insert(Identifiers::DOM_ELEMENT_END, Identifiers::DOM_ELEMENT_END);
        map.insert(Identifiers::DOM_ELEMENT_CONTAINER, Identifiers::DOM_ELEMENT_CONTAINER);
        map.insert(
            Identifiers::DOM_ELEMENT_CONTAINER_START,
            Identifiers::DOM_ELEMENT_CONTAINER_START,
        );
        map.insert(Identifiers::DOM_ELEMENT_CONTAINER_END, Identifiers::DOM_ELEMENT_CONTAINER_END);
        map.insert(Identifiers::DOM_LISTENER, Identifiers::DOM_LISTENER);
        map.insert(Identifiers::DOM_TEMPLATE, Identifiers::DOM_TEMPLATE);

        // Animation instructions
        map.insert(Identifiers::ANIMATION_ENTER, Identifiers::ANIMATION_ENTER);
        map.insert(Identifiers::ANIMATION_LEAVE, Identifiers::ANIMATION_LEAVE);
        map.insert(Identifiers::ANIMATION_ENTER_LISTENER, Identifiers::ANIMATION_ENTER_LISTENER);
        map.insert(Identifiers::ANIMATION_LEAVE_LISTENER, Identifiers::ANIMATION_LEAVE_LISTENER);

        // Conditional instructions - chain conditionalCreate with conditionalBranchCreate
        map.insert(Identifiers::CONDITIONAL_CREATE, Identifiers::CONDITIONAL_BRANCH_CREATE);
        map.insert(Identifiers::CONDITIONAL_BRANCH_CREATE, Identifiers::CONDITIONAL_BRANCH_CREATE);

        // Let declaration
        map.insert(Identifiers::DECLARE_LET, Identifiers::DECLARE_LET);

        map
    });

/// Chains compatible instructions together.
///
/// This phase post-processes the reified statements and combines consecutive
/// calls to chainable instructions into chained calls.
pub fn chain(job: &mut ComponentCompilationJob<'_>) {
    let allocator = job.allocator;
    let compatibility = &*CHAIN_COMPATIBILITY;
    let mut diagnostics = Vec::new();

    // Chain instructions in all views
    for view in job.all_views_mut() {
        chain_statements(allocator, &mut view.create_statements, compatibility, &mut diagnostics);
        chain_statements(allocator, &mut view.update_statements, compatibility, &mut diagnostics);
    }

    job.diagnostics.extend(diagnostics);
}

/// Chains compatible statements in a statement list.
fn chain_statements<'a>(
    allocator: &'a oxc_allocator::Allocator,
    statements: &mut oxc_allocator::Vec<'a, OutputStatement<'a>>,
    compatibility: &rustc_hash::FxHashMap<&'static str, &'static str>,
    diagnostics: &mut Vec<OxcDiagnostic>,
) {
    if statements.len() < 2 {
        return;
    }

    // First pass: collect instruction names and args for each statement
    let mut stmt_info: Vec<Option<(String, oxc_allocator::Vec<'a, OutputExpression<'a>>)>> =
        Vec::new();
    for stmt in statements.iter() {
        if let Some(instruction) = get_instruction_name(stmt) {
            if compatibility.contains_key(instruction) {
                if let Some(args) = extract_args(stmt) {
                    let cloned_args = clone_args(allocator, args, diagnostics);
                    stmt_info.push(Some((instruction.to_string(), cloned_args)));
                    continue;
                }
            }
        }
        stmt_info.push(None);
    }

    // Second pass: identify chains using compatibility map
    let mut chains: Vec<(usize, Vec<usize>)> = Vec::new(); // (start_idx, indices_to_chain)
    let mut current_chain_start: Option<usize> = None;
    let mut current_instruction: Option<String> = None;
    let mut current_chain_indices: Vec<usize> = Vec::new();

    for (i, info) in stmt_info.iter().enumerate() {
        if let Some((instruction, _)) = info {
            // Check if this instruction can chain with the previous one
            let can_chain = if let Some(ref current_instr) = current_instruction {
                // Check if the current chain's instruction can be followed by this instruction
                compatibility.get(current_instr.as_str()).is_some_and(|&next| next == instruction)
                    && current_chain_indices.len() < MAX_CHAIN_LENGTH
            } else {
                false
            };

            if can_chain {
                // Continue the chain
                current_chain_indices.push(i);
                // Update current_instruction to the new instruction for next iteration
                current_instruction = Some(instruction.clone());
            } else {
                // Start a new potential chain
                // First, save the current chain if it has more than one element
                if current_chain_indices.len() > 1 {
                    if let Some(start) = current_chain_start {
                        chains.push((start, current_chain_indices.clone()));
                    }
                }

                current_chain_start = Some(i);
                current_instruction = Some(instruction.clone());
                current_chain_indices = vec![i];
            }
        } else {
            // Not chainable - save current chain if valid
            if current_chain_indices.len() > 1 {
                if let Some(start) = current_chain_start {
                    chains.push((start, current_chain_indices.clone()));
                }
            }
            current_chain_start = None;
            current_instruction = None;
            current_chain_indices.clear();
        }
    }

    // Don't forget the last chain
    if current_chain_indices.len() > 1 {
        if let Some(start) = current_chain_start {
            chains.push((start, current_chain_indices));
        }
    }

    // Third pass: apply chains and collect indices to remove
    let mut to_remove: Vec<usize> = Vec::new();
    for (start_idx, indices) in chains {
        // Chain all statements after the first into the first
        for &idx in indices.iter().skip(1) {
            if let Some((_, args)) = stmt_info[idx].take() {
                chain_into_statement(allocator, &mut statements[start_idx], args);
                to_remove.push(idx);
            }
        }
    }

    // Sort and remove in reverse order
    to_remove.sort_unstable();
    for &idx in to_remove.iter().rev() {
        statements.remove(idx);
    }
}

/// Gets the instruction name from a statement if it's a chainable instruction call.
fn get_instruction_name<'a>(stmt: &'a OutputStatement<'a>) -> Option<&'a str> {
    if let OutputStatement::Expression(expr_stmt) = stmt {
        if let OutputExpression::InvokeFunction(invoke) = &expr_stmt.expr {
            // Check if it's an i0.ɵɵinstruction call
            if let OutputExpression::ReadProp(prop) = invoke.fn_expr.as_ref() {
                return Some(prop.name.as_str());
            }
        }
    }
    None
}

/// Extracts the arguments from an instruction call statement.
fn extract_args<'a, 'b>(
    stmt: &'b OutputStatement<'a>,
) -> Option<&'b oxc_allocator::Vec<'a, OutputExpression<'a>>> {
    if let OutputStatement::Expression(expr_stmt) = stmt {
        if let OutputExpression::InvokeFunction(invoke) = &expr_stmt.expr {
            return Some(&invoke.args);
        }
    }
    None
}

/// Clones arguments for use in chaining.
fn clone_args<'a>(
    allocator: &'a oxc_allocator::Allocator,
    args: &oxc_allocator::Vec<'a, OutputExpression<'a>>,
    diagnostics: &mut Vec<OxcDiagnostic>,
) -> oxc_allocator::Vec<'a, OutputExpression<'a>> {
    let mut cloned = oxc_allocator::Vec::new_in(allocator);
    for arg in args.iter() {
        cloned.push(clone_expression(allocator, arg, diagnostics));
    }
    cloned
}

/// Clones a LiteralValue.
fn clone_literal_value<'a>(
    value: &crate::output::ast::LiteralValue<'a>,
) -> crate::output::ast::LiteralValue<'a> {
    use crate::output::ast::LiteralValue;
    match value {
        LiteralValue::Null => LiteralValue::Null,
        LiteralValue::Undefined => LiteralValue::Undefined,
        LiteralValue::Boolean(b) => LiteralValue::Boolean(*b),
        LiteralValue::Number(n) => LiteralValue::Number(*n),
        LiteralValue::String(s) => LiteralValue::String(s.clone()),
    }
}

/// Clones an expression.
fn clone_expression<'a>(
    allocator: &'a oxc_allocator::Allocator,
    expr: &OutputExpression<'a>,
    diagnostics: &mut Vec<OxcDiagnostic>,
) -> OutputExpression<'a> {
    use crate::output::ast::*;

    match expr {
        OutputExpression::Literal(lit) => OutputExpression::Literal(Box::new_in(
            LiteralExpr { value: clone_literal_value(&lit.value), source_span: lit.source_span },
            allocator,
        )),
        OutputExpression::LiteralArray(arr) => {
            let mut entries = oxc_allocator::Vec::new_in(allocator);
            for entry in arr.entries.iter() {
                entries.push(clone_expression(allocator, entry, diagnostics));
            }
            OutputExpression::LiteralArray(Box::new_in(
                LiteralArrayExpr { entries, source_span: arr.source_span },
                allocator,
            ))
        }
        OutputExpression::LiteralMap(map) => {
            let mut entries = oxc_allocator::Vec::new_in(allocator);
            for entry in map.entries.iter() {
                entries.push(LiteralMapEntry {
                    key: entry.key.clone(),
                    value: clone_expression(allocator, &entry.value, diagnostics),
                    quoted: entry.quoted,
                });
            }
            OutputExpression::LiteralMap(Box::new_in(
                LiteralMapExpr { entries, source_span: map.source_span },
                allocator,
            ))
        }
        OutputExpression::RegularExpressionLiteral(regex) => {
            OutputExpression::RegularExpressionLiteral(Box::new_in(
                RegularExpressionLiteralExpr {
                    body: regex.body.clone(),
                    flags: regex.flags.clone(),
                    source_span: regex.source_span,
                },
                allocator,
            ))
        }
        OutputExpression::TemplateLiteral(tpl) => {
            let mut elements = oxc_allocator::Vec::new_in(allocator);
            for el in tpl.elements.iter() {
                elements.push(TemplateLiteralElement {
                    text: el.text.clone(),
                    raw_text: el.raw_text.clone(),
                    source_span: el.source_span,
                });
            }
            let mut expressions = oxc_allocator::Vec::new_in(allocator);
            for expr in tpl.expressions.iter() {
                expressions.push(clone_expression(allocator, expr, diagnostics));
            }
            OutputExpression::TemplateLiteral(Box::new_in(
                TemplateLiteralExpr { elements, expressions, source_span: tpl.source_span },
                allocator,
            ))
        }
        OutputExpression::TaggedTemplateLiteral(tagged) => {
            let cloned_tag = clone_expression(allocator, &tagged.tag, diagnostics);
            let mut elements = oxc_allocator::Vec::new_in(allocator);
            for el in tagged.template.elements.iter() {
                elements.push(TemplateLiteralElement {
                    text: el.text.clone(),
                    raw_text: el.raw_text.clone(),
                    source_span: el.source_span,
                });
            }
            let mut expressions = oxc_allocator::Vec::new_in(allocator);
            for expr in tagged.template.expressions.iter() {
                expressions.push(clone_expression(allocator, expr, diagnostics));
            }
            OutputExpression::TaggedTemplateLiteral(Box::new_in(
                TaggedTemplateLiteralExpr {
                    tag: Box::new_in(cloned_tag, allocator),
                    template: Box::new_in(
                        TemplateLiteralExpr {
                            elements,
                            expressions,
                            source_span: tagged.template.source_span,
                        },
                        allocator,
                    ),
                    source_span: tagged.source_span,
                },
                allocator,
            ))
        }
        OutputExpression::ReadVar(var) => OutputExpression::ReadVar(Box::new_in(
            ReadVarExpr { name: var.name.clone(), source_span: var.source_span },
            allocator,
        )),
        OutputExpression::ReadProp(prop) => OutputExpression::ReadProp(Box::new_in(
            ReadPropExpr {
                receiver: Box::new_in(
                    clone_expression(allocator, &prop.receiver, diagnostics),
                    allocator,
                ),
                name: prop.name.clone(),
                optional: false,
                source_span: prop.source_span,
            },
            allocator,
        )),
        OutputExpression::ReadKey(key) => OutputExpression::ReadKey(Box::new_in(
            ReadKeyExpr {
                receiver: Box::new_in(
                    clone_expression(allocator, &key.receiver, diagnostics),
                    allocator,
                ),
                index: Box::new_in(clone_expression(allocator, &key.index, diagnostics), allocator),
                optional: false,
                source_span: key.source_span,
            },
            allocator,
        )),
        OutputExpression::BinaryOperator(binop) => OutputExpression::BinaryOperator(Box::new_in(
            BinaryOperatorExpr {
                operator: binop.operator,
                lhs: Box::new_in(clone_expression(allocator, &binop.lhs, diagnostics), allocator),
                rhs: Box::new_in(clone_expression(allocator, &binop.rhs, diagnostics), allocator),
                source_span: binop.source_span,
            },
            allocator,
        )),
        OutputExpression::UnaryOperator(unary) => OutputExpression::UnaryOperator(Box::new_in(
            UnaryOperatorExpr {
                operator: unary.operator,
                expr: Box::new_in(clone_expression(allocator, &unary.expr, diagnostics), allocator),
                parens: unary.parens,
                source_span: unary.source_span,
            },
            allocator,
        )),
        OutputExpression::Conditional(cond) => {
            let false_case = cond
                .false_case
                .as_ref()
                .map(|fc| Box::new_in(clone_expression(allocator, fc, diagnostics), allocator));
            OutputExpression::Conditional(Box::new_in(
                ConditionalExpr {
                    condition: Box::new_in(
                        clone_expression(allocator, &cond.condition, diagnostics),
                        allocator,
                    ),
                    true_case: Box::new_in(
                        clone_expression(allocator, &cond.true_case, diagnostics),
                        allocator,
                    ),
                    false_case,
                    source_span: cond.source_span,
                },
                allocator,
            ))
        }
        OutputExpression::Not(not) => OutputExpression::Not(Box::new_in(
            NotExpr {
                condition: Box::new_in(
                    clone_expression(allocator, &not.condition, diagnostics),
                    allocator,
                ),
                source_span: not.source_span,
            },
            allocator,
        )),
        OutputExpression::Typeof(typeof_expr) => OutputExpression::Typeof(Box::new_in(
            TypeofExpr {
                expr: Box::new_in(
                    clone_expression(allocator, &typeof_expr.expr, diagnostics),
                    allocator,
                ),
                source_span: typeof_expr.source_span,
            },
            allocator,
        )),
        OutputExpression::Void(void_expr) => OutputExpression::Void(Box::new_in(
            VoidExpr {
                expr: Box::new_in(
                    clone_expression(allocator, &void_expr.expr, diagnostics),
                    allocator,
                ),
                source_span: void_expr.source_span,
            },
            allocator,
        )),
        OutputExpression::Parenthesized(paren) => OutputExpression::Parenthesized(Box::new_in(
            ParenthesizedExpr {
                expr: Box::new_in(clone_expression(allocator, &paren.expr, diagnostics), allocator),
                source_span: paren.source_span,
            },
            allocator,
        )),
        OutputExpression::Comma(comma) => {
            let mut parts = oxc_allocator::Vec::new_in(allocator);
            for part in comma.parts.iter() {
                parts.push(clone_expression(allocator, part, diagnostics));
            }
            OutputExpression::Comma(Box::new_in(
                CommaExpr { parts, source_span: comma.source_span },
                allocator,
            ))
        }
        OutputExpression::Function(func) => {
            let mut params = oxc_allocator::Vec::new_in(allocator);
            for param in func.params.iter() {
                params.push(FnParam { name: param.name.clone() });
            }
            let mut statements = oxc_allocator::Vec::new_in(allocator);
            for stmt in func.statements.iter() {
                statements.push(clone_statement(allocator, stmt, diagnostics));
            }
            OutputExpression::Function(Box::new_in(
                FunctionExpr {
                    name: func.name.clone(),
                    params,
                    statements,
                    source_span: func.source_span,
                },
                allocator,
            ))
        }
        OutputExpression::ArrowFunction(arrow) => {
            let mut params = oxc_allocator::Vec::new_in(allocator);
            for param in arrow.params.iter() {
                params.push(FnParam { name: param.name.clone() });
            }
            let body = match &arrow.body {
                ArrowFunctionBody::Expression(expr) => ArrowFunctionBody::Expression(Box::new_in(
                    clone_expression(allocator, expr, diagnostics),
                    allocator,
                )),
                ArrowFunctionBody::Statements(stmts) => {
                    let mut statements = oxc_allocator::Vec::new_in(allocator);
                    for stmt in stmts.iter() {
                        statements.push(clone_statement(allocator, stmt, diagnostics));
                    }
                    ArrowFunctionBody::Statements(statements)
                }
            };
            OutputExpression::ArrowFunction(Box::new_in(
                ArrowFunctionExpr { params, body, source_span: arrow.source_span },
                allocator,
            ))
        }
        OutputExpression::InvokeFunction(invoke) => OutputExpression::InvokeFunction(Box::new_in(
            InvokeFunctionExpr {
                fn_expr: Box::new_in(
                    clone_expression(allocator, &invoke.fn_expr, diagnostics),
                    allocator,
                ),
                args: clone_args(allocator, &invoke.args, diagnostics),
                pure: invoke.pure,
                optional: false,
                source_span: invoke.source_span,
            },
            allocator,
        )),
        OutputExpression::Instantiate(inst) => OutputExpression::Instantiate(Box::new_in(
            InstantiateExpr {
                class_expr: Box::new_in(
                    clone_expression(allocator, &inst.class_expr, diagnostics),
                    allocator,
                ),
                args: clone_args(allocator, &inst.args, diagnostics),
                source_span: inst.source_span,
            },
            allocator,
        )),
        OutputExpression::DynamicImport(import) => {
            let url = match &import.url {
                DynamicImportUrl::String(s) => DynamicImportUrl::String(s.clone()),
                DynamicImportUrl::Expression(expr) => DynamicImportUrl::Expression(Box::new_in(
                    clone_expression(allocator, expr, diagnostics),
                    allocator,
                )),
            };
            OutputExpression::DynamicImport(Box::new_in(
                DynamicImportExpr {
                    url,
                    url_comment: import.url_comment.clone(),
                    source_span: import.source_span,
                },
                allocator,
            ))
        }
        OutputExpression::External(ext) => OutputExpression::External(Box::new_in(
            ExternalExpr {
                value: ExternalReference {
                    module_name: ext.value.module_name.clone(),
                    name: ext.value.name.clone(),
                },
                source_span: ext.source_span,
            },
            allocator,
        )),
        OutputExpression::LocalizedString(loc) => {
            let mut message_parts = oxc_allocator::Vec::new_in(allocator);
            for part in loc.message_parts.iter() {
                message_parts.push(part.clone());
            }
            let mut placeholder_names = oxc_allocator::Vec::new_in(allocator);
            for name in loc.placeholder_names.iter() {
                placeholder_names.push(name.clone());
            }
            let mut expressions = oxc_allocator::Vec::new_in(allocator);
            for expr in loc.expressions.iter() {
                expressions.push(clone_expression(allocator, expr, diagnostics));
            }
            OutputExpression::LocalizedString(Box::new_in(
                LocalizedStringExpr {
                    description: loc.description.clone(),
                    meaning: loc.meaning.clone(),
                    custom_id: loc.custom_id.clone(),
                    message_parts,
                    placeholder_names,
                    expressions,
                    source_span: loc.source_span,
                },
                allocator,
            ))
        }
        OutputExpression::WrappedNode(wrapped) => OutputExpression::WrappedNode(Box::new_in(
            WrappedNodeExpr { node_id: wrapped.node_id.clone(), source_span: wrapped.source_span },
            allocator,
        )),
        OutputExpression::WrappedIrNode(_) => {
            // WrappedIrNode expressions wrap IR expressions for deferred processing.
            // They should be resolved during the reify phase before chaining occurs.
            // Emit a warning for this unexpected state.
            diagnostics.push(OxcDiagnostic::warn(
                "Cannot clone a WrappedIrExpr during chaining. WrappedIrExpr should be resolved before chaining."
            ));
            // Return a placeholder undefined literal
            OutputExpression::Literal(Box::new_in(
                LiteralExpr { value: LiteralValue::Undefined, source_span: None },
                allocator,
            ))
        }
        OutputExpression::SpreadElement(spread) => OutputExpression::SpreadElement(Box::new_in(
            SpreadElementExpr {
                expr: Box::new_in(
                    clone_expression(allocator, &spread.expr, diagnostics),
                    allocator,
                ),
                source_span: spread.source_span,
            },
            allocator,
        )),
    }
}

/// Clones a statement.
fn clone_statement<'a>(
    allocator: &'a oxc_allocator::Allocator,
    stmt: &OutputStatement<'a>,
    diagnostics: &mut Vec<OxcDiagnostic>,
) -> OutputStatement<'a> {
    use crate::output::ast::*;

    match stmt {
        OutputStatement::DeclareVar(decl) => {
            let value = decl.value.as_ref().map(|v| clone_expression(allocator, v, diagnostics));
            OutputStatement::DeclareVar(Box::new_in(
                DeclareVarStmt {
                    name: decl.name.clone(),
                    value,
                    modifiers: decl.modifiers,
                    leading_comment: decl.leading_comment.clone(),
                    source_span: decl.source_span,
                },
                allocator,
            ))
        }
        OutputStatement::DeclareFunction(func) => {
            let mut params = oxc_allocator::Vec::new_in(allocator);
            for param in func.params.iter() {
                params.push(FnParam { name: param.name.clone() });
            }
            let mut statements = oxc_allocator::Vec::new_in(allocator);
            for s in func.statements.iter() {
                statements.push(clone_statement(allocator, s, diagnostics));
            }
            OutputStatement::DeclareFunction(Box::new_in(
                DeclareFunctionStmt {
                    name: func.name.clone(),
                    params,
                    statements,
                    modifiers: func.modifiers,
                    source_span: func.source_span,
                },
                allocator,
            ))
        }
        OutputStatement::Expression(expr_stmt) => OutputStatement::Expression(Box::new_in(
            ExpressionStatement {
                expr: clone_expression(allocator, &expr_stmt.expr, diagnostics),
                source_span: expr_stmt.source_span,
            },
            allocator,
        )),
        OutputStatement::Return(ret) => OutputStatement::Return(Box::new_in(
            ReturnStatement {
                value: clone_expression(allocator, &ret.value, diagnostics),
                source_span: ret.source_span,
            },
            allocator,
        )),
        OutputStatement::If(if_stmt) => {
            let mut true_case = oxc_allocator::Vec::new_in(allocator);
            for s in if_stmt.true_case.iter() {
                true_case.push(clone_statement(allocator, s, diagnostics));
            }
            let mut false_case = oxc_allocator::Vec::new_in(allocator);
            for s in if_stmt.false_case.iter() {
                false_case.push(clone_statement(allocator, s, diagnostics));
            }
            OutputStatement::If(Box::new_in(
                IfStmt {
                    condition: clone_expression(allocator, &if_stmt.condition, diagnostics),
                    true_case,
                    false_case,
                    source_span: if_stmt.source_span,
                },
                allocator,
            ))
        }
    }
}

/// Chains additional arguments into an existing instruction call statement.
///
/// This transforms:
/// ```javascript
/// ɵɵinstruction(args1)
/// ```
/// Into:
/// ```javascript
/// ɵɵinstruction(args1)(args2)
/// ```
fn chain_into_statement<'a>(
    allocator: &'a oxc_allocator::Allocator,
    stmt: &mut OutputStatement<'a>,
    additional_args: oxc_allocator::Vec<'a, OutputExpression<'a>>,
) -> bool {
    if let OutputStatement::Expression(expr_stmt) = stmt {
        // Get the current expression and wrap it in an additional call
        let current_expr = std::mem::replace(
            &mut expr_stmt.expr,
            OutputExpression::Literal(Box::new_in(
                crate::output::ast::LiteralExpr {
                    value: crate::output::ast::LiteralValue::Null,
                    source_span: None,
                },
                allocator,
            )),
        );

        // Create the chained call: current_expr(additional_args)
        let chained = OutputExpression::InvokeFunction(Box::new_in(
            InvokeFunctionExpr {
                fn_expr: Box::new_in(current_expr, allocator),
                args: additional_args,
                pure: false,
                optional: false,
                source_span: None,
            },
            allocator,
        ));

        expr_stmt.expr = chained;
        return true;
    }
    false
}

/// Chains operations for host binding compilation.
///
/// Host version - only processes the root unit (no embedded views).
pub fn chain_for_host(job: &mut HostBindingCompilationJob<'_>) {
    let allocator = job.allocator;
    let compatibility = &*CHAIN_COMPATIBILITY;
    let mut diagnostics = Vec::new();

    chain_statements(allocator, &mut job.root.create_statements, compatibility, &mut diagnostics);
    chain_statements(allocator, &mut job.root.update_statements, compatibility, &mut diagnostics);

    job.diagnostics.extend(diagnostics);
}
