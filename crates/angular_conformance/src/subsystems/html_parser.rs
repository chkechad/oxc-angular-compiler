use oxc_allocator::Allocator;
use oxc_angular_compiler::ast::html::{
    HtmlAttribute, HtmlBlock, HtmlComment, HtmlElement, HtmlExpansion, HtmlExpansionCase,
    HtmlLetDeclaration, HtmlNode, HtmlText, Visitor, visit_all,
};
use oxc_angular_compiler::parser::html::HtmlParser;
use oxc_span::Span;

use super::SubsystemRunner;
use super::unparser::unparse_expression;
use crate::test_case::{TestAssertion, TestResult};

/// Runner for Angular HTML parser conformance tests
pub struct HtmlParserRunner;

impl HtmlParserRunner {
    pub fn new() -> Self {
        Self
    }

    /// Parse HTML and return humanized output as JSON values (without source spans)
    fn parse_and_humanize(&self, text: &str) -> (Vec<serde_json::Value>, Vec<String>) {
        let allocator = Allocator::default();
        // Enable expansion forms to handle ICU message syntax
        let parser = HtmlParser::with_expansion_forms(&allocator, text, "test.html");
        let result = parser.parse();

        let humanized = Humanizer::humanize_nodes(&result.nodes);
        let errors: Vec<String> = result.errors.iter().map(|e| e.msg.clone()).collect();

        (humanized, errors)
    }

    /// Parse HTML and return humanized output with source spans included
    fn parse_and_humanize_with_spans(
        &self,
        text: &str,
        options: Option<&crate::test_case::HtmlParserOptions>,
    ) -> (Vec<serde_json::Value>, Vec<String>) {
        let allocator = Allocator::default();

        // Check if we have leading trivia chars option
        let trivia_chars: Option<Vec<char>> = options.and_then(|opts| {
            opts.leading_trivia_chars
                .as_ref()
                .map(|chars| chars.iter().filter_map(|s| s.chars().next()).collect())
        });

        // Enable expansion forms to handle ICU message syntax
        let parser = if let Some(chars) = trivia_chars {
            HtmlParser::with_expansion_forms_and_trivia(&allocator, text, "test.html", chars)
        } else {
            HtmlParser::with_expansion_forms(&allocator, text, "test.html")
        };

        let result = parser.parse();

        let humanized = SourceSpanHumanizer::humanize_nodes(&result.nodes, text);
        let errors: Vec<String> = result.errors.iter().map(|e| e.msg.clone()).collect();

        (humanized, errors)
    }

    /// Extract the node type name from a JSON value like "html.Text" -> "Text"
    fn extract_node_type(value: &serde_json::Value) -> Option<String> {
        value.as_str().map(|s| s.strip_prefix("html.").unwrap_or(s).to_string())
    }

    /// Compare two node arrays (expected vs actual)
    /// Returns true if they match (considering flexible matching for Angular's format)
    fn compare_nodes(expected: &[serde_json::Value], actual: &[serde_json::Value]) -> bool {
        if expected.len() != actual.len() {
            return false;
        }

        for (exp, act) in expected.iter().zip(actual.iter()) {
            if !Self::compare_node(exp, act) {
                return false;
            }
        }
        true
    }

    /// Compare a single node (expected vs actual)
    /// STRICT: Requires exact match of all fields, not just first 3
    fn compare_node(expected: &serde_json::Value, actual: &serde_json::Value) -> bool {
        match (expected, actual) {
            (serde_json::Value::Array(exp_arr), serde_json::Value::Array(act_arr)) => {
                // STRICT: Require exact same length
                if exp_arr.len() != act_arr.len() {
                    return false;
                }

                if exp_arr.is_empty() {
                    return true;
                }

                // Compare node types (handle html.Text -> Text normalization)
                let exp_type = Self::extract_node_type(&exp_arr[0]);
                let act_type = Self::extract_node_type(&act_arr[0]);
                if exp_type != act_type {
                    return false;
                }

                // STRICT: Compare ALL elements, not just first 3
                for i in 1..exp_arr.len() {
                    if !Self::compare_value(&exp_arr[i], &act_arr[i]) {
                        return false;
                    }
                }
                true
            }
            _ => Self::compare_value(expected, actual),
        }
    }

