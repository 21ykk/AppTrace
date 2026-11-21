# AppTrace — Documentation Index

Welcome to the **AppTrace Documentation Portal**. This index provides organized, relative navigation across all user guides, installation procedures, developer manuals, and engineering audit reports.

---

## 1. Getting Started

- **[Project Landing Page](../README.md):** Main project overview, feature matrix, and screenshot gallery.
- **[First Start Guide](guides/FIRST-START.md):** Step-by-step walkthrough of the interface, dashboard widgets, and safe workflows.
- **[Feature Guide](guides/FEATURES.md):** In-depth technical explanations of all implemented modules, safety shields, and OS mechanisms.

---

## 2. Installation & Setup

- **[Windows Installation Guide — Stable](installation/WINDOWS.md):** Complete guide for installing and running the portable release on Windows 10/11 x64, SHA-256 verification, and SmartScreen guidance.
- **[Linux Installation Guide — Public Beta](installation/LINUX.md):** Requirements, system libraries, and building from source on Ubuntu 24.04/22.04 LTS and Debian 12.
- **[Uninstallation Guide](guides/UNINSTALLATION.md):** How to cleanly remove AppTrace and wipe local SQLite caches and databases.
- **[Troubleshooting Guide](installation/TROUBLESHOOTING.md):** Practical solutions for startup failures, missing libraries, permissions, and database locks.

---

## 3. Development & Architecture

- **[Building from Source](development/BUILDING.md):** Prerequisites, toolchains, build scripts, and production packaging commands.
- **[Contributing Guide](development/CONTRIBUTING.md):** Coding standards for Rust and TypeScript, safety rules, and mandatory verification procedures.
- **[Architecture & Engine Design](ARCHITECTURE.md):** Deep technical documentation of telemetry collectors, IPC bridge, Win32 API integration, and SQLite WAL storage.
- **[Security Policy](../SECURITY.md):** Security boundaries, path traversal defenses, service locks, and vulnerability disclosure.

---

## 4. Engineering Verification & Release Reports

- **[Independent Verification Report (v1.1.1)](INDEPENDENT_VERIFICATION_REPORT.md):** Comprehensive release gate audit covering Duplicate Finder security, SQLite reliability, Windows regression results, and Linux CI status.
- **[Final Release Preparation Report](FINAL_RELEASE_PREPARATION.md):** Working tree audit, recalculated checksums, platform strategy, and suggested release notes.
- **[Release Readiness Report](RELEASE_READINESS_REPORT.md):** Detailed 7-stage lifecycle gate matrix and subsystem readiness assessments.
- **[Final Engineering Audit](FINAL_ENGINEERING_AUDIT.md):** Deep-dive technical audit of all Rust functions, IPC handlers, and database schema migrations.
- **[Windows Regression Evidence](WINDOWS_REGRESSION_EVIDENCE.md):** Live execution logs and evidence from Windows host verification runs.
- **[Linux Test Evidence](LINUX_TEST_EVIDENCE.md):** Detailed Linux integration test matrix, disposable lab scripts, and host verification boundaries.
- **[Engineering Handover & Implementation Guide](ENGINEERING_IMPLEMENTATION_GUIDE.md):** Complete technical handover and reproducibility guide.
- **[Changelog](CHANGELOG.md):** Detailed version history for v1.0.0, v1.1.0, and v1.1.1.

---

## 5. Visual Asset Gallery

- **[Screenshot Directory](screenshots/):** High-resolution screenshots of all 10 verified workstation views on Windows 10/11 x64.
