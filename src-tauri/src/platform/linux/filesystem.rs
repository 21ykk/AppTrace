pub struct LinuxFilesystemAdapter;

impl LinuxFilesystemAdapter {
    pub fn description() -> &'static str {
        "Linux inotify recursive directory monitor"
    }
}
