//! Assertion extraction handlers for Angular spec files.
//!
//! Contains `handle_*` methods that extract test assertions from various
//! Angular test patterns like `checkAction`, `expectFromHtml`, `humanizeDom`, etc.

use oxc_ast::ast::{CallExpression, Expression};

use crate::test_case::{
    ExpressionTokenAssertion, ExpressionTokenAssertionType, HtmlLexerTestType, TestAssertion,
};

use super::SpecExtractor;

impl SpecExtractor {
    /// Handle describe() or fdescribe() blocks
    pub(super) fn handle_describe(&mut self, expr: &CallExpression<'_>) {
        // Get describe name from first argument
        let name = expr
            .arguments
            .first()
            .and_then(|arg| self.extract_arg_string(arg))
            .unwrap_or_else(|| "unnamed".to_string());

        // Push to describe stack
        self.describe_stack.push(name.clone());

        // Create a new group
        let new_group = crate::test_case::TestGroup { name, groups: vec![], tests: vec![] };
        self.current_groups.push(new_group);

        // Visit the callback body (second argument)
        if let Some(arg) = expr.arguments.get(1)
            && let Some(func) = arg.as_expression()
        {
            oxc_ast_visit::Visit::visit_expression(self, func);
        }

        // Pop the group and add to parent
        if let Some(completed_group) = self.current_groups.pop()
            && let Some(parent) = self.current_groups.last_mut()
        {
            parent.groups.push(completed_group);
        }

        // Pop from describe stack
        self.describe_stack.pop();
    }

    /// Handle it() or fit() blocks
    pub(super) fn handle_it(&mut self, expr: &CallExpression<'_>) {
        // Get test name from first argument
        let name = expr
            .arguments
            .first()
            .and_then(|arg| self.extract_arg_string(arg))
            .unwrap_or_else(|| "unnamed".to_string());

        let path = self.current_path();

        // Reset lexer test state
        self.current_lexer_input = None;
        self.current_lexer_token_count = None;
        self.current_lexer_assertions.clear();
        self.current_html_lexer_input = None;
        self.current_html_lexer_type = None;
        self.current_html_lexer_expected.clear();
        self.current_html_lexer_options = None;
        // Reset variable assignments tracking
        self.pending_parse_assignments.clear();
        self.pending_string_assignments.clear();
        self.pending_parse_results.clear();

        // Create a new test case
        self.current_test = Some(crate::test_case::TestCase {
            name: name.clone(),
            path: if path.is_empty() { name } else { format!("{path}/{name}") },
            assertions: vec![],
        });

        // Visit the callback body (second argument)
        if let Some(arg) = expr.arguments.get(1)
            && let Some(func) = arg.as_expression()
        {
            oxc_ast_visit::Visit::visit_expression(self, func);
        }

        // Finalize any pending expression lexer test
        if let Some(input) = self.current_lexer_input.take() {
            let assertion = TestAssertion::ExpressionLexerTest {
                input,
                expected_token_count: self.current_lexer_token_count.take(),
                token_assertions: std::mem::take(&mut self.current_lexer_assertions),
            };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }

        // Finalize any pending HTML lexer test
        if let Some(input) = self.current_html_lexer_input.take()
            && let Some(test_type) = self.current_html_lexer_type.take()
        {
            let assertion = TestAssertion::HtmlLexerTest {
                input,
                test_type,
                expected: std::mem::take(&mut self.current_html_lexer_expected),
                options: self.current_html_lexer_options.take(),
            };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }

        // Add completed test to current group
        if let Some(test) = self.current_test.take()
            && let Some(group) = self.current_groups.last_mut()
        {
            group.tests.push(test);
        }
    }

