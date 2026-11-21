#!/usr/bin/env bash
# tests/linux-lab/fixtures/setup-disposable-files.sh
# Generates isolated disposable test directory trees for testing cleaner, duplicate finder, and disk analyzer.
set -euo pipefail

TEST_ROOT="${APPTRACE_TEST_ROOT:-/tmp/apptrace-linux-lab}"
echo "=== [Linux Lab] Generating Disposable Filesystem Fixtures in $TEST_ROOT ==="

mkdir -p "$TEST_ROOT/cleaner/cache"
mkdir -p "$TEST_ROOT/cleaner/dumps"
mkdir -p "$TEST_ROOT/cleaner/logs"
mkdir -p "$TEST_ROOT/duplicates/source"
mkdir -p "$TEST_ROOT/disk_analyzer/deep/nested/sub1"
mkdir -p "$TEST_ROOT/disk_analyzer/deep/nested/sub2"

# 1. Cleaner fixtures
echo "test disposable cache data $(date)" > "$TEST_ROOT/cleaner/cache/temp_cache_01.bin"
echo "test disposable cache data $(date)" > "$TEST_ROOT/cleaner/cache/temp_cache_02.bin"
head -c 1048576 </dev/zero > "$TEST_ROOT/cleaner/dumps/core_dump_fake.dmp"
echo "kernel diagnostic warning fake log $(date)" > "$TEST_ROOT/cleaner/logs/syslog_fake.log"

# 2. Duplicate detection fixtures
# Two files with identical content (16 KB)
head -c 16384 </dev/urandom > "$TEST_ROOT/duplicates/source/original_file.bin"
cp "$TEST_ROOT/duplicates/source/original_file.bin" "$TEST_ROOT/duplicates/source/duplicate_copy.bin"
# One distinct file with same size but different content
head -c 16384 </dev/urandom > "$TEST_ROOT/duplicates/source/distinct_file.bin"

# 3. Disk analyzer fixtures
head -c 5242880 </dev/zero > "$TEST_ROOT/disk_analyzer/deep/nested/sub1/5mb_file.bin"
head -c 2097152 </dev/zero > "$TEST_ROOT/disk_analyzer/deep/nested/sub2/2mb_file.bin"
head -c 512000 </dev/zero > "$TEST_ROOT/disk_analyzer/500kb_file.bin"

echo "=== [Linux Lab] Disposable fixtures created successfully. ==="
ls -lR "$TEST_ROOT"
