pub struct WindowsEtwManager;

impl WindowsEtwManager {
    pub fn is_available() -> bool {
        crate::security::permissions::is_elevated()
    }

    pub fn provider_guid_process() -> &'static str {
        "22fb2cd6-0e7b-4226-a0f7-2d447460c6d7"
    }
}
