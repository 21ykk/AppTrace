pub struct LinuxNetworkAdapter;

impl LinuxNetworkAdapter {
    pub fn description() -> &'static str {
        "Linux Netlink NETLINK_INET_DIAG socket diagnostic"
    }
}
