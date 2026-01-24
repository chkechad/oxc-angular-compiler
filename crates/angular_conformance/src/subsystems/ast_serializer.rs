use oxc_allocator::Allocator;
use oxc_angular_compiler::ast::html::{
    HtmlAttribute, HtmlBlock, HtmlComment, HtmlComponent, HtmlDirective, HtmlElement,
    HtmlExpansion, HtmlExpansionCase, HtmlLetDeclaration, HtmlNode, HtmlText,
};
use oxc_angular_compiler::parser::html::HtmlParser;

use super::SubsystemRunner;
use super::unparser::unparse_expression;
use crate::test_case::{TestAssertion, TestResult};

/// Runner for Angular AST serializer conformance tests
/// Tests serializeNodes() function
pub struct AstSerializerRunner;

impl AstSerializerRunner {
    pub fn new() -> Self {
        Self
    }

    /// Parse HTML and serialize the resulting nodes back to strings.
    /// Returns a vector of serialized strings, one per top-level node.
    fn parse_and_serialize(&self, input: &str) -> Vec<String> {
        let allocator = Allocator::default();
        // Enable expansion forms to handle ICU message syntax
        let parser = HtmlParser::with_expansion_forms(&allocator, input, "test.html");
        let result = parser.parse();

        serialize_nodes(&result.nodes)
    }
}

impl Default for AstSerializerRunner {
    fn default() -> Self {
        Self::new()
    }
}

impl SubsystemRunner for AstSerializerRunner {
    fn name(&self) -> &'static str {
        "ast_serializer"
    }

    fn description(&self) -> &'static str {
        "Angular AST serializer (serializeNodes)"
    }

    fn can_handle(&self, assertion: &TestAssertion) -> bool {
        matches!(assertion, TestAssertion::SerializeNodes { .. })
    }

    fn run_assertion(&self, assertion: &TestAssertion) -> TestResult {
        match assertion {
            TestAssertion::SerializeNodes { input, expected } => {
                let actual = self.parse_and_serialize(input);

                if actual == *expected {
                    TestResult::Passed
                } else {
                    TestResult::Failed {
                        expected: format!("{expected:?}"),
                        actual: format!("{actual:?}"),
                        diff: None,
                    }
                }
            }
            _ => TestResult::Skipped { reason: "Not handled by ast serializer runner".to_string() },
        }
    }
}

// ============================================================================
// AST Serializer - Converts HTML AST nodes back to string representation
// ============================================================================

