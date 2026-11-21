pub struct WindowsNetworkAdapter;

impl WindowsNetworkAdapter {
    pub fn description() -> &'static str {
        "Windows IP Helper API (GetExtendedTcpTable, GetExtendedUdpTable)"
    }
}