    /// Compare two JSON values with flexible number comparison
    fn compare_value(expected: &serde_json::Value, actual: &serde_json::Value) -> bool {
        match (expected, actual) {
            // Handle number comparison (0.0 == 0)
            (serde_json::Value::Number(e), serde_json::Value::Number(a)) => {
                let exp_f = e.as_f64().unwrap_or(f64::NAN);
                let act_f = a.as_f64().unwrap_or(f64::NAN);
                (exp_f - act_f).abs() < 0.0001
            }
            // Handle string comparison
            (serde_json::Value::String(e), serde_json::Value::String(a)) => e == a,
            // Handle array comparison recursively
            (serde_json::Value::Array(e), serde_json::Value::Array(a)) => {
                e.len() == a.len()
                    && e.iter().zip(a.iter()).all(|(ev, av)| Self::compare_value(ev, av))
            }
            _ => expected == actual,
        }
    }
}

impl Default for HtmlParserRunner {
    fn default() -> Self {
        Self::new()
    }
}

impl SubsystemRunner for HtmlParserRunner {
    fn name(&self) -> &'static str {
        "html_parser"
    }

    fn description(&self) -> &'static str {
        "Angular HTML template parser"
    }

    fn can_handle(&self, assertion: &TestAssertion) -> bool {
        matches!(
            assertion,
            TestAssertion::HumanizeDom { .. } | TestAssertion::HumanizeDomSourceSpans { .. }
        )
    }

    fn run_assertion(&self, assertion: &TestAssertion) -> TestResult {
        match assertion {
            TestAssertion::HumanizeDom { input, expected } => {
                let (actual, errors) = self.parse_and_humanize(input);

                // If no expected values, just check that parsing succeeds
                if expected.is_empty() {
                    return if errors.is_empty() {
                        TestResult::Passed
                    } else {
                        TestResult::Error { message: format!("Parse errors: {errors:?}") }
                    };
                }

                // Compare with expected values
                if Self::compare_nodes(expected, &actual) {
                    TestResult::Passed
                } else {
                    TestResult::Failed {
                        expected: format!("{expected:?}"),
                        actual: format!("{actual:?}"),
                        diff: None,
                    }
                }
            }

            TestAssertion::HumanizeDomSourceSpans { input, expected, options } => {
                let (actual, errors) = self.parse_and_humanize_with_spans(input, options.as_ref());

                if expected.is_empty() {
                    return if errors.is_empty() {
                        TestResult::Passed
                    } else {
                        TestResult::Error { message: format!("Parse errors: {errors:?}") }
                    };
                }

                // Compare with expected values
                if Self::compare_nodes(expected, &actual) {
                    TestResult::Passed
                } else {
                    TestResult::Failed {
                        expected: format!("{expected:?}"),
                        actual: format!("{actual:?}"),
                        diff: None,
                    }
                }
            }

            _ => TestResult::Skipped { reason: "Not handled by HTML parser runner".to_string() },
        }
    }
}

// ============================================================================
// Humanizer - Convert HTML AST to flat list for comparison (without source spans)
// ============================================================================

/// Humanizer that converts HTML AST to a flat list for test comparison.
struct Humanizer {
    result: Vec<serde_json::Value>,
    depth: i32,
    /// Stack of namespaces for propagation to children
    namespace_stack: Vec<Option<String>>,
}

impl Humanizer {
    fn new() -> Self {
        Humanizer { result: Vec::new(), depth: 0, namespace_stack: Vec::new() }
    }

