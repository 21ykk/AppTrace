# AppTrace Platform Guide: Linux

## Telemetry Mechanisms
- **Process Lifecycle:** Baseline parses `/proc` filesystem trees and Netlink process events (`CN_PROC`). Optional eBPF kprobes hook `sched_process_exec` and `sched_process_exit`.
- **Network Sockets:** Netlink `NETLINK_INET_DIAG` socket diagnostic tables provide socket states and inode-to-PID resolution.
- **Filesystem Activity:** Linux `inotify` subsystem watches recursive directory hierarchies.

## Kernel Prerequisites for eBPF
- Linux Kernel version >= 5.15
- BTF support enabled (`/sys/kernel/btf/vmlinux`)
- `CAP_BPF` or `CAP_NET_ADMIN` ambient capabilities
