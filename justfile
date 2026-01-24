#!/usr/bin/env -S just --justfile

set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
set shell := ["bash", "-cu"]

_default:
  @just --list -u

# ==================== ALIASES ====================
alias r := ready
alias c := conformance

# ==================== SETUP & INITIALIZATION ====================

# Initialize the project by installing all necessary tools
init:
  # Rust related init
  cargo binstall cargo-insta typos-cli cargo-shear -y
  # Node.js related init
  pnpm install

# ==================== CORE DEVELOPMENT ====================

# When ready, run the same CI commands
ready:
  git diff --exit-code --quiet
  pnpm install
  typos
  just fmt
  just check
  just test
  just lint
  just doc
  git status

# Run cargo check
check:
  cargo check --all-features

# Run all the tests
test:
  cargo test -p oxc_angular_compiler

# Lint the whole project
lint:
  cargo clippy --all-features -- --deny warnings

# Format all files
fmt:
  -cargo shear --fix
  cargo fmt

[unix]
doc:
  RUSTDOCFLAGS='-D warnings' cargo doc --no-deps --document-private-items

[windows]
doc:
  $Env:RUSTDOCFLAGS='-D warnings'; cargo doc --no-deps --document-private-items

# Fix all auto-fixable format and lint issues
fix:
  cargo clippy --fix --allow-staged --no-deps
  just fmt
  typos -w
  git status

# ==================== BUILD ====================

# Build the Angular compiler
build:
  cargo build -p oxc_angular_compiler

# Build in release mode
build-release:
  cargo build -p oxc_angular_compiler --release

# ==================== TESTING & CONFORMANCE ====================

# Run conformance tests
conformance *args='':
  cargo run -p oxc_angular_conformance -- {{args}}

# Run conformance tests with filter
conformance-filter filter:
  cargo run -p oxc_angular_conformance -- --filter {{filter}}

# ==================== NAPI ====================

# Build NAPI package
napi-build:
  pnpm build

# Build NAPI package (dev)
napi-build-dev:
  pnpm build-dev

# Test NAPI package
napi-test:
  pnpm test