    fn humanize_nodes(nodes: &[HtmlNode<'_>]) -> Vec<serde_json::Value> {
        let mut humanizer = Humanizer::new();
        visit_all(&mut humanizer, nodes);
        humanizer.result
    }

    fn push_node(&mut self, items: Vec<serde_json::Value>) {
        self.result.push(serde_json::Value::Array(items));
    }

    /// Get the current namespace from parent context (if any)
    fn current_namespace(&self) -> Option<&str> {
        if let Some(s) = self.namespace_stack.iter().rev().flatten().next() {
            return Some(s.as_str());
        }
        None
    }
}

/// SVG elements that should get the SVG namespace inferred
const SVG_TAG_NAMES: &[&str] = &[
    "svg",
    "animate",
    "animateMotion",
    "animateTransform",
    "circle",
    "clipPath",
    "defs",
    "desc",
    "ellipse",
    "feBlend",
    "feColorMatrix",
    "feComponentTransfer",
    "feComposite",
    "feConvolveMatrix",
    "feDiffuseLighting",
    "feDisplacementMap",
    "feDistantLight",
    "feDropShadow",
    "feFlood",
    "feFuncA",
    "feFuncB",
    "feFuncG",
    "feFuncR",
    "feGaussianBlur",
    "feImage",
    "feMerge",
    "feMergeNode",
    "feMorphology",
    "feOffset",
    "fePointLight",
    "feSpecularLighting",
    "feSpotLight",
    "feTile",
    "feTurbulence",
    "filter",
    "foreignObject",
    "g",
    "image",
    "line",
    "linearGradient",
    "marker",
    "mask",
    "metadata",
    "mpath",
    "path",
    "pattern",
    "polygon",
    "polyline",
    "radialGradient",
    "rect",
    "set",
    "stop",
    "switch",
    "symbol",
    "text",
    "textPath",
    "title",
    "tspan",
    "use",
    "view",
];

/// Math elements that should get the Math namespace inferred
const MATH_TAG_NAMES: &[&str] = &["math"];

/// Format element name with namespace prefix
fn format_element_name(name: &str, parent_namespace: Option<&str>) -> (Option<String>, String) {
    if let Some(without_colon) = name.strip_prefix(':') {
        // Already in Angular format (e.g., ":myns:div")
        // Extract namespace from ":ns:name" format
        if let Some(colon_pos) = without_colon.find(':') {
            let ns = without_colon[..colon_pos].to_string();
            (Some(ns), name.to_string()) // Keep name as-is
        } else {
            (None, name.to_string())
        }
    } else if name.contains(':') {
        // Needs colon prefix (e.g., "myns:div" -> ":myns:div")
        let parts: Vec<&str> = name.splitn(2, ':').collect();
        let ns = parts[0].to_string();
        (Some(ns), format!(":{name}"))
    } else if SVG_TAG_NAMES.contains(&name) {
        // SVG element - infer namespace
        (Some("svg".to_string()), format!(":svg:{name}"))
    } else if MATH_TAG_NAMES.contains(&name) {
        // Math element - infer namespace
        (Some("math".to_string()), format!(":math:{name}"))
    } else if let Some(parent_ns) = parent_namespace {
        // Inherit namespace from parent
        (Some(parent_ns.to_string()), format!(":{parent_ns}:{name}"))
    } else {
        // No namespace
        (None, name.to_string())
    }
}

/// Format attribute name with namespace prefix
fn format_attribute_name(name: &str) -> String {
    if name.starts_with(':') {
        name.to_string() // Already has prefix
    } else if name.contains(':') {
        format!(":{name}")
    } else {
        name.to_string()
    }
}

impl<'a> Visitor<'a> for Humanizer {
    fn visit_text(&mut self, text: &HtmlText<'a>) {
        // Angular's humanizer includes tokens array: ...text.tokens.map((token) => token.parts)
        let text_value = text.value.to_string();
        let mut items = vec![
            serde_json::json!("html.Text"),
            serde_json::json!(text_value),
            serde_json::json!(self.depth),
        ];

        // Add each token's parts as a separate array
        for token in &text.tokens {
            let parts: Vec<serde_json::Value> =
                token.parts.iter().map(|p| serde_json::json!(p.to_string())).collect();
            items.push(serde_json::json!(parts));
        }

        self.push_node(items);
    }

