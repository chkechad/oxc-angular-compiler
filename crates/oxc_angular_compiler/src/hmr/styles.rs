//! Style HMR support.
//!
//! This module provides functionality for generating style-related HMR artifacts.
//!
//! **Note**: Style HMR listeners (`import.meta.hot?.on(...)`) should be injected
//! by the build tool (Vite/Webpack), not by this compiler. This matches Angular's
//! architecture where style HMR is handled by the dev server infrastructure.
//!
//! This module provides:
//! - `generate_style_update_module`: Creates a JS module for serving style updates

/// Generate a standalone style update module.
///
/// This is used to serve style updates from the Vite dev server.
/// The build tool can dynamically import this module when styles change.
///
/// # Example Output
///
/// ```javascript
/// // Style update for: src/app/app.component.ts@AppComponent
/// export default {
///   componentId: "src/app/app.component.ts@AppComponent",
///   styles: [
///     "h1 { color: red; }",
///     ".container { padding: 10px; }",
///   ],
/// };
/// ```
pub fn generate_style_update_module(component_id: &str, styles: &[String]) -> String {
    let mut output = String::new();

    output.push_str(&format!("// Style update for: {}\n", component_id));
    output.push_str("export default {\n");
    output.push_str(&format!("  componentId: {:?},\n", component_id));
    output.push_str("  styles: [\n");

    for style in styles {
        // Escape the style for JavaScript
        output.push_str(&format!("    {:?},\n", style));
    }

    output.push_str("  ],\n");
    output.push_str("};\n");

    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_style_update_module() {
        let result = generate_style_update_module(
            "src/app/app.component.ts@AppComponent",
            &["h1 { color: red; }".to_string(), ".container { padding: 10px; }".to_string()],
        );

        assert!(result.contains("export default {"));
        assert!(result.contains("componentId:"));
        assert!(result.contains("styles:"));
        assert!(result.contains("color: red"));
        assert!(result.contains("padding: 10px"));
    }
}
