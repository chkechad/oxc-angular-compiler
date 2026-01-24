//! Angular template conformance testing library.
//!
//! This crate provides a conformance testing framework for validating the oxc Angular
//! compiler against Angular's official TypeScript compiler test specifications.
//!
//! ## Architecture
//!
//! The conformance testing system consists of three main components:
//!
//! 1. **Spec Extractor** ([`SpecExtractor`]) - Parses Angular's TypeScript spec files
//!    and extracts test cases into a portable JSON format.
//!
//! 2. **Subsystem Runners** ([`subsystems`]) - Execute tests against specific compiler
//!    subsystems (expression parser, HTML lexer, template transform, etc.)
//!
//! 3. **Report Generator** ([`ReportGenerator`]) - Produces summary reports and
//!    detailed failure information.
//!
//! ## Usage
//!
//! ```bash
//! # Generate fixtures from Angular TypeScript specs
//! cargo run -p oxc_angular_conformance -- --generate
//!
//! # Run all conformance tests
//! cargo run -p oxc_angular_conformance
//!
//! # Filter tests by name
//! cargo run -p oxc_angular_conformance -- --filter "parseAction"
//! ```

// CLI tools intentionally print to stdout/stderr for user feedback
#![allow(clippy::print_stdout)]
#![allow(clippy::print_stderr)]
// Numeric casts are intentional in test fixture extraction and result reporting
#![allow(clippy::cast_precision_loss)]
#![allow(clippy::cast_sign_loss)]
#![allow(clippy::cast_possible_truncation)]

mod extractor;
mod report;
mod runner;
pub mod subsystems;
mod test_case;

use std::path::PathBuf;

pub use extractor::SpecExtractor;
pub use report::ReportGenerator;
pub use runner::ConformanceRunner;
pub use test_case::{TestAssertion, TestCase, TestGroup, TestResult, TestSuite};

/// Options for running conformance tests
#[derive(Debug, Default)]
pub struct ConformanceOptions {
    /// Filter tests by name pattern
    pub filter: Option<String>,
    /// Enable debug output
    pub debug: bool,
    /// Generate fixtures from TypeScript specs
    pub generate: bool,
}

/// # Panics
/// Invalid Project Root
fn project_root() -> PathBuf {
    project_root::get_project_root().unwrap()
}

fn angular_conformance_root() -> PathBuf {
    project_root().join("crates").join("angular_conformance")
}

fn angular_compiler_root() -> PathBuf {
    project_root().join("crates").join("oxc_angular_compiler")
}

fn angular_test_root() -> PathBuf {
    angular_compiler_root().join("angular").join("packages").join("compiler").join("test")
}

fn fixtures_root() -> PathBuf {
    angular_conformance_root().join("fixtures")
}

fn snapshots_root() -> PathBuf {
    angular_conformance_root().join("snapshots")
}

#[test]
#[cfg(any(coverage, coverage_nightly))]
fn test() {
    ConformanceRunner::new(ConformanceOptions::default()).run();
}
