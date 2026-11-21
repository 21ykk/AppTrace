pub struct WindowsFilesystemAdapter;

impl WindowsFilesystemAdapter {
    pub fn description() -> &'static str {
        "Windows ReadDirectoryChangesW with I/O Completion Ports"
    }
}
