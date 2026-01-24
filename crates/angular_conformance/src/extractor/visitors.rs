//! AST visitor implementation for spec extraction.
//!
//! Contains the `Visit` trait implementation for `SpecExtractor` that walks
//! the AST to find test structures and assertions.

use oxc_ast::ast::{BindingPattern, CallExpression, Expression, Statement, VariableDeclarator};
use oxc_ast_visit::Visit;

use crate::test_case::{ExpressionTokenAssertionType, HtmlLexerTestType};

use super::SpecExtractor;

impl SpecExtractor {
    /// Get the chained tokenize call from a .toEqual() expression
    /// Pattern: expect(tokenizeAndHumanizeXxx(...)).toEqual([...])
    pub(super) fn get_chained_tokenize_call<'b>(
        &self,
        to_equal_expr: &'b CallExpression<'b>,
    ) -> Option<(&'b CallExpression<'b>, HtmlLexerTestType)> {
        if let Expression::StaticMemberExpression(member) = &to_equal_expr.callee
            && member.property.name == "toEqual"
        {
            // The object is expect(tokenizeAndHumanizeXxx(...))
            if let Expression::CallExpression(expect_call) = &member.object
                && let Some(name) = self.get_callee_name(expect_call)
                && name == "expect"
            {
                // Get the first argument to expect(), which is the tokenize call
                if let Some(arg) = expect_call.arguments.first()
                    && let Some(Expression::CallExpression(tokenize_call)) = arg.as_expression()
                    && let Some(tokenize_name) = self.get_callee_name(tokenize_call)
                {
                    let test_type = match tokenize_name.as_str() {
                        "tokenizeAndHumanizeParts" => Some(HtmlLexerTestType::HumanizeParts),
                        "tokenizeAndHumanizeLineColumn" => {
                            Some(HtmlLexerTestType::HumanizeLineColumn)
                        }
                        "tokenizeAndHumanizeSourceSpans" => {
                            Some(HtmlLexerTestType::HumanizeSourceSpans)
                        }
                        "tokenizeAndHumanizeFullStart" => {
                            Some(HtmlLexerTestType::HumanizeFullStart)
                        }
                        "tokenizeAndHumanizeErrors" => Some(HtmlLexerTestType::HumanizeErrors),
                        _ => None,
                    };
                    if let Some(test_type) = test_type {
                        return Some((tokenize_call, test_type));
                    }
                }
            }
        }
        None
    }

    /// Check if this is an expect(tokens.length).toEqual(n) chain
    pub(super) fn is_tokens_length_to_equal(&self, to_equal_expr: &CallExpression<'_>) -> bool {
        // Pattern: expect(tokens.length).toEqual(n)
        // callee is expect(...).toEqual where expect arg is tokens.length
        if let Expression::StaticMemberExpression(member) = &to_equal_expr.callee
            && member.property.name == "toEqual"
            && let Expression::CallExpression(expect_call) = &member.object
            && let Some(name) = self.get_callee_name(expect_call)
            && name == "expect"
        {
            // Check if argument is tokens.length
            if let Some(arg) = expect_call.arguments.first()
                && let Some(Expression::StaticMemberExpression(inner)) = arg.as_expression()
                && inner.property.name == "length"
                && let Expression::Identifier(id) = &inner.object
            {
                return id.name == "tokens";
            }
        }
        false
    }

    /// Check if this is a .toEqual() call chained to expectFromHtml()
    /// Returns the expectFromHtml CallExpression if found
    pub(super) fn get_chained_expect_from_html<'b>(
        &self,
        to_equal_expr: &'b CallExpression<'b>,
    ) -> Option<&'b CallExpression<'b>> {
        // For expr.toEqual([...]), the callee is a StaticMemberExpression
        // where object is the preceding call (e.g., expectFromHtml(...))
        if let Expression::StaticMemberExpression(member) = &to_equal_expr.callee
            && member.property.name == "toEqual"
        {
            // The object could be expectFromHtml(...) directly, or
            // a chain like expectFromHtml(...).not
            if let Expression::CallExpression(call) = &member.object
                && let Some(name) = self.get_callee_name(call)
                && name == "expectFromHtml"
            {
                return Some(call);
            }
        }
        None
    }

    /// Check if this is a expect(humanizeDom(...)).toEqual([...]) chain
    /// Returns (humanizeDom call, is_source_spans) if found
    pub(super) fn get_chained_humanize_dom<'b>(
        &self,
        to_equal_expr: &'b CallExpression<'b>,
    ) -> Option<(&'b CallExpression<'b>, bool)> {
        if let Expression::StaticMemberExpression(member) = &to_equal_expr.callee
            && member.property.name == "toEqual"
        {
            // Check for expect(...) call
            if let Expression::CallExpression(expect_call) = &member.object
                && let Some(name) = self.get_callee_name(expect_call)
                && name == "expect"
            {
                // Get the first argument to expect(), should be humanizeDom(...)
                if let Some(arg) = expect_call.arguments.first()
                    && let Some(Expression::CallExpression(humanize_call)) = arg.as_expression()
                    && let Some(humanize_name) = self.get_callee_name(humanize_call)
                {
                    if humanize_name == "humanizeDom" {
                        return Some((humanize_call.as_ref(), false));
                    } else if humanize_name == "humanizeDomSourceSpans" {
                        return Some((humanize_call.as_ref(), true));
                    }
                }
            }
        }
        None
    }

    /// Check if this is expect(serialize(parse(...))).toBe(...) or expect(unparse(parse(...))).toBe(...)
    /// Returns (input_string, is_unparse) if found
    pub(super) fn get_chained_serialize_parse(
        &self,
        to_be_expr: &CallExpression<'_>,
    ) -> Option<(String, bool)> {
        if let Expression::StaticMemberExpression(member) = &to_be_expr.callee
            && member.property.name == "toBe"
            && let Expression::CallExpression(expect_call) = &member.object
            && let Some(name) = self.get_callee_name(expect_call)
            && name == "expect"
        {
            // Get first arg: serialize(parse(...)) or unparse(parse(...))
            if let Some(arg) = expect_call.arguments.first()
                && let Some(Expression::CallExpression(serialize_call)) = arg.as_expression()
                && let Some(serialize_name) = self.get_callee_name(serialize_call)
            {
                let is_serialize = serialize_name == "serialize";
                let is_unparse = serialize_name == "unparse";
                if is_serialize || is_unparse {
                    // Get first arg: parse(...)
                    if let Some(parse_arg) = serialize_call.arguments.first()
                        && let Some(Expression::CallExpression(parse_call)) =
                            parse_arg.as_expression()
                        && let Some(parse_name) = self.get_callee_name(parse_call)
                        && (parse_name == "parse" || parse_name == "parseAction")
                    {
                        // Get input string
                        if let Some(input) =
                            parse_call.arguments.first().and_then(|a| self.extract_arg_string(a))
                        {
                            return Some((input, is_unparse));
                        }
                    }
                }
            }
        }
        None
    }

    /// Check if this is expect(parseStyle(...)).toEqual([...])
    pub(super) fn get_chained_parse_style<'b>(
        &self,
        to_equal_expr: &'b CallExpression<'b>,
    ) -> Option<&'b CallExpression<'b>> {
        if let Expression::StaticMemberExpression(member) = &to_equal_expr.callee
            && member.property.name == "toEqual"
            && let Expression::CallExpression(expect_call) = &member.object
            && let Some(name) = self.get_callee_name(expect_call)
            && name == "expect"
            && let Some(arg) = expect_call.arguments.first()
            && let Some(Expression::CallExpression(parse_style_call)) = arg.as_expression()
            && let Some(parse_name) = self.get_callee_name(parse_style_call)
            && parse_name == "parseStyle"
        {
            return Some(parse_style_call);
        }
        None
    }

    /// Check if this is expect(identifier).toEqual([...]) where identifier was assigned from a parse call
    /// Returns (parse_function_name, input_string) if found
    pub(super) fn get_variable_reference_in_expect(
        &self,
        to_equal_expr: &CallExpression<'_>,
    ) -> Option<(String, String)> {
        if let Expression::StaticMemberExpression(member) = &to_equal_expr.callee
            && member.property.name == "toEqual"
            && let Expression::CallExpression(expect_call) = &member.object
            && let Some(name) = self.get_callee_name(expect_call)
            && name == "expect"
            && let Some(arg) = expect_call.arguments.first()
            && let Some(Expression::Identifier(id)) = arg.as_expression()
        {
            // Look up the variable in our tracked assignments
            if let Some((fn_name, input)) = self.pending_parse_assignments.get(id.name.as_str()) {
                return Some((fn_name.clone(), input.clone()));
            }
        }
        None
    }

    /// Check if this is expect(parseAction(...).errors).toEqual([])
    /// or expect(parseBinding(...).errors).toEqual([])
    /// Returns (function_name, input) if found
    pub(super) fn get_chained_errors_to_equal(
        &self,
        to_equal_expr: &CallExpression<'_>,
    ) -> Option<(String, String)> {
        if let Expression::StaticMemberExpression(member) = &to_equal_expr.callee
            && member.property.name == "toEqual"
            && let Expression::CallExpression(expect_call) = &member.object
            && let Some(name) = self.get_callee_name(expect_call)
            && name == "expect"
            && let Some(arg) = expect_call.arguments.first()
        {
            // Check for parseAction(...).errors or parseBinding(...).errors
            if let Some(Expression::StaticMemberExpression(errors_member)) = arg.as_expression()
                && errors_member.property.name == "errors"
                && let Expression::CallExpression(parse_call) = &errors_member.object
                && let Some(parse_name) = self.get_callee_name(parse_call)
                && let Some(input) =
                    parse_call.arguments.first().and_then(|a| self.extract_arg_string(a))
            {
                return Some((parse_name, input));
            }
        }
        None
    }

    /// Check if this is expect(hyphenate(...)).toEqual(...)
    pub(super) fn get_chained_hyphenate<'b>(
        &self,
        to_equal_expr: &'b CallExpression<'b>,
    ) -> Option<&'b CallExpression<'b>> {
        self.get_chained_function_call(to_equal_expr, "toEqual", "hyphenate")
    }

    /// Check if this is expect(hyphenate(...)).toBe(...)
    pub(super) fn get_chained_hyphenate_for_to_be<'b>(
        &self,
        to_be_expr: &'b CallExpression<'b>,
    ) -> Option<&'b CallExpression<'b>> {
        self.get_chained_function_call(to_be_expr, "toBe", "hyphenate")
    }

    /// Check if this is expect(parseAndRemoveWS(...)).toEqual([...])
    pub(super) fn get_chained_parse_and_remove_ws<'b>(
        &self,
        to_equal_expr: &'b CallExpression<'b>,
    ) -> Option<&'b CallExpression<'b>> {
        self.get_chained_function_call(to_equal_expr, "toEqual", "parseAndRemoveWS")
    }

    /// Check if this is expect(humanizeExpressionSource(...)).toEqual([...])
    pub(super) fn get_chained_humanize_expression_source<'b>(
        &self,
        to_equal_expr: &'b CallExpression<'b>,
    ) -> Option<&'b CallExpression<'b>> {
        self.get_chained_function_call(to_equal_expr, "toEqual", "humanizeExpressionSource")
    }

    /// Check if this is expect(humanizeExpressionSource(...)).toContain([...])
    pub(super) fn get_chained_humanize_expression_source_for_to_contain<'b>(
        &self,
        to_contain_expr: &'b CallExpression<'b>,
    ) -> Option<&'b CallExpression<'b>> {
        self.get_chained_function_call(to_contain_expr, "toContain", "humanizeExpressionSource")
    }

    /// Check if this is expect(serializeNodes(...)).toEqual([...])
    pub(super) fn get_chained_serialize_nodes<'b>(
        &self,
        to_equal_expr: &'b CallExpression<'b>,
    ) -> Option<&'b CallExpression<'b>> {
        self.get_chained_function_call(to_equal_expr, "toEqual", "serializeNodes")
    }

    /// Check if this is expect(shim(...)).matcher(...) for Shadow CSS tests
    /// Returns the shim CallExpression if the pattern matches
    pub(super) fn get_chained_shim_call<'b>(
        &self,
        matcher_expr: &'b CallExpression<'b>,
        matcher_name: &str,
    ) -> Option<&'b CallExpression<'b>> {
        if let Expression::StaticMemberExpression(member) = &matcher_expr.callee
            && member.property.name == matcher_name
            && let Expression::CallExpression(expect_call) = &member.object
            && let Some(name) = self.get_callee_name(expect_call)
            && name == "expect"
            && let Some(arg) = expect_call.arguments.first()
            && let Some(Expression::CallExpression(shim_call)) = arg.as_expression()
            && let Some(fn_name) = self.get_callee_name(shim_call)
            && fn_name == "shim"
        {
            return Some(shim_call);
        }
        None
    }
}

