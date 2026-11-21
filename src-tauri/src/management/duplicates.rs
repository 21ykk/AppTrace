use crate::management::models::DuplicateGroup;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

pub fn scan_duplicate_files(target_path: &str, min_size_bytes: Option<u64>) -> Result<Vec<DuplicateGroup>, String> {
    let p = if target_path.is_empty() {
        dirs::download_dir()
            .or_else(dirs::document_dir)
            .or_else(dirs::home_dir)
            .unwrap_or_else(|| PathBuf::from("."))
    } else {
        PathBuf::from(target_path)
    };

    if !p.exists() {
        return Err(format!("Directory '{}' does not exist", target_path));
    }

    let min_sz = min_size_bytes.unwrap_or(1024); // Ignore empty or tiny files < 1KB by default

    // Stage 1: Group by file size
    let mut size_map: HashMap<u64, Vec<PathBuf>> = HashMap::new();
    collect_files_by_size(&p, min_sz, &mut size_map, 6);

    // Keep only sizes with >= 2 files
    let stage1_candidates: HashMap<u64, Vec<PathBuf>> = size_map
        .into_iter()
        .filter(|(_, paths)| paths.len() > 1)
        .collect();

    // Stage 2: Group by 4KB header hash
    let mut header_map: HashMap<(u64, String), Vec<PathBuf>> = HashMap::new();
    for (size, paths) in stage1_candidates {
        for path in paths {
            if let Ok(hdr_hash) = compute_header_hash(&path) {
                header_map.entry((size, hdr_hash)).or_default().push(path);
            }
        }
    }

    let stage2_candidates: HashMap<(u64, String), Vec<PathBuf>> = header_map
        .into_iter()
        .filter(|(_, paths)| paths.len() > 1)
        .collect();

    // Stage 3: Full stream hash + Byte-by-byte verification
    let mut full_hash_map: HashMap<(u64, String), Vec<PathBuf>> = HashMap::new();
    for ((size, _), paths) in stage2_candidates {
        for path in paths {
            if let Ok(full_hash) = compute_full_hash(&path) {
                full_hash_map.entry((size, full_hash)).or_default().push(path);
            }
        }
    }

    // Convert into DuplicateGroup results with byte-level verification
    let mut results = Vec::new();
    for ((size, hash_str), paths) in full_hash_map {
        if paths.len() > 1 {
            let original = &paths[0];
            let mut verified_duplicates = Vec::new();

            for candidate in &paths[1..] {
                if files_are_identical(original, candidate) {
                    verified_duplicates.push(candidate.to_string_lossy().to_string());
                }
            }

            if !verified_duplicates.is_empty() {
                results.push(DuplicateGroup {
                    id: uuid::Uuid::new_v4().to_string(),
                    file_size: size,
                    sha256_hash: hash_str,
                    original_path: original.to_string_lossy().to_string(),
                    duplicate_paths: verified_duplicates,
                });
            }
        }
    }

    // Sort by largest space savings first
    results.sort_by(|a, b| {
        let saved_a = a.file_size * (a.duplicate_paths.len() as u64);
        let saved_b = b.file_size * (b.duplicate_paths.len() as u64);
        saved_b.cmp(&saved_a)
    });

    Ok(results)
}

fn collect_files_by_size(
    dir: &Path,
    min_size: u64,
    map: &mut HashMap<u64, Vec<PathBuf>>,
    remaining_depth: usize,
) {
    if remaining_depth == 0 {
        return;
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Ok(ft) = entry.file_type() {
                if ft.is_symlink() {
                    continue; // Skip symlinks to avoid duplicate counting and loop traversal
                }
                if ft.is_file() {
                    if let Ok(meta) = entry.metadata() {
                        let sz = meta.len();
                        if sz >= min_size {
                            map.entry(sz).or_default().push(p);
                        }
                    }
                } else if ft.is_dir() {
                    collect_files_by_size(&p, min_size, map, remaining_depth - 1);
                }
            }
        }
    }
}

fn files_are_identical(p1: &Path, p2: &Path) -> bool {
    if let (Ok(mut f1), Ok(mut f2)) = (File::open(p1), File::open(p2)) {
        let mut b1 = [0u8; 65536];
        let mut b2 = [0u8; 65536];
        loop {
            let n1 = f1.read(&mut b1).unwrap_or(0);
            let n2 = f2.read(&mut b2).unwrap_or(0);
            if n1 != n2 {
                return false;
            }
            if n1 == 0 {
                return true;
            }
            if b1[..n1] != b2[..n2] {
                return false;
            }
        }
    }
    false
}