    fn visit_element(&mut self, element: &HtmlElement<'a>) {
        let name = element.name.to_string();
        let (namespace, formatted_name) = format_element_name(&name, self.current_namespace());

        let mut items = vec![
            serde_json::json!("html.Element"),
            serde_json::json!(formatted_name),
            serde_json::json!(self.depth),
        ];

        // Add #selfClosing marker if self-closing
        if element.is_self_closing {
            items.push(serde_json::json!("#selfClosing"));
        }

        self.push_node(items);

        // Visit attributes
        for attr in &element.attrs {
            self.visit_attribute(attr);
        }

        // Push namespace context for children
        self.namespace_stack.push(namespace);

        // Visit children
        self.depth += 1;
        visit_all(self, &element.children);
        self.depth -= 1;

        // Pop namespace context
        self.namespace_stack.pop();
    }

    fn visit_attribute(&mut self, attr: &HtmlAttribute<'a>) {
        let formatted_name = format_attribute_name(&attr.name);
        let value = attr.value.to_string();
        let mut items = vec![
            serde_json::json!("html.Attribute"),
            serde_json::json!(formatted_name),
            serde_json::json!(value),
        ];

        // Add value token parts if there are any
        // Angular's humanizer includes: ...valueTokens.map((token) => token.parts)
        if let Some(value_tokens) = &attr.value_tokens {
            for token in value_tokens {
                let parts: Vec<serde_json::Value> =
                    token.parts.iter().map(|p| serde_json::json!(p.to_string())).collect();
                items.push(serde_json::json!(parts));
            }
        } else if !value.is_empty() {
            // Fallback for attributes without tokens - generate a synthetic token
            items.push(serde_json::json!([value]));
        }

        self.push_node(items);
    }

    fn visit_comment(&mut self, comment: &HtmlComment<'a>) {
        // Trim whitespace from comment value (Angular normalizes this)
        let value = comment.value.to_string();
        let trimmed = value.trim();
        self.push_node(vec![
            serde_json::json!("html.Comment"),
            serde_json::json!(trimmed),
            serde_json::json!(self.depth),
        ]);
    }

    fn visit_block(&mut self, block: &HtmlBlock<'a>) {
        self.push_node(vec![
            serde_json::json!("html.Block"),
            serde_json::json!(block.name.to_string()),
            serde_json::json!(self.depth),
        ]);

        // Emit BlockParameter nodes for each parameter
        for param in &block.parameters {
            self.push_node(vec![
                serde_json::json!("html.BlockParameter"),
                serde_json::json!(param.expression.to_string()),
            ]);
        }

        self.depth += 1;
        visit_all(self, &block.children);
        self.depth -= 1;
    }

    fn visit_let_declaration(&mut self, decl: &HtmlLetDeclaration<'a>) {
        self.push_node(vec![
            serde_json::json!("html.LetDeclaration"),
            serde_json::json!(decl.name.to_string()),
            serde_json::json!(unparse_expression(&decl.value)),
        ]);
    }

    fn visit_expansion(&mut self, expansion: &HtmlExpansion<'a>) {
        self.push_node(vec![
            serde_json::json!("html.Expansion"),
            serde_json::json!(expansion.switch_value.to_string()),
            serde_json::json!(expansion.expansion_type.to_string()),
            serde_json::json!(self.depth),
        ]);

        // Visit expansion cases
        self.depth += 1;
        for case in &expansion.cases {
            self.visit_expansion_case(case);
        }
        self.depth -= 1;
    }