impl<'a> Visit<'a> for SpecExtractor {
    fn visit_call_expression(&mut self, expr: &CallExpression<'a>) {
        let callee_name = self.get_callee_name(expr);

        match callee_name.as_deref() {
            // Test structure
            Some("describe" | "fdescribe") => {
                self.handle_describe(expr);
                return; // Don't continue walking, we handle the body ourselves
            }
            Some("it" | "fit") => {
                self.handle_it(expr);
                return; // Don't continue walking, we handle the body ourselves
            }
            // Skip xdescribe and xit (disabled tests)
            Some("xdescribe" | "xit") => {
                return;
            }
            // Expression parser assertions
            Some("checkAction") => {
                self.handle_check_action(expr);
            }
            Some("checkBinding") => {
                self.handle_check_binding(expr);
            }
            Some("expectActionError") => {
                self.handle_expect_action_error(expr);
            }
            Some("expectBindingError") => {
                self.handle_expect_binding_error(expr);
            }
            Some("checkActionWithError") => {
                self.handle_check_action_with_error(expr);
            }
            // HTML parser assertions
            Some("humanizeDom") => {
                self.handle_humanize_dom(expr);
            }
            // Expression lexer: lex('input')
            Some("lex") => {
                self.handle_lex(expr);
            }
            // Expression lexer: expectXxxToken calls
            Some("expectIdentifierToken") => {
                self.handle_expect_token(expr, ExpressionTokenAssertionType::Identifier);
            }
            Some("expectKeywordToken") => {
                self.handle_expect_token(expr, ExpressionTokenAssertionType::Keyword);
            }
            Some("expectNumberToken") => {
                self.handle_expect_token(expr, ExpressionTokenAssertionType::Number);
            }
            Some("expectStringToken") => {
                self.handle_expect_token(expr, ExpressionTokenAssertionType::String);
            }
            Some("expectCharacterToken") => {
                self.handle_expect_token(expr, ExpressionTokenAssertionType::Character);
            }
            Some("expectOperatorToken") => {
                self.handle_expect_token(expr, ExpressionTokenAssertionType::Operator);
            }
            Some("expectErrorToken") => {
                self.handle_expect_token(expr, ExpressionTokenAssertionType::Error);
            }
            Some("expectPrivateIdentifierToken") => {
                self.handle_expect_token(expr, ExpressionTokenAssertionType::PrivateIdentifier);
            }
            Some("expectRegExpBodyToken") => {
                self.handle_expect_token(expr, ExpressionTokenAssertionType::RegExpBody);
            }
            Some("expectRegExpFlagsToken") => {
                self.handle_expect_token(expr, ExpressionTokenAssertionType::RegExpFlags);
            }
            // Handle .toEqual() chains
            Some("toEqual") => {
                // Check for expectFromHtml(...).toEqual(...)
                if let Some(expect_call) = self.get_chained_expect_from_html(expr) {
                    self.handle_expect_from_html_to_equal(expect_call, expr);
                }
                // Check for expect(tokens.length).toEqual(n)
                else if self.is_tokens_length_to_equal(expr) {
                    self.handle_tokens_length_to_equal(expr);
                }
                // Check for tokenizeAndHumanizeXxx(...).toEqual([...])
                else if let Some((tokenize_call, test_type)) =
                    self.get_chained_tokenize_call(expr)
                {
                    self.handle_html_lexer_to_equal(tokenize_call, expr, test_type);
                }
                // Check for expect(humanizeDom(...)).toEqual([...])
                else if let Some((humanize_call, is_source_spans)) =
                    self.get_chained_humanize_dom(expr)
                {
                    self.handle_humanize_dom_to_equal(humanize_call, expr, is_source_spans);
                }
                // Check for expect(parseStyle(...)).toEqual([...])
                else if let Some(parse_style_call) = self.get_chained_parse_style(expr) {
                    self.handle_parse_style_to_equal(parse_style_call, expr);
                }
                // Check for expect(identifier).toEqual([...]) where identifier was assigned from parseStyle
                else if let Some((fn_name, input)) = self.get_variable_reference_in_expect(expr) {
                    self.handle_variable_expect_to_equal(&fn_name, &input, expr);
                }
                // Check for expect(parseAction(...).errors).toEqual([])
                else if let Some((fn_name, input)) = self.get_chained_errors_to_equal(expr) {
                    self.handle_errors_to_equal(&fn_name, &input, expr);
                }
                // Check for expect(hyphenate(...)).toEqual(...)
                else if let Some(hyphenate_call) = self.get_chained_hyphenate(expr) {
                    self.handle_hyphenate_to_equal(hyphenate_call, expr);
                }
                // Check for expect(parseAndRemoveWS(...)).toEqual([...])
                else if let Some(parse_ws_call) = self.get_chained_parse_and_remove_ws(expr) {
                    self.handle_parse_and_remove_ws_to_equal(parse_ws_call, expr);
                }
                // Check for expect(humanizeExpressionSource(...)).toEqual([...])
                else if let Some(humanize_expr_call) =
                    self.get_chained_humanize_expression_source(expr)
                {
                    self.handle_humanize_expression_source_to_equal(humanize_expr_call, expr);
                }
                // Check for expect(serializeNodes(...)).toEqual([...])
                else if let Some(serialize_nodes_call) = self.get_chained_serialize_nodes(expr) {
                    self.handle_serialize_nodes_to_equal(serialize_nodes_call, expr);
                }
                // Check for expect(shim(...)).toEqual(...)
                else if let Some(shim_call) = self.get_chained_shim_call(expr, "toEqual") {
                    self.handle_shim_css(shim_call, expr, false);
                }
            }
            // Handle .toBe() chains (for string comparisons like serialize tests)
            Some("toBe") => {
                // Check for expect(serialize(parse(...))).toBe(...)
                if let Some((input, is_unparse)) = self.get_chained_serialize_parse(expr) {
                    self.handle_serialize_expression_to_be(&input, is_unparse, expr);
                }
                // Check for expect(hyphenate(...)).toBe(...)
                else if let Some(hyphenate_call) = self.get_chained_hyphenate_for_to_be(expr) {
                    self.handle_hyphenate_to_be(hyphenate_call, expr);
                }
                // Check for expect(shim(...)).toBe(...)
                else if let Some(shim_call) = self.get_chained_shim_call(expr, "toBe") {
                    self.handle_shim_css(shim_call, expr, false);
                }
            }
            // Handle .toContain() chains (for partial array matching)
            Some("toContain") => {
                // Check for expect(humanizeExpressionSource(...)).toContain([...])
                if let Some(humanize_expr_call) =
                    self.get_chained_humanize_expression_source_for_to_contain(expr)
                {
                    self.handle_humanize_expression_source_to_contain(humanize_expr_call, expr);
                }
            }
            // Handle .toEqualCss() chains (for Shadow CSS tests with normalization)
            Some("toEqualCss") => {
                // Check for expect(shim(...)).toEqualCss(...)
                if let Some(shim_call) = self.get_chained_shim_call(expr, "toEqualCss") {
                    self.handle_shim_css(shim_call, expr, true);
                }
            }
            _ => {}
        }

        // Continue visiting children for nested calls
        for arg in &expr.arguments {
            if let Some(expr) = arg.as_expression() {
                self.visit_expression(expr);
            }
        }
    }

