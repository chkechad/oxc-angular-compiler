//! Report generation for conformance test results.
//!
//! This module provides the [`ReportGenerator`] for producing human-readable
//! reports from conformance test results. Supports both console output and
//! markdown file generation.
//!
//! ## Report Format
//!
//! The markdown report includes:
//! - **Summary table**: Pass/fail counts per subsystem with pass rates
//! - **Failed tests section**: Detailed information about each failure including
//!   expected vs actual output and diffs

use std::fmt::Write;
use std::fs;
use std::path::Path;

use crate::test_case::{FailedTest, TestResult, TestSummary};

/// Generates markdown reports for conformance test results
pub struct ReportGenerator;

impl ReportGenerator {
    pub fn new() -> Self {
        Self
    }

    /// Generate a markdown report from test summaries
    pub fn generate_report(&self, summaries: &[(&str, TestSummary)]) -> String {
        let mut report = String::new();

        // Header
        writeln!(report, "# Angular Conformance Test Results").unwrap();
        writeln!(report).unwrap();

        // Summary table
        writeln!(report, "## Summary").unwrap();
        writeln!(report).unwrap();
        writeln!(report, "| Subsystem | Passed | Failed | Errors | Skipped | Total | Pass Rate |")
            .unwrap();
        writeln!(report, "|-----------|--------|--------|--------|---------|-------|-----------|")
            .unwrap();

        let mut total_passed = 0;
        let mut total_failed = 0;
        let mut total_errors = 0;
        let mut total_skipped = 0;

        for (name, summary) in summaries {
            writeln!(
                report,
                "| {} | {} | {} | {} | {} | {} | {:.1}% |",
                name,
                summary.passed,
                summary.failed,
                summary.errors,
                summary.skipped,
                summary.total(),
                summary.pass_rate()
            )
            .unwrap();

            total_passed += summary.passed;
            total_failed += summary.failed;
            total_errors += summary.errors;
            total_skipped += summary.skipped;
        }

        let total = total_passed + total_failed + total_errors + total_skipped;
        let pass_rate = if total > 0 { (total_passed as f64 / total as f64) * 100.0 } else { 0.0 };

        writeln!(
            report,
            "| **Total** | **{total_passed}** | **{total_failed}** | **{total_errors}** | **{total_skipped}** | **{total}** | **{pass_rate:.1}%** |"
        )
        .unwrap();
        writeln!(report).unwrap();

        // Failed tests section
        let has_failures = summaries.iter().any(|(_, s)| !s.failed_tests.is_empty());
        if has_failures {
            writeln!(report, "## Failed Tests").unwrap();
            writeln!(report).unwrap();

            for (name, summary) in summaries {
                if summary.failed_tests.is_empty() {
                    continue;
                }

                writeln!(report, "### {name}").unwrap();
                writeln!(report).unwrap();

                for failed_test in &summary.failed_tests {
                    self.write_failed_test(&mut report, failed_test);
                }
            }
        }

        report
    }

    fn write_failed_test(&self, report: &mut String, failed_test: &FailedTest) {
        writeln!(report, "#### {}", failed_test.name).unwrap();
        writeln!(report, "Path: `{}`", failed_test.path).unwrap();
        writeln!(report).unwrap();

        match &failed_test.result {
            TestResult::Failed { expected, actual, diff } => {
                writeln!(report, "**Expected:**").unwrap();
                writeln!(report, "```").unwrap();
                writeln!(report, "{expected}").unwrap();
                writeln!(report, "```").unwrap();
                writeln!(report).unwrap();

                writeln!(report, "**Actual:**").unwrap();
                writeln!(report, "```").unwrap();
                writeln!(report, "{actual}").unwrap();
                writeln!(report, "```").unwrap();
                writeln!(report).unwrap();

                if let Some(diff) = diff {
                    writeln!(report, "**Diff:**").unwrap();
                    writeln!(report, "```diff").unwrap();
                    writeln!(report, "{diff}").unwrap();
                    writeln!(report, "```").unwrap();
                    writeln!(report).unwrap();
                }
            }
            TestResult::Error { message } => {
                writeln!(report, "**Error:**").unwrap();
                writeln!(report, "```").unwrap();
                writeln!(report, "{message}").unwrap();
                writeln!(report, "```").unwrap();
                writeln!(report).unwrap();
            }
            _ => {}
        }
    }

    /// Write a report to a file.
    ///
    /// # Errors
    ///
    /// Returns an error if the file cannot be created or written to.
    pub fn write_report(
        &self,
        path: &Path,
        summaries: &[(&str, TestSummary)],
    ) -> std::io::Result<()> {
        let report = self.generate_report(summaries);

        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        fs::write(path, report)
    }

    /// Print a compact summary to stdout
    pub fn print_summary(&self, summaries: &[(&str, TestSummary)]) {
        println!("\n========================================");
        println!("Angular Conformance Test Results");
        println!("========================================\n");

        let mut total_passed = 0;
        let mut total_failed = 0;
        let mut total_errors = 0;
        let mut total_skipped = 0;

        for (name, summary) in summaries {
            let status = if summary.failed == 0 && summary.errors == 0 { "PASS" } else { "FAIL" };

            println!(
                "{}: {}/{} ({:.1}%) [{}]",
                name,
                summary.passed,
                summary.total(),
                summary.pass_rate(),
                status
            );

            total_passed += summary.passed;
            total_failed += summary.failed;
            total_errors += summary.errors;
            total_skipped += summary.skipped;
        }

        println!();

        let total = total_passed + total_failed + total_errors + total_skipped;
        let pass_rate = if total > 0 { (total_passed as f64 / total as f64) * 100.0 } else { 0.0 };

        println!("----------------------------------------");
        println!("Total: {total_passed}/{total} ({pass_rate:.1}%)");

        if total_failed > 0 || total_errors > 0 {
            println!("Failed: {total_failed}, Errors: {total_errors}, Skipped: {total_skipped}");
        }
        println!();
    }
}

impl Default for ReportGenerator {
    fn default() -> Self {
        Self::new()
    }
}
