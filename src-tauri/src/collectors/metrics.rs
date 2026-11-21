use crate::core::event_model::{DiskMetric, NetworkInterfaceMetric, SystemMetrics};
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{Disks, Networks, System};

pub struct MetricsCollector;

impl MetricsCollector {
    pub fn collect(sys: &mut System, disks: &mut Disks, networks: &mut Networks) -> SystemMetrics {
        sys.refresh_cpu_all();
        sys.refresh_memory();
        disks.refresh(true);
        networks.refresh(true);

        let now_ns = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos() as u64;

        let cpu_usage_pct = sys.global_cpu_usage();
        let per_core_cpu: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();

        let memory_used_bytes = sys.used_memory();
        let memory_total_bytes = sys.total_memory();
        let memory_available_bytes = sys.available_memory();
        let swap_used_bytes = sys.used_swap();
        let swap_total_bytes = sys.total_swap();

        let disk_metrics: Vec<DiskMetric> = disks
            .list()
            .iter()
            .map(|d| DiskMetric {
                name: d.name().to_string_lossy().to_string(),
                mount_point: d.mount_point().to_string_lossy().to_string(),
                total_bytes: d.total_space(),
                available_bytes: d.available_space(),
                is_removable: d.is_removable(),
            })
            .collect();

        let mut net_rx: u64 = 0;
        let mut net_tx: u64 = 0;
        let mut interface_metrics = Vec::new();

        for (name, data) in networks.iter() {
            let rx = data.received();
            let tx = data.transmitted();
            net_rx += rx;
            net_tx += tx;

            interface_metrics.push(NetworkInterfaceMetric {
                name: name.clone(),
                mac_address: data.mac_address().to_string(),
                rx_bytes: data.total_received(),
                tx_bytes: data.total_transmitted(),
                rx_packets: data.total_packets_received(),
                tx_packets: data.total_packets_transmitted(),
                rx_errors: data.total_errors_on_received(),
                tx_errors: data.total_errors_on_transmitted(),
            });
        }

        let total_processes = sys.processes().len() as u32;

        SystemMetrics {
            timestamp_ns: now_ns,
            cpu_usage_pct,
            per_core_cpu,
            memory_used_bytes,
            memory_total_bytes,
            memory_available_bytes,
            swap_used_bytes,
            swap_total_bytes,
            disks: disk_metrics,
            interfaces: interface_metrics,
            net_bytes_rx_sec: net_rx,
            net_bytes_tx_sec: net_tx,
            total_processes,
        }
    }
}
