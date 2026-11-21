use crate::core::event_model::ProcessInfo;
use crate::security::redaction::redact_command_line;
use sysinfo::{ProcessesToUpdate, System};

pub struct ProcessCollector;

impl ProcessCollector {
    pub fn collect(sys: &mut System) -> Vec<ProcessInfo> {
        sys.refresh_processes(ProcessesToUpdate::All, true);

        let mut list: Vec<ProcessInfo> = sys
            .processes()
            .iter()
            .map(|(pid, p)| {
                let raw_cmd: Vec<String> = p
                    .cmd()
                    .iter()
                    .map(|c| c.to_string_lossy().to_string())
                    .collect();
                let sanitized_cmd = redact_command_line(&raw_cmd);

                ProcessInfo {
                    pid: pid.as_u32(),
                    ppid: p.parent().map(|pp| pp.as_u32()),
                    name: p.name().to_string_lossy().to_string(),
                    exe_path: p
                        .exe()
                        .map(|path| path.to_string_lossy().to_string())
                        .unwrap_or_default(),
                    cmd: sanitized_cmd,
                    cpu_usage: p.cpu_usage(),
                    memory_bytes: p.memory(),
                    virtual_memory_bytes: p.virtual_memory(),
                    status: format!("{:?}", p.status()),
                    start_time: p.start_time(),
                    user_id: p.user_id().map(|u| u.to_string()),
                    thread_count: p.tasks().map(|t| t.len() as u32),
                    disk_read_bytes: p.disk_usage().read_bytes,
                    disk_written_bytes: p.disk_usage().written_bytes,
                }
            })
            .collect();

        list.sort_by(|a, b| {
            b.cpu_usage
                .partial_cmp(&a.cpu_usage)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        list
    }
}