    fn visit_expansion_case(&mut self, case: &HtmlExpansionCase<'a>) {
        // Angular's humanizer only emits the case value and depth, not child content
        self.push_node(vec![
            serde_json::json!("html.ExpansionCase"),
            serde_json::json!(case.value.to_string()),
            serde_json::json!(self.depth),
        ]);
    }
}

// ============================================================================
// SourceSpanHumanizer - Convert HTML AST to flat list WITH source spans
// ============================================================================

/// Humanizer that includes source span information in the output.
struct SourceSpanHumanizer<'s> {
    result: Vec<serde_json::Value>,
    depth: i32,
    source: &'s str,
    namespace_stack: Vec<Option<String>>,
}

impl<'s> SourceSpanHumanizer<'s> {
    fn new(source: &'s str) -> Self {
        SourceSpanHumanizer { result: Vec::new(), depth: 0, source, namespace_stack: Vec::new() }
    }

    fn humanize_nodes(nodes: &[HtmlNode<'_>], source: &str) -> Vec<serde_json::Value> {
        let mut humanizer = SourceSpanHumanizer::new(source);
        visit_all(&mut humanizer, nodes);
        humanizer.result
    }

    fn push_node(&mut self, items: Vec<serde_json::Value>) {
        self.result.push(serde_json::Value::Array(items));
    }

    /// Extract source text for a span
    fn span_text(&self, span: Span) -> &str {
        let start = span.start as usize;
        let end = span.end as usize;
        if end <= self.source.len() { &self.source[start..end] } else { "" }
    }

    fn current_namespace(&self) -> Option<&str> {
        if let Some(s) = self.namespace_stack.iter().rev().flatten().next() {
            return Some(s.as_str());
        }
        None
    }
}

impl<'a> Visitor<'a> for SourceSpanHumanizer<'_> {
    fn visit_text(&mut self, text: &HtmlText<'a>) {
        let text_value = text.value.to_string();
        let source_span = self.span_text(text.span);

        let mut items = vec![
            serde_json::json!("html.Text"),
            serde_json::json!(text_value),
            serde_json::json!(self.depth),
        ];

        // Add each token's parts as a separate array
        for token in &text.tokens {
            let parts: Vec<serde_json::Value> =
                token.parts.iter().map(|p| serde_json::json!(p.to_string())).collect();
            items.push(serde_json::json!(parts));
        }

        // Source span (trimmed, after leading trivia stripping)
        items.push(serde_json::json!(source_span));

        // If there's leading trivia (full_start != start), output the full span too
        // This matches Angular's _appendContext behavior
        if let Some(full_start) = text.full_start {
            let full_span_text = &self.source[full_start as usize..text.span.end as usize];
            items.push(serde_json::json!(full_span_text));
        }

        self.push_node(items);
    }

    fn visit_element(&mut self, element: &HtmlElement<'a>) {
        let name = element.name.to_string();
        let (namespace, formatted_name) = format_element_name(&name, self.current_namespace());

        let source_span = self.span_text(element.span);
        let start_span = self.span_text(element.start_span);
        let end_span_opt = element.end_span.map(|s| self.span_text(s).to_string());

        let mut items = vec![
            serde_json::json!("html.Element"),
            serde_json::json!(formatted_name),
            serde_json::json!(self.depth),
            serde_json::json!(source_span),
        ];

        // Add #selfClosing marker before start/end spans if self-closing
        if element.is_self_closing {
            items.push(serde_json::json!("#selfClosing"));
        }

        // Add start and end source spans
        items.push(serde_json::json!(start_span));
        if let Some(end) = end_span_opt {
            items.push(serde_json::json!(end));
        } else {
            items.push(serde_json::Value::Null);
        }

        self.push_node(items);

        // Visit attributes
        for attr in &element.attrs {
            self.visit_attribute(attr);
        }

        // Push namespace context for children
        self.namespace_stack.push(namespace);

        // Visit children
        self.depth += 1;
        visit_all(self, &element.children);
        self.depth -= 1;

        // Pop namespace context
        self.namespace_stack.pop();
    }

