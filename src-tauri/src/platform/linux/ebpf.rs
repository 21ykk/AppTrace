pub struct LinuxEbpfManager;

impl LinuxEbpfManager {
    pub fn is_btf_available() -> bool {
        std::path::Path::new("/sys/kernel/btf/vmlinux").exists()
    }

    pub fn is_supported() -> bool {
        crate::security::permissions::is_elevated() && Self::is_btf_available()
    }
}