/// Serialize a list of HTML AST nodes to strings.
/// Returns one string per top-level node (matching Angular's serializeNodes behavior).
fn serialize_nodes(nodes: &[HtmlNode<'_>]) -> Vec<String> {
    nodes.iter().map(|node| serialize_node(node)).collect()
}

/// Serialize a single HTML AST node to a string.
fn serialize_node(node: &HtmlNode<'_>) -> String {
    match node {
        HtmlNode::Text(text) => serialize_text(text),
        HtmlNode::Element(element) => serialize_element(element),
        HtmlNode::Component(component) => serialize_component(component),
        HtmlNode::Attribute(attr) => serialize_attribute(attr),
        HtmlNode::Comment(comment) => serialize_comment(comment),
        HtmlNode::Expansion(expansion) => serialize_expansion(expansion),
        HtmlNode::ExpansionCase(case) => serialize_expansion_case(case),
        HtmlNode::Block(block) => serialize_block(block),
        HtmlNode::BlockParameter(param) => param.expression.to_string(),
        HtmlNode::LetDeclaration(decl) => serialize_let_declaration(decl),
    }
}

/// Serialize a text node.
fn serialize_text(text: &HtmlText<'_>) -> String {
    text.value.to_string()
}

/// Serialize an element node.
fn serialize_element(element: &HtmlElement<'_>) -> String {
    let attrs = visit_all_with_prefix(&element.attrs, " ", " ");
    let directives = visit_all_with_prefix(&element.directives, " ", " ");

    if element.is_void {
        format!("<{}{}{}/>", element.name, attrs, directives)
    } else {
        let children = visit_all_children(&element.children, "");
        format!("<{}{}{}>{}</{}>", element.name, attrs, directives, children, element.name)
    }
}

/// Serialize a component node.
fn serialize_component(component: &HtmlComponent<'_>) -> String {
    let attrs = visit_all_with_prefix(&component.attrs, " ", " ");
    let directives = visit_all_with_prefix(&component.directives, " ", " ");
    let children = visit_all_children(&component.children, "");
    format!(
        "<{}{}{}>{}</{}>",
        component.full_name, attrs, directives, children, component.full_name
    )
}

/// Serialize an attribute node.
fn serialize_attribute(attr: &HtmlAttribute<'_>) -> String {
    format!("{}=\"{}\"", attr.name, attr.value)
}

/// Serialize a comment node.
fn serialize_comment(comment: &HtmlComment<'_>) -> String {
    format!("<!--{}-->", comment.value)
}

/// Serialize an ICU expansion node.
fn serialize_expansion(expansion: &HtmlExpansion<'_>) -> String {
    let cases = visit_all_cases(&expansion.cases, "");
    format!("{{{}, {},{}}}", expansion.switch_value, expansion.expansion_type, cases)
}

/// Serialize an ICU expansion case node.
fn serialize_expansion_case(case: &HtmlExpansionCase<'_>) -> String {
    let expression = visit_all_children(&case.expansion, "");
    format!(" {} {{{}}}", case.value, expression)
}

/// Serialize a block node.
fn serialize_block(block: &HtmlBlock<'_>) -> String {
    let params = if block.parameters.is_empty() {
        " ".to_string()
    } else {
        let params_str =
            block.parameters.iter().map(|p| p.expression.to_string()).collect::<Vec<_>>().join(";");
        format!(" ({params_str}) ")
    };
    let children = visit_all_children(&block.children, "");
    format!("@{}{}{{{}}}", block.name, params, children)
}

/// Serialize a let declaration node.
fn serialize_let_declaration(decl: &HtmlLetDeclaration<'_>) -> String {
    // Note: Angular's serializer uses decl.value directly as a string.
    // Our HtmlLetDeclaration stores value as AngularExpression, but we need the raw text.
    // For conformance tests, we need to get the raw source text.
    // However, looking at the fixture tests, there are no @let tests in the serializer spec,
    // so we'll implement a basic version using the unparser pattern.
    format!("@let {} = {};", decl.name, unparse_expression(&decl.value))
}

/// Serialize a directive node.
fn serialize_directive(directive: &HtmlDirective<'_>) -> String {
    let attrs = visit_all_with_prefix(&directive.attrs, " ", " ");
    format!("@{}{}", directive.name, attrs)
}

/// Helper to visit all attributes/directives with a separator and prefix.
fn visit_all_with_prefix<T: Serializable>(nodes: &[T], separator: &str, prefix: &str) -> String {
    if nodes.is_empty() {
        String::new()
    } else {
        let items: Vec<String> = nodes.iter().map(Serializable::serialize).collect();
        format!("{}{}", prefix, items.join(separator))
    }
}

/// Helper to visit all child nodes with a separator.
fn visit_all_children(nodes: &[HtmlNode<'_>], separator: &str) -> String {
    if nodes.is_empty() {
        String::new()
    } else {
        let items: Vec<String> = nodes.iter().map(serialize_node).collect();
        items.join(separator)
    }
}

/// Helper to visit all expansion cases with a separator.
fn visit_all_cases(cases: &[HtmlExpansionCase<'_>], separator: &str) -> String {
    if cases.is_empty() {
        String::new()
    } else {
        let items: Vec<String> = cases.iter().map(serialize_expansion_case).collect();
        items.join(separator)
    }
}

/// Trait for types that can be serialized to strings.
trait Serializable {
    fn serialize(&self) -> String;
}

impl Serializable for HtmlAttribute<'_> {
    fn serialize(&self) -> String {
        serialize_attribute(self)
    }
}

impl Serializable for HtmlDirective<'_> {
    fn serialize(&self) -> String {
        serialize_directive(self)
    }
}
