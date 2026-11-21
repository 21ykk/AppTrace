use crate::core::event_model::{
    CapabilityStatus, CollectorCategory, SupportLevel, SystemTelemetryStatus,
};
use crate::security::permissions::is_elevated;

pub fn probe_system_capabilities(
    event_drop_count: u64,
    buffer_utilization_pct: f32,
    collection_active: bool,
    monitored_fs_path: Option<String>,
) -> SystemTelemetryStatus {
    let elevated = is_elevated();
    let _os_name = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();

    #[cfg(windows)]
    let (os_display, backend_name, kernel_ver) = (
        "Windows 10/11 x64".to_string(),
        if elevated {
            "Windows Native (Elevated Win32 + Kernel Instrumentation Ready)"
        } else {
            "Windows Win32 Baseline (Toolhelp32 + IP Helper + ReadDirectoryChangesW)"
        }
        .to_string(),
        None,
    );

    #[cfg(target_os = "linux")]
    let (os_display, backend_name, kernel_ver) = (
        "Linux x86_64".to_string(),
        if elevated {
            "Linux eBPF CO-RE Probes + Netlink"
        } else {
            "Linux Baseline (/proc + Netlink sock_diag + inotify)"
        }
        .to_string(),
        std::fs::read_to_string("/proc/sys/kernel/osrelease")
            .ok()
            .map(|s| s.trim().to_string()),
    );

    #[cfg(not(any(windows, target_os = "linux")))]
    let (os_display, backend_name, kernel_ver) = (
        format!("{} {}", _os_name, arch),
        "Generic Baseline Polling".to_string(),
        None,
    );

    let mut capabilities = Vec::new();

    // 1. Process
    capabilities.push(CapabilityStatus {
        category: CollectorCategory::Process,
        level: if elevated {
            SupportLevel::Full
        } else {
            SupportLevel::Degraded {
                reason: "Unprivileged baseline snapshotting active. Transient short-lived child processes (< polling interval) may be missed."
                    .to_string(),
            }
        },
        collection_mechanism: if cfg!(windows) {
            "Toolhelp32 / Process Snapshot API (500ms cycle)".to_string()
        } else {
            "/proc tree parser + Netlink connector".to_string()
        },
        is_elevated: elevated,
        limitations: vec![
            "Short-lived sub-processes executing under 500ms are subject to polling jitter".to_string(),
            "Parent PID spoofing validation requires kernel ETW / eBPF elevation".to_string(),
        ],
    });

    // 2. Network
    capabilities.push(CapabilityStatus {
        category: CollectorCategory::Network,
        level: SupportLevel::Full,
        collection_mechanism: if cfg!(windows) {
            "IP Helper API (GetExtendedTcpTable / GetExtendedUdpTable)".to_string()
        } else {
            "Netlink NETLINK_INET_DIAG socket diagnostic table".to_string()
        },
        is_elevated: elevated,
        limitations: vec![
            "Per-connection bandwidth attribution is sampled at 1s intervals".to_string(),
            "Packet payload inspection (DPI) is intentionally out of scope for privacy and security".to_string(),
        ],
    });

    // 3. Filesystem
    capabilities.push(CapabilityStatus {
        category: CollectorCategory::Filesystem,
        level: if monitored_fs_path.is_some() {
            SupportLevel::Full
        } else {
            SupportLevel::Degraded {
                reason: "Directory monitoring active on default workspace; select custom directory for dedicated tracking."
                    .to_string(),
            }
        },
        collection_mechanism: if cfg!(windows) {
            "ReadDirectoryChangesW (I/O Completion Ports via notify)".to_string()
        } else {
            "inotify recursive watcher".to_string()
        },
        is_elevated: elevated,
        limitations: vec![
            "Filesystem monitoring is bound to user-selected directory hierarchies".to_string(),
            "Whole-system drive tracing requires root or dedicated kernel filter driver".to_string(),
        ],
    });

    // 4. System Metrics
    capabilities.push(CapabilityStatus {
        category: CollectorCategory::SystemMetrics,
        level: SupportLevel::Full,
        collection_mechanism: "Native OS Performance Counters (CPU cores, RAM pages, Disks, NICs)".to_string(),
        is_elevated: elevated,
        limitations: vec![
            "CPU per-core resolution is sampled at 1000ms to maintain < 0.1% collector CPU overhead".to_string(),
        ],
    });

    // 5. System Health
    capabilities.push(CapabilityStatus {
        category: CollectorCategory::Health,
        level: SupportLevel::Full,
        collection_mechanism: "Bounded Ring Buffer (100k events) + SQLite WAL local persistence"
            .to_string(),
        is_elevated: elevated,
        limitations: vec![
            "Queue drops trigger explicit degradation alerts in UI timeline".to_string(),
        ],
    });

    SystemTelemetryStatus {
        os_name: os_display,
        os_version: std::env::consts::OS.to_string(),
        kernel_version: kernel_ver,
        architecture: arch,
        is_elevated: elevated,
        active_backend: backend_name,
        capabilities,
        event_drop_count,
        buffer_utilization_pct,
        collection_active,
        monitored_fs_path,
    }
}
