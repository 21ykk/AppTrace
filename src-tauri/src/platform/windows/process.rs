pub struct WindowsProcessAdapter;

impl WindowsProcessAdapter {
    pub fn description() -> &'static str {
        "Win32 Process Snapshot via CreateToolhelp32Snapshot / EnumProcesses"
    }
}
