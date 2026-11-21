use crate::management::models::{CleanableItem, DiskUsageItem};
use std::fs;
use std::path::{Path, PathBuf};

pub fn analyze_disk_space(target_path: &str, max_depth: Option<usize>) -> Result<DiskUsageItem, String> {
    let p = if target_path.is_empty() {
        #[cfg(target_os = "windows")]
        {
            PathBuf::from("C:\\")
        }
        #[cfg(not(target_os = "windows"))]
        {
            PathBuf::from("/")
        }
    } else {
        PathBuf::from(target_path)
    };

    if !p.exists() {
        return Err(format!("Path '{}' does not exist", target_path));
    }

    let depth = max_depth.unwrap_or(2);
    Ok(scan_node(&p, 0, depth))
}

fn scan_node(path: &Path, current_depth: usize, max_depth: usize) -> DiskUsageItem {
    let name = path.file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());

    let is_dir = path.is_dir();
    if !is_dir {
        let size = path.metadata().map(|m| m.len()).unwrap_or(0);
        return DiskUsageItem {
            path: path.to_string_lossy().to_string(),
            name,
            is_dir: false,
            size_bytes: size,
            item_count: 1,
            children: Vec::new(),
        };
    }

    let mut total_size = 0u64;
    let mut total_count = 0usize;
    let mut children = Vec::new();

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let child_path = entry.path();
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    let sz = meta.len();
                    total_size += sz;
                    total_count += 1;

                    if current_depth < max_depth {
                        children.push(DiskUsageItem {
                            path: child_path.to_string_lossy().to_string(),
                            name: child_path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                            is_dir: false,
                            size_bytes: sz,
                            item_count: 1,
                            children: Vec::new(),
                        });
                    }
                } else if meta.is_dir() {
                    // Check symlink guard
                    if let Ok(ft) = entry.file_type() {
                        if ft.is_symlink() {
                            continue;
                        }
                    }

                    if current_depth < max_depth {
                        let child_node = scan_node(&child_path, current_depth + 1, max_depth);
                        total_size += child_node.size_bytes;
                        total_count += child_node.item_count;
                        children.push(child_node);
                    } else {
                        // Quick subtotal without populating children
                        let (sub_sz, sub_cnt) = quick_dir_subtotal(&child_path, 3);
                        total_size += sub_sz;
                        total_count += sub_cnt;
                    }
                }
            }
        }
    }

    // Sort children by size descending
    children.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    // Limit children list to top 40 for UI rendering efficiency
    if children.len() > 40 {
        children.truncate(40);
    }

    DiskUsageItem {
        path: path.to_string_lossy().to_string(),
        name,
        is_dir: true,
        size_bytes: total_size,
        item_count: total_count,
        children,
    }
}

fn quick_dir_subtotal(path: &Path, max_depth: usize) -> (u64, usize) {
    if max_depth == 0 {
        return (0, 0);
    }
    let mut size = 0u64;
    let mut count = 0usize;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    size += meta.len();
                    count += 1;
                } else if meta.is_dir() {
                    let (s, c) = quick_dir_subtotal(&entry.path(), max_depth - 1);
                    size += s;
                    count += c;
                }
            }
        }
    }
    (size, count)
}

pub fn get_largest_files(target_path: &str, limit: Option<usize>) -> Result<Vec<CleanableItem>, String> {
    let p = if target_path.is_empty() {
        #[cfg(target_os = "windows")]
        {
            dirs::home_dir().unwrap_or_else(|| PathBuf::from("C:\\"))
        }
        #[cfg(not(target_os = "windows"))]
        {
            dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"))
        }
    } else {
        PathBuf::from(target_path)
    };

    let max_items = limit.unwrap_or(50);
    let mut files = Vec::new();
    collect_files_recursive(&p, &mut files, 4);

    files.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    if files.len() > max_items {
        files.truncate(max_items);
    }

    Ok(files)
}

fn collect_files_recursive(dir: &Path, files: &mut Vec<CleanableItem>, remaining_depth: usize) {
    if remaining_depth == 0 {
        return;
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    let sz = meta.len();
                    // Track all files > 1KB and keep the largest bounded to prevent excessive memory usage
                    if sz > 1024 {
                        files.push(CleanableItem {
                            path: p.to_string_lossy().to_string(),
                            size_bytes: sz,
                            description: p.file_name().unwrap_or_default().to_string_lossy().to_string(),
                        });
                        if files.len() > 1000 {
                            files.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
                            files.truncate(200);
                        }
                    }
                } else if meta.is_dir() {
                    if let Ok(ft) = entry.file_type() {
                        if !ft.is_symlink() {
                            collect_files_recursive(&p, files, remaining_depth - 1);
                        }
                    }
                }
            }
        }
    }
}
