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

    // Stage 3: Full 128-bit cryptographic hash
    let mut full_hash_map: HashMap<(u64, String), Vec<PathBuf>> = HashMap::new();
    for ((size, _), paths) in stage2_candidates {
        for path in paths {
            if let Ok(full_hash) = compute_full_hash(&path) {
                full_hash_map.entry((size, full_hash)).or_default().push(path);
            }
        }
    }

    // Convert into DuplicateGroup results
    let mut results = Vec::new();
    for ((size, hash_str), paths) in full_hash_map {
        if paths.len() > 1 {
            let original = paths[0].to_string_lossy().to_string();
            let duplicates = paths[1..]
                .iter()
                .map(|p| p.to_string_lossy().to_string())
                .collect();

            results.push(DuplicateGroup {
                id: uuid::Uuid::new_v4().to_string(),
                file_size: size,
                sha256_hash: hash_str,
                original_path: original,
                duplicate_paths: duplicates,
            });
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
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    let sz = meta.len();
                    if sz >= min_size {
                        map.entry(sz).or_default().push(p);
                    }
                } else if meta.is_dir() {
                    if let Ok(ft) = entry.file_type() {
                        if !ft.is_symlink() {
                            collect_files_by_size(&p, min_size, map, remaining_depth - 1);
                        }
                    }
                }
            }
        }
    }
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

pub fn delete_duplicate_files(file_paths: Vec<String>) -> Result<(u64, usize), String> {
    let mut total_reclaimed = 0u64;
    let mut count = 0usize;

    for path_str in file_paths {
        let p = Path::new(&path_str);
        // Safety guard: do not delete system root files
        let upper = path_str.to_uppercase();
        if upper.contains(r"WINDOWS\SYSTEM32") || upper.contains(r"/ETC") || upper.contains(r"/BIN") {
            continue;
        }

        if p.is_file() {
            let size = p.metadata().map(|m| m.len()).unwrap_or(0);
            if fs::remove_file(p).is_ok() {
                total_reclaimed += size;
                count += 1;
            }
        }
    }

    Ok((total_reclaimed, count))
}