    fn visit_attribute(&mut self, attr: &HtmlAttribute<'a>) {
        let formatted_name = format_attribute_name(&attr.name);
        let value = attr.value.to_string();
        let source_span = self.span_text(attr.span);

        let mut items = vec![
            serde_json::json!("html.Attribute"),
            serde_json::json!(formatted_name),
            serde_json::json!(value),
        ];

        // Add value token parts if there are any
        if let Some(value_tokens) = &attr.value_tokens {
            for token in value_tokens {
                let parts: Vec<serde_json::Value> =
                    token.parts.iter().map(|p| serde_json::json!(p.to_string())).collect();
                items.push(serde_json::json!(parts));
            }
        } else if !value.is_empty() {
            // Fallback for attributes without tokens - generate a synthetic token
            items.push(serde_json::json!([value]));
        }

        // Add source span at the end
        items.push(serde_json::json!(source_span));

        self.push_node(items);
    }

    fn visit_comment(&mut self, comment: &HtmlComment<'a>) {
        let value = comment.value.to_string();
        let trimmed = value.trim();
        let source_span = self.span_text(comment.span);

        self.push_node(vec![
            serde_json::json!("html.Comment"),
            serde_json::json!(trimmed),
            serde_json::json!(self.depth),
            serde_json::json!(source_span),
        ]);
    }

    fn visit_block(&mut self, block: &HtmlBlock<'a>) {
        let source_span = self.span_text(block.span);
        let start_span = self.span_text(block.start_span);
        let end_span_opt = block.end_span.map(|s| self.span_text(s).to_string());

        let mut items = vec![
            serde_json::json!("html.Block"),
            serde_json::json!(block.name.to_string()),
            serde_json::json!(self.depth),
            serde_json::json!(source_span),
            serde_json::json!(start_span),
        ];

        if let Some(end) = end_span_opt {
            items.push(serde_json::json!(end));
        } else {
            items.push(serde_json::Value::Null);
        }

        self.push_node(items);

        // Emit BlockParameter nodes for each parameter
        for param in &block.parameters {
            let param_span = self.span_text(param.span);
            self.push_node(vec![
                serde_json::json!("html.BlockParameter"),
                serde_json::json!(param.expression.to_string()),
                serde_json::json!(param_span),
            ]);
        }

        self.depth += 1;
        visit_all(self, &block.children);
        self.depth -= 1;
    }

    fn visit_let_declaration(&mut self, decl: &HtmlLetDeclaration<'a>) {
        let source_span = self.span_text(decl.span);
        let name_span = self.span_text(decl.name_span);
        let value_span = self.span_text(decl.value_span);

        self.push_node(vec![
            serde_json::json!("html.LetDeclaration"),
            serde_json::json!(decl.name.to_string()),
            serde_json::json!(unparse_expression(&decl.value)),
            serde_json::json!(source_span),
            serde_json::json!(name_span),
            serde_json::json!(value_span),
        ]);
    }

    fn visit_expansion(&mut self, expansion: &HtmlExpansion<'a>) {
        let source_span = self.span_text(expansion.span);

        self.push_node(vec![
            serde_json::json!("html.Expansion"),
            serde_json::json!(expansion.switch_value.to_string()),
            serde_json::json!(expansion.expansion_type.to_string()),
            serde_json::json!(self.depth),
            serde_json::json!(source_span),
        ]);

        // Visit expansion cases
        self.depth += 1;
        for case in &expansion.cases {
            self.visit_expansion_case(case);
        }
        self.depth -= 1;
    }

    fn visit_expansion_case(&mut self, case: &HtmlExpansionCase<'a>) {
        let source_span = self.span_text(case.span);

        self.push_node(vec![
            serde_json::json!("html.ExpansionCase"),
            serde_json::json!(case.value.to_string()),
            serde_json::json!(self.depth),
            serde_json::json!(source_span),
        ]);
    }
}