    /// Handle checkAction('input') or checkAction('input', 'expected')
    pub(super) fn handle_check_action(&mut self, expr: &CallExpression<'_>) {
        let input = expr.arguments.first().and_then(|arg| self.extract_arg_string(arg));

        let expected = expr.arguments.get(1).and_then(|arg| self.extract_arg_string(arg));

        if let Some(input) = input {
            let assertion = TestAssertion::CheckAction { input, expected };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }

    /// Handle checkBinding('input', 'expected')
    pub(super) fn handle_check_binding(&mut self, expr: &CallExpression<'_>) {
        let input = expr.arguments.first().and_then(|arg| self.extract_arg_string(arg));

        let expected = expr.arguments.get(1).and_then(|arg| self.extract_arg_string(arg));

        if let Some(input) = input {
            let assertion = TestAssertion::CheckBinding { input, expected };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }

    /// Handle expectActionError('input', 'error')
    pub(super) fn handle_expect_action_error(&mut self, expr: &CallExpression<'_>) {
        let input = expr.arguments.first().and_then(|arg| self.extract_arg_string(arg));

        let error_contains = expr.arguments.get(1).and_then(|arg| self.extract_arg_string(arg));

        if let (Some(input), Some(error_contains)) = (input, error_contains) {
            let assertion = TestAssertion::ExpectActionError { input, error_contains };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }

    /// Handle expectBindingError('input', 'error')
    pub(super) fn handle_expect_binding_error(&mut self, expr: &CallExpression<'_>) {
        let input = expr.arguments.first().and_then(|arg| self.extract_arg_string(arg));

        let error_contains = expr.arguments.get(1).and_then(|arg| self.extract_arg_string(arg));

        if let (Some(input), Some(error_contains)) = (input, error_contains) {
            let assertion = TestAssertion::ExpectBindingError { input, error_contains };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }

    /// Handle checkActionWithError('input', 'expected', 'error')
    pub(super) fn handle_check_action_with_error(&mut self, expr: &CallExpression<'_>) {
        let input = expr.arguments.first().and_then(|arg| self.extract_arg_string(arg));

        let expected = expr.arguments.get(1).and_then(|arg| self.extract_arg_string(arg));

        let error_contains = expr.arguments.get(2).and_then(|arg| self.extract_arg_string(arg));

        if let (Some(input), Some(expected), Some(error_contains)) =
            (input, expected, error_contains)
        {
            let assertion = TestAssertion::CheckActionWithError { input, expected, error_contains };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }

    /// Handle humanizeDom(parser.parse('input', 'TestComp')) calls
    pub(super) fn handle_humanize_dom(&mut self, expr: &CallExpression<'_>) {
        // Look for parser.parse() call in the argument
        if let Some(arg) = expr.arguments.first()
            && let Some(call_expr) = arg.as_expression().and_then(|e| {
                if let Expression::CallExpression(c) = e { Some(c.as_ref()) } else { None }
            })
        {
            // Check if it's parser.parse()
            if let Expression::StaticMemberExpression(member) = &call_expr.callee
                && member.property.name == "parse"
            {
                // Get the input string (first argument to parse())
                if let Some(input) =
                    call_expr.arguments.first().and_then(|a| self.extract_arg_string(a))
                {
                    // For now, we store with empty expected - will be filled by comparison
                    let assertion = TestAssertion::HumanizeDom { input, expected: vec![] };
                    if let Some(test) = &mut self.current_test {
                        test.assertions.push(assertion);
                    }
                }
            }
        }
    }

    /// Handle expectFromHtml('<template>').toEqual([...]) chains
    pub(super) fn handle_expect_from_html_to_equal(
        &mut self,
        expect_call: &CallExpression<'_>,
        to_equal_call: &CallExpression<'_>,
    ) {
        // Try to resolve the input, including variable references
        let input = self.resolve_string_value(expect_call.arguments.first());

        // Check for ignoreError flag (second argument to expectFromHtml)
        let ignore_error = expect_call
            .arguments
            .get(1)
            .and_then(|arg| arg.as_expression())
            .is_some_and(|expr| matches!(expr, Expression::BooleanLiteral(b) if b.value));

        if let Some(input) = input {
            // Extract expected array from toEqual([...])
            let expected = to_equal_call
                .arguments
                .first()
                .and_then(|arg| arg.as_expression())
                .and_then(|expr| self.extract_array_literal(expr))
                .unwrap_or_default();

            let assertion = TestAssertion::ExpectFromHtml { input, expected, ignore_error };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }

    // ========== Expression Lexer Handlers ==========

    /// Handle lex('input') calls - captures the input for lexer test
    /// If there's already a pending lexer test, finalize it first
    pub(super) fn handle_lex(&mut self, expr: &CallExpression<'_>) {
        if let Some(input) = expr.arguments.first().and_then(|arg| self.extract_arg_string(arg)) {
            // Finalize any pending lexer test before starting a new one
            if let Some(prev_input) = self.current_lexer_input.take() {
                // Only create assertion if we have token assertions for the previous input
                if !self.current_lexer_assertions.is_empty() {
                    let assertion = TestAssertion::ExpressionLexerTest {
                        input: prev_input,
                        expected_token_count: self.current_lexer_token_count.take(),
                        token_assertions: std::mem::take(&mut self.current_lexer_assertions),
                    };
                    if let Some(test) = &mut self.current_test {
                        test.assertions.push(assertion);
                    }
                }
            }
            self.current_lexer_input = Some(input);
            // Reset token count for new test (assertions already cleared above)
            self.current_lexer_token_count = None;
        }
    }

    /// Handle expect(tokens.length).toEqual(n) - token count assertion
    pub(super) fn handle_tokens_length_to_equal(&mut self, to_equal_call: &CallExpression<'_>) {
        // Extract the count from toEqual(n)
        if let Some(arg) = to_equal_call.arguments.first()
            && let Some(Expression::NumericLiteral(lit)) = arg.as_expression()
        {
            self.current_lexer_token_count = Some(lit.value as usize);
        }
    }

    /// Handle expectXxxToken calls - adds token assertion
    /// Pattern 1: expectXxxToken(tokens[n], start, end, value?) - uses current lex input
    /// Pattern 2: expectXxxToken(lex('input')[n], start, end, value?) - lex is nested
    pub(super) fn handle_expect_token(
        &mut self,
        expr: &CallExpression<'_>,
        assertion_type: ExpressionTokenAssertionType,
    ) {
        // Extract token index and optional nested lex input from first argument
        let (token_index, nested_lex_input) =
            expr.arguments.first().and_then(|arg| arg.as_expression()).map_or((None, None), |e| {
                if let Expression::ComputedMemberExpression(member) = e {
                    let index = if let Expression::NumericLiteral(lit) = &member.expression {
                        Some(lit.value as usize)
                    } else {
                        None
                    };

                    // Check if the object is a lex() call: lex('input')[n]
                    let lex_input = if let Expression::CallExpression(call) = &member.object {
                        if let Expression::Identifier(id) = &call.callee {
                            if id.name == "lex" {
                                call.arguments.first().and_then(|a| self.extract_arg_string(a))
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    } else {
                        None
                    };

                    (index, lex_input)
                } else {
                    (None, None)
                }
            });

        // If there's a nested lex input that differs from current, finalize and switch
        if let Some(lex_input) = nested_lex_input
            && self.current_lexer_input.as_ref() != Some(&lex_input)
        {
            // Finalize the current test if it has assertions
            if let Some(prev_input) = self.current_lexer_input.take()
                && !self.current_lexer_assertions.is_empty()
            {
                let assertion = TestAssertion::ExpressionLexerTest {
                    input: prev_input,
                    expected_token_count: self.current_lexer_token_count.take(),
                    token_assertions: std::mem::take(&mut self.current_lexer_assertions),
                };
                if let Some(test) = &mut self.current_test {
                    test.assertions.push(assertion);
                }
            }
            self.current_lexer_input = Some(lex_input);
            self.current_lexer_token_count = None;
        }

        // Second arg is start position
        let start = expr.arguments.get(1).and_then(|arg| arg.as_expression()).and_then(|e| {
            if let Expression::NumericLiteral(lit) = e { Some(lit.value as u32) } else { None }
        });

        // Third arg is end position
        let end = expr.arguments.get(2).and_then(|arg| arg.as_expression()).and_then(|e| {
            if let Expression::NumericLiteral(lit) = e { Some(lit.value as u32) } else { None }
        });

        // Fourth arg is value (optional for some token types)
        let value = expr
            .arguments
            .get(3)
            .and_then(|arg| arg.as_expression().and_then(|e| self.extract_json_value(e)));

        if let (Some(token_index), Some(start), Some(end)) = (token_index, start, end) {
            self.current_lexer_assertions.push(ExpressionTokenAssertion {
                assertion_type,
                token_index,
                start,
                end,
                value,
            });
        }
    }

    // ========== HTML Lexer Handlers ==========

    /// Handle tokenizeAndHumanizeXxx calls chained with .toEqual([...])
    pub(super) fn handle_html_lexer_to_equal(
        &mut self,
        tokenize_call: &CallExpression<'_>,
        to_equal_call: &CallExpression<'_>,
        test_type: HtmlLexerTestType,
    ) {
        // Get input string from tokenize call
        let input = tokenize_call.arguments.first().and_then(|arg| self.extract_arg_string(arg));

        if let Some(input) = input {
            // Extract expected array from toEqual([...])
            let expected = to_equal_call
                .arguments
                .first()
                .and_then(|arg| arg.as_expression())
                .and_then(|expr| self.extract_array_literal(expr))
                .unwrap_or_default();

            // Check for options object in second argument
            let options = tokenize_call
                .arguments
                .get(1)
                .and_then(|arg| arg.as_expression())
                .and_then(|e| self.extract_html_lexer_options(e));

            let assertion = TestAssertion::HtmlLexerTest { input, test_type, expected, options };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }

    /// Handle expect(humanizeDom(...)).toEqual([...]) chains
    pub(super) fn handle_humanize_dom_to_equal(
        &mut self,
        humanize_call: &CallExpression<'_>,
        to_equal_call: &CallExpression<'_>,
        is_source_spans: bool,
    ) {
        // Get the parser.parse() call from humanizeDom argument
        if let Some(arg) = humanize_call.arguments.first()
            && let Some(Expression::CallExpression(parse_call)) = arg.as_expression()
        {
            // Check if it's parser.parse()
            if let Expression::StaticMemberExpression(member) = &parse_call.callee
                && member.property.name == "parse"
            {
                // Get the input string (first argument to parse())
                if let Some(input) =
                    parse_call.arguments.first().and_then(|a| self.extract_arg_string(a))
                {
                    // Extract expected array from toEqual([...])
                    let expected = to_equal_call
                        .arguments
                        .first()
                        .and_then(|arg| arg.as_expression())
                        .and_then(|expr| self.extract_array_literal(expr))
                        .unwrap_or_default();

                    // Extract parser options (3rd argument) for HumanizeDomSourceSpans
                    let options = if is_source_spans {
                        self.extract_html_parser_options(parse_call)
                    } else {
                        None
                    };

                    let assertion = if is_source_spans {
                        TestAssertion::HumanizeDomSourceSpans { input, expected, options }
                    } else {
                        TestAssertion::HumanizeDom { input, expected }
                    };

                    if let Some(test) = &mut self.current_test {
                        test.assertions.push(assertion);
                    }
                }
            }
        }
    }

    // ========== Serializer Pattern Handlers ==========

    /// Handle expect(serialize(parse(...))).toBe(...) assertions
    pub(super) fn handle_serialize_expression_to_be(
        &mut self,
        input: &str,
        _is_unparse: bool,
        to_be_call: &CallExpression<'_>,
    ) {
        // Extract expected string from toBe(...)
        if let Some(expected) =
            to_be_call.arguments.first().and_then(|a| self.extract_arg_string(a))
        {
            let assertion =
                TestAssertion::SerializeExpression { input: input.to_string(), expected };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }

    // ========== Style Parser Handlers ==========

    /// Handle expect(parseStyle(...)).toEqual([...])
    pub(super) fn handle_parse_style_to_equal(
        &mut self,
        parse_style_call: &CallExpression<'_>,
        to_equal_call: &CallExpression<'_>,
    ) {
        if let Some(input) =
            parse_style_call.arguments.first().and_then(|a| self.extract_arg_string(a))
        {
            // Extract expected array of strings
            let expected: Vec<String> = to_equal_call
                .arguments
                .first()
                .and_then(|arg| arg.as_expression())
                .and_then(|expr| {
                    if let Expression::ArrayExpression(arr) = expr {
                        let strings: Vec<String> = arr
                            .elements
                            .iter()
                            .filter_map(|el| el.as_expression())
                            .filter_map(|e| self.extract_string(e))
                            .collect();
                        Some(strings)
                    } else {
                        None
                    }
                })
                .unwrap_or_default();

            let assertion = TestAssertion::ParseStyle { input, expected };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }

    // ========== Variable Reference Handlers ==========

    /// Handle expect(identifier).toEqual([...]) where identifier was assigned from a parse call
    pub(super) fn handle_variable_expect_to_equal(
        &mut self,
        fn_name: &str,
        input: &str,
        to_equal_call: &CallExpression<'_>,
    ) {
        // Extract expected array from toEqual([...])
        let expected: Vec<String> = to_equal_call
            .arguments
            .first()
            .and_then(|arg| arg.as_expression())
            .and_then(|expr| {
                if let Expression::ArrayExpression(arr) = expr {
                    let strings: Vec<String> = arr
                        .elements
                        .iter()
                        .filter_map(|el| el.as_expression())
                        .filter_map(|e| self.extract_string(e))
                        .collect();
                    Some(strings)
                } else {
                    None
                }
            })
            .unwrap_or_default();

        // Create the appropriate assertion based on the function name
        let assertion = match fn_name {
            "parseStyle" => TestAssertion::ParseStyle { input: input.to_string(), expected },
            // Add more patterns as needed (humanizeDom, etc.)
            _ => return, // Unknown function, skip
        };

        if let Some(test) = &mut self.current_test {
            test.assertions.push(assertion);
        }
    }

    // ========== Errors Property Access Handlers ==========

    /// Handle expect(parseAction(...).errors).toEqual([])
    /// This is a test that parsing produces no errors
    pub(super) fn handle_errors_to_equal(
        &mut self,
        fn_name: &str,
        input: &str,
        to_equal_call: &CallExpression<'_>,
    ) {
        // Check if expected is empty array (no errors expected)
        let is_empty_array =
            to_equal_call.arguments.first().and_then(|arg| arg.as_expression()).is_some_and(
                |expr| {
                    if let Expression::ArrayExpression(arr) = expr {
                        arr.elements.is_empty()
                    } else {
                        false
                    }
                },
            );

        if !is_empty_array {
            return; // Only handle "expect no errors" case for now
        }

        // Create the appropriate assertion based on the function name
        // Use ExpectNoActionError/ExpectNoBindingError since .errors tests only check for no errors
        let assertion = match fn_name {
            "parseAction" => TestAssertion::ExpectNoActionError { input: input.to_string() },
            "parseBinding" | "parseSimpleBinding" => {
                TestAssertion::ExpectNoBindingError { input: input.to_string() }
            }
            _ => return, // Unknown function, skip
        };

        if let Some(test) = &mut self.current_test {
            test.assertions.push(assertion);
        }
    }

    // ========== Hyphenate Handlers ==========

    /// Handle expect(hyphenate(...)).toEqual(...)
    pub(super) fn handle_hyphenate_to_equal(
        &mut self,
        hyphenate_call: &CallExpression<'_>,
        to_equal_call: &CallExpression<'_>,
    ) {
        if let Some(input) =
            hyphenate_call.arguments.first().and_then(|a| self.extract_arg_string(a))
            && let Some(expected) =
                to_equal_call.arguments.first().and_then(|a| self.extract_arg_string(a))
        {
            let assertion = TestAssertion::Hyphenate { input, expected };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }

    /// Handle expect(hyphenate(...)).toBe(...)
    pub(super) fn handle_hyphenate_to_be(
        &mut self,
        hyphenate_call: &CallExpression<'_>,
        to_be_call: &CallExpression<'_>,
    ) {
        self.handle_hyphenate_to_equal(hyphenate_call, to_be_call);
    }

    // ========== Whitespace Removal Handlers ==========

    /// Handle expect(parseAndRemoveWS(...)).toEqual([...])
    pub(super) fn handle_parse_and_remove_ws_to_equal(
        &mut self,
        parse_ws_call: &CallExpression<'_>,
        to_equal_call: &CallExpression<'_>,
    ) {
        if let Some(input) =
            parse_ws_call.arguments.first().and_then(|a| self.extract_arg_string(a))
        {
            let expected = to_equal_call
                .arguments
                .first()
                .and_then(|arg| arg.as_expression())
                .and_then(|expr| self.extract_array_literal(expr))
                .unwrap_or_default();

            // Extract options from second argument if present
            let options = parse_ws_call
                .arguments
                .get(1)
                .and_then(|arg| arg.as_expression())
                .and_then(|e| self.extract_html_lexer_options(e));

            let assertion = TestAssertion::ParseAndRemoveWhitespace { input, expected, options };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }

    // ========== Expression Source Span Handlers ==========

    /// Handle expect(humanizeExpressionSource(...)).toEqual([...])
    pub(super) fn handle_humanize_expression_source_to_equal(
        &mut self,
        humanize_call: &CallExpression<'_>,
        to_equal_call: &CallExpression<'_>,
    ) {
        // humanizeExpressionSource takes parse(input, options).nodes as argument
        if let Some(arg) = humanize_call.arguments.first()
            && let Some(input) = self.extract_parse_input_from_nodes(arg.as_expression())
        {
            let expected = to_equal_call
                .arguments
                .first()
                .and_then(|arg| arg.as_expression())
                .and_then(|expr| self.extract_array_literal(expr))
                .unwrap_or_default();

            // Try to extract options from the parse call
            let options = self.extract_parse_options_from_nodes(arg.as_expression());

            // Detect if this test should extract sub-expressions based on test name
            // Pattern: "expressions in" (plural) indicates sub-expression extraction
            let extract_sub_expressions = self.current_test.as_ref().is_some_and(|t| {
                t.name.contains("expressions in") || t.name.contains("implicit receiver")
            });

            // Detect if this test specifically looks for implicit receiver spans
            let find_implicit_receiver =
                self.current_test.as_ref().is_some_and(|t| t.name.contains("implicit receiver"));

            // Detect if this test only wants template expressions (from structural directives)
            let template_expressions_only = self.current_path().contains("template expressions");

            // Detect if this test expects unparser-formatted output
            // These tests have singular patterns like "of an expression", "of a pipe", "of an interpolation"
            let use_unparser = self.current_test.as_ref().is_some_and(|t| {
                (t.name.contains("of an expression")
                    || t.name.contains("of a pipe")
                    || t.name.contains("of an interpolation")
                    || t.name.contains("with arbitrary whitespace")
                    || t.name.contains("in a bound text"))
                    && !t.name.contains("expressions in")
            });

            // For "interpolation" and "bound text" tests, output full interpolation with {{ }}
            // For other tests (like "pipe"), output inner expressions only
            let unparse_full_interpolation = self.current_test.as_ref().is_some_and(|t| {
                t.name.contains("of an interpolation")
                    || t.name.contains("with arbitrary whitespace")
                    || t.name.contains("in a bound text")
            });

            let assertion = TestAssertion::HumanizeExpressionSource {
                input,
                expected,
                options,
                extract_sub_expressions,
                find_implicit_receiver,
                template_expressions_only,
                use_unparser,
                unparse_full_interpolation,
            };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }

    /// Handle expect(humanizeExpressionSource(...)).toContain([...])
    pub(super) fn handle_humanize_expression_source_to_contain(
        &mut self,
        humanize_call: &CallExpression<'_>,
        to_contain_call: &CallExpression<'_>,
    ) {
        // Same as toEqual but wraps expected in array since toContain checks single element
        if let Some(arg) = humanize_call.arguments.first()
            && let Some(input) = self.extract_parse_input_from_nodes(arg.as_expression())
        {
            let single_expected = to_contain_call
                .arguments
                .first()
                .and_then(|arg| arg.as_expression())
                .and_then(|expr| self.extract_json_value(expr));

            if let Some(expected_val) = single_expected {
                let options = self.extract_parse_options_from_nodes(arg.as_expression());

                // Detect if this test should extract sub-expressions based on test name
                let extract_sub_expressions = self.current_test.as_ref().is_some_and(|t| {
                    t.name.contains("expressions in") || t.name.contains("implicit receiver")
                });

                // Detect if this test specifically looks for implicit receiver spans
                let find_implicit_receiver = self
                    .current_test
                    .as_ref()
                    .is_some_and(|t| t.name.contains("implicit receiver"));

                // Detect if this test only wants template expressions (from structural directives)
                let template_expressions_only =
                    self.current_path().contains("template expressions");

                // Detect if this test expects unparser-formatted output
                let use_unparser = self.current_test.as_ref().is_some_and(|t| {
                    (t.name.contains("of an expression")
                        || t.name.contains("of a pipe")
                        || t.name.contains("of an interpolation")
                        || t.name.contains("with arbitrary whitespace")
                        || t.name.contains("in a bound text"))
                        && !t.name.contains("expressions in")
                });

                // For "interpolation" and "bound text" tests, output full interpolation with {{ }}
                let unparse_full_interpolation = self.current_test.as_ref().is_some_and(|t| {
                    t.name.contains("of an interpolation")
                        || t.name.contains("with arbitrary whitespace")
                        || t.name.contains("in a bound text")
                });

                let assertion = TestAssertion::HumanizeExpressionSource {
                    input,
                    expected: vec![expected_val],
                    options,
                    extract_sub_expressions,
                    find_implicit_receiver,
                    template_expressions_only,
                    use_unparser,
                    unparse_full_interpolation,
                };
                if let Some(test) = &mut self.current_test {
                    test.assertions.push(assertion);
                }
            }
        }
    }

    /// Extract parse input from parse(...).nodes expression
    pub(super) fn extract_parse_input_from_nodes(
        &self,
        expr: Option<&Expression<'_>>,
    ) -> Option<String> {
        let expr = expr?;
        // Pattern: parse(input, options).nodes
        if let Expression::StaticMemberExpression(member) = expr
            && member.property.name == "nodes"
            && let Expression::CallExpression(parse_call) = &member.object
            && let Some(name) = self.get_callee_name(parse_call)
            && name == "parse"
        {
            return parse_call.arguments.first().and_then(|a| self.extract_arg_string(a));
        }
        None
    }

    /// Extract parse options from parse(..., options).nodes expression
    pub(super) fn extract_parse_options_from_nodes(
        &self,
        expr: Option<&Expression<'_>>,
    ) -> Option<crate::test_case::ParseOptions> {
        let expr = expr?;
        if let Expression::StaticMemberExpression(member) = expr
            && member.property.name == "nodes"
            && let Expression::CallExpression(parse_call) = &member.object
            && let Some(name) = self.get_callee_name(parse_call)
            && name == "parse"
        {
            // Get second argument (options object)
            if let Some(opts_arg) = parse_call.arguments.get(1) {
                return self.extract_parse_options(opts_arg.as_expression());
            }
        }
        None
    }

    // ========== AST Serializer Handlers ==========

    /// Handle expect(serializeNodes(...)).toEqual([...])
    pub(super) fn handle_serialize_nodes_to_equal(
        &mut self,
        serialize_call: &CallExpression<'_>,
        to_equal_call: &CallExpression<'_>,
    ) {
        // serializeNodes takes ast.rootNodes as argument
        // We need to find the original input from the parser.parse() call
        if let Some(arg) = serialize_call.arguments.first()
            && let Some(input) = self.extract_root_nodes_input(arg.as_expression())
        {
            let expected: Vec<String> = to_equal_call
                .arguments
                .first()
                .and_then(|arg| arg.as_expression())
                .and_then(|expr| {
                    if let Expression::ArrayExpression(arr) = expr {
                        let strings: Vec<String> = arr
                            .elements
                            .iter()
                            .filter_map(|el| el.as_expression())
                            // Use resolve_string_from_expression to handle variable references
                            .filter_map(|e| self.resolve_string_from_expression(e))
                            .collect();
                        Some(strings)
                    } else {
                        None
                    }
                })
                .unwrap_or_default();

            let assertion = TestAssertion::SerializeNodes { input, expected };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }

    /// Extract input from ast.rootNodes where ast = parser.parse(input, ...)
    pub(super) fn extract_root_nodes_input(&self, expr: Option<&Expression<'_>>) -> Option<String> {
        let expr = expr?;
        // Pattern: ast.rootNodes where ast is identifier or parser.parse().rootNodes
        if let Expression::StaticMemberExpression(member) = expr
            && member.property.name == "rootNodes"
        {
            // Pattern 1: parser.parse().rootNodes (inline)
            if let Expression::CallExpression(parse_call) = &member.object {
                if let Expression::StaticMemberExpression(parse_member) = &parse_call.callee
                    && parse_member.property.name == "parse"
                {
                    // Try to resolve the input (could be literal or variable)
                    return self.resolve_string_value(parse_call.arguments.first());
                }
            }
            // Pattern 2: ast.rootNodes where ast is a variable from parser.parse()
            else if let Expression::Identifier(id) = &member.object
                && let Some(input) = self.pending_parse_results.get(id.name.as_str())
            {
                return Some(input.clone());
            }
        }
        None
    }

    // ========== Shadow CSS Handlers ==========

    /// Handle expect(shim(css, contentAttr, hostAttr?)).toEqualCss/toEqual/toBe(expected)
    pub(super) fn handle_shim_css(
        &mut self,
        shim_call: &CallExpression<'_>,
        matcher_call: &CallExpression<'_>,
        normalized: bool,
    ) {
        // Extract shim arguments: shim(css, contentAttr, hostAttr?)
        let input = shim_call.arguments.first().and_then(|a| self.extract_arg_string(a));
        let content_attr = shim_call.arguments.get(1).and_then(|a| self.extract_arg_string(a));
        let host_attr = shim_call.arguments.get(2).and_then(|a| self.extract_arg_string(a));

        // Extract expected value from matcher
        let expected = matcher_call.arguments.first().and_then(|a| self.extract_arg_string(a));

        if let (Some(input), Some(content_attr), Some(expected)) = (input, content_attr, expected) {
            let assertion =
                TestAssertion::ShimCss { input, content_attr, host_attr, expected, normalized };
            if let Some(test) = &mut self.current_test {
                test.assertions.push(assertion);
            }
        }
    }
}