fn compute_header_hash(path: &Path) -> Result<String, std::io::Error> {
    let mut file = File::open(path)?;
    let mut buffer = [0u8; 4096];
    let n = file.read(&mut buffer)?;
    Ok(fast_hash_hex(&buffer[..n]))
}

fn compute_full_hash(path: &Path) -> Result<String, std::io::Error> {
    let mut file = File::open(path)?;
    file.seek(SeekFrom::Start(0))?;
    let mut buffer = [0u8; 65536];
    let mut h1: u64 = 0xcbf29ce484222325;
    let mut h2: u64 = 0x100000001b3;
    let mut count: u64 = 0;

    loop {
        let n = file.read(&mut buffer)?;
        if n == 0 {
            break;
        }
        for (i, &b) in buffer[..n].iter().enumerate() {
            h1 = (h1 ^ (b as u64)).wrapping_mul(0x100000001b3);
            h2 = (h2 ^ ((b as u64).rotate_left((i % 32) as u32))).wrapping_mul(0x517cc1b727220a95);
            count += 1;
        }
    }
    Ok(format!("{:016x}{:016x}{:08x}", h1, h2, count))
}

fn fast_hash_hex(data: &[u8]) -> String {
    let mut h1: u64 = 0xcbf29ce484222325;
    let mut h2: u64 = 0x100000001b3;
    for (i, &b) in data.iter().enumerate() {
        h1 = (h1 ^ (b as u64)).wrapping_mul(0x100000001b3);
        h2 = (h2 ^ ((b as u64).rotate_left((i % 32) as u32))).wrapping_mul(0x517cc1b727220a95);
    }
    format!("{:016x}{:016x}", h1, h2)
}

fn is_protected_path(p: &Path) -> bool {
    let s = p.to_string_lossy();
    let upper = s.to_uppercase();

    if s == "/" || s == "\\" {
        return true;
    }

    // Windows protected roots and system scopes
    if upper.len() <= 3 && upper.ends_with(r":\") {
        return true;
    }
    if upper.contains(r"WINDOWS\SYSTEM32")
        || upper.contains(r"WINDOWS\SYSWOW64")
        || upper.starts_with(r"C:\WINDOWS")
        || upper.starts_with(r"\\?\C:\WINDOWS")
        || upper.starts_with(r"C:\PROGRAM FILES")
        || upper.starts_with(r"C:\PROGRAM FILES (X86)")
    {
        return true;
    }

    // Unix protected roots and critical scopes
    let unix_roots = [
        "/etc", "/bin", "/boot", "/usr", "/sbin", "/lib", "/lib64",
        "/dev", "/proc", "/sys", "/root", "/var/lib",
    ];
    for root in &unix_roots {
        if s == *root || s.starts_with(&format!("{}/", root)) {
            return true;
        }
    }

    false
}