    fn visit_statement(&mut self, stmt: &Statement<'a>) {
        // Walk all statements to find test structures
        oxc_ast_visit::walk::walk_statement(self, stmt);
    }

    fn visit_variable_declarator(&mut self, decl: &VariableDeclarator<'a>) {
        // Track variable assignments from various sources
        if let Some(init) = &decl.init {
            // Track string assignments: literals, template literals, or concatenations
            // const html = '<p></p>'
            // const html = `text`
            // const html = 'a' + 'b' + 'c'
            if let Some(string_value) = self.resolve_string_from_expression(init)
                && let BindingPattern::BindingIdentifier(id) = &decl.id
            {
                self.pending_string_assignments.insert(id.name.to_string(), string_value);
            }
            // Track parser.parse() assignments: const ast = parser.parse(html, 'url')
            if let Expression::CallExpression(call) = init {
                if let Expression::StaticMemberExpression(member) = &call.callee
                    && member.property.name == "parse"
                {
                    // Resolve the input (could be string literal or variable)
                    if let Some(input) = self.resolve_string_value(call.arguments.first())
                        && let BindingPattern::BindingIdentifier(id) = &decl.id
                    {
                        self.pending_parse_results.insert(id.name.to_string(), input);
                    }
                }
                // Track function call assignments: const result = parseStyle('input')
                if let Some(callee_name) = self.get_callee_name(call)
                    && let Some(input) =
                        call.arguments.first().and_then(|a| self.extract_arg_string(a))
                    && let BindingPattern::BindingIdentifier(id) = &decl.id
                {
                    self.pending_parse_assignments
                        .insert(id.name.to_string(), (callee_name, input));
                }
            }
        }
        oxc_ast_visit::walk::walk_variable_declarator(self, decl);
    }
}
