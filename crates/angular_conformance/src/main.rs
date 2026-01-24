//! Angular template conformance testing.
//!
//! This tool runs conformance tests against Angular's TypeScript compiler test specs
//! to verify that the Rust implementation produces matching output.
//!
//! Usage:
//!   cargo run -p oxc_angular_conformance                      # Run all tests
//!   cargo run -p oxc_angular_conformance -- --generate        # Generate fixtures from specs
//!   cargo run -p oxc_angular_conformance -- --filter "parseAction"
//!   cargo run -p oxc_angular_conformance -- --debug

// CLI tools intentionally print to stdout for user feedback
#![allow(clippy::print_stdout)]

use pico_args::Arguments;

use oxc_angular_conformance::{ConformanceOptions, ConformanceRunner};

fn main() {
    let mut args = Arguments::from_env();

    // Parse arguments
    let filter: Option<String> = args.opt_value_from_str("--filter").unwrap();
    let debug: bool = args.contains("--debug");
    let generate: bool = args.contains("--generate");
    let help: bool = args.contains("--help") || args.contains("-h");

    if help {
        print_help();
        return;
    }

    let options = ConformanceOptions { filter, debug, generate };

    println!("Angular Template Conformance Test Runner");
    println!("========================================\n");

    if options.debug {
        println!("Debug mode enabled");
    }

    if let Some(ref f) = options.filter {
        println!("Filter: {f}\n");
    }

    let runner = ConformanceRunner::new(options);
    runner.run();
}

fn print_help() {
    println!(
        r#"Angular Template Conformance Test Runner

USAGE:
    cargo run -p oxc_angular_conformance [OPTIONS]

OPTIONS:
    --generate      Generate JSON fixtures from Angular TypeScript spec files
    --filter <STR>  Filter tests by name pattern
    --debug         Enable debug output
    -h, --help      Print this help message

EXAMPLES:
    # Generate fixtures from TypeScript specs (run first)
    cargo run -p oxc_angular_conformance -- --generate

    # Run all conformance tests
    cargo run -p oxc_angular_conformance

    # Run tests matching a filter
    cargo run -p oxc_angular_conformance -- --filter "parseAction"

    # Run with debug output
    cargo run -p oxc_angular_conformance -- --debug --filter "bound"
"#
    );
}