pub fn delete_duplicate_candidates(
    candidates: Vec<crate::management::models::DuplicateCandidateItem>,
) -> Result<(u64, usize), String> {
    let mut total_reclaimed = 0u64;
    let mut count = 0usize;
    let mut errors = Vec::new();

    for cand in candidates {
        let p = Path::new(&cand.target_path);

        // 1. Safety guard: raw path check against protected scopes
        if is_protected_path(p) {
            errors.push(format!(
                "Safety violation: path {} is in protected system scope",
                cand.target_path
            ));
            continue;
        }

        // 2. Metadata & symlink guard (use symlink_metadata to avoid following symlinks)
        let sym_meta = match fs::symlink_metadata(p) {
            Ok(m) => m,
            Err(e) => {
                errors.push(format!("Cannot read metadata for {}: {}", cand.target_path, e));
                continue;
            }
        };

        if sym_meta.file_type().is_symlink() {
            errors.push(format!("Refusing to delete symlink: {}", cand.target_path));
            continue;
        }

        if !sym_meta.is_file() {
            errors.push(format!("Candidate is not a regular file: {}", cand.target_path));
            continue;
        }

        let current_size = sym_meta.len();
        let pre_modified = sym_meta.modified().ok();

        // 3. Canonicalize target and recheck protected scope to eliminate traversal tricks (e.g., ../../Windows)
        let canonical_target = match fs::canonicalize(p) {
            Ok(cp) => cp,
            Err(e) => {
                errors.push(format!("Cannot canonicalize path {}: {}", cand.target_path, e));
                continue;
            }
        };

        if is_protected_path(&canonical_target) {
            errors.push(format!(
                "Safety violation: canonical path {:?} is in protected system scope",
                canonical_target
            ));
            continue;
        }

        // 4. Recheck file size against expected size
        if let Some(exp_sz) = cand.expected_size {
            if current_size != exp_sz {
                errors.push(format!(
                    "File {} modified after scan: expected size {}, found {}",
                    cand.target_path, exp_sz, current_size
                ));
                continue;
            }
        }

        // 5. Recheck file contents against retained reference
        if let Some(ref ref_path_str) = cand.reference_path {
            let ref_p = Path::new(ref_path_str);
            if !ref_p.exists() {
                errors.push(format!(
                    "Retained reference file {} missing; aborting deletion for {}",
                    ref_path_str, cand.target_path
                ));
                continue;
            }

            let ref_meta = match fs::symlink_metadata(ref_p) {
                Ok(m) => m,
                Err(e) => {
                    errors.push(format!(
                        "Cannot read metadata for reference {}: {}",
                        ref_path_str, e
                    ));
                    continue;
                }
            };

            if ref_meta.file_type().is_symlink() || !ref_meta.is_file() {
                errors.push(format!(
                    "Retained reference {} is invalid; aborting deletion for {}",
                    ref_path_str, cand.target_path
                ));
                continue;
            }

            // Verify reference file was not modified/truncated
            if let Some(exp_sz) = cand.expected_size {
                if ref_meta.len() != exp_sz {
                    errors.push(format!(
                        "Retained reference {} size altered (expected {}, found {}); aborting deletion for {}",
                        ref_path_str, exp_sz, ref_meta.len(), cand.target_path
                    ));
                    continue;
                }
            }

            let canonical_ref = match fs::canonicalize(ref_p) {
                Ok(cp) => cp,
                Err(e) => {
                    errors.push(format!(
                        "Cannot canonicalize reference {}: {}",
                        ref_path_str, e
                    ));
                    continue;
                }
            };

            // CRITICAL SELF-DELETION GUARD: Target cannot resolve to the retained reference file!
            if canonical_target == canonical_ref {
                errors.push(format!(
                    "Safety violation: candidate path {} resolves to the same file as retained reference {}",
                    cand.target_path, ref_path_str
                ));
                continue;
            }

            if !files_are_identical(p, ref_p) {
                errors.push(format!(
                    "File {} modified or replaced after scan; no longer matches reference {}",
                    cand.target_path, ref_path_str
                ));
                continue;
            }
        }

        // 6. TOCTOU Mitigation: Re-verify target metadata immediately before deletion
        let post_meta = match fs::symlink_metadata(p) {
            Ok(m) => m,
            Err(e) => {
                errors.push(format!(
                    "File {} became inaccessible before deletion: {}",
                    cand.target_path, e
                ));
                continue;
            }
        };

        if post_meta.file_type().is_symlink() {
            errors.push(format!(
                "Security abort: target {} was replaced with a symlink before deletion",
                cand.target_path
            ));
            continue;
        }

        if !post_meta.is_file() || post_meta.len() != current_size {
            errors.push(format!(
                "Security abort: target {} was modified immediately prior to deletion",
                cand.target_path
            ));
            continue;
        }

        if let (Some(pre_mod), Ok(post_mod)) = (pre_modified, post_meta.modified()) {
            if pre_mod != post_mod {
                errors.push(format!(
                    "Security abort: target {} timestamp altered during verification",
                    cand.target_path
                ));
                continue;
            }
        }

        // 7. Delete file
        match fs::remove_file(p) {
            Ok(_) => {
                total_reclaimed += current_size;
                count += 1;
            }
            Err(e) => {
                errors.push(format!("Failed to delete {}: {}", cand.target_path, e));
            }
        }
    }

    Ok((total_reclaimed, count))
}

pub fn delete_duplicate_files(file_paths: Vec<String>) -> Result<(u64, usize), String> {
    let candidates = file_paths
        .into_iter()
        .map(|path| crate::management::models::DuplicateCandidateItem {
            target_path: path,
            reference_path: None,
            expected_size: None,
        })
        .collect();
    delete_duplicate_candidates(candidates)
}
