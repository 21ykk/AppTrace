use crate::core::event_model::NetworkConnection;
use netstat2::{AddressFamilyFlags, ProtocolFlags, ProtocolSocketInfo, get_sockets_info};
use std::collections::HashMap;

pub struct NetworkCollector;

impl NetworkCollector {
    pub fn collect(process_map: &HashMap<u32, String>) -> Vec<NetworkConnection> {
        let af_flags = AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6;
        let proto_flags = ProtocolFlags::TCP | ProtocolFlags::UDP;

        let mut connections = Vec::new();

        if let Ok(sockets) = get_sockets_info(af_flags, proto_flags) {
            for socket in sockets {
                let pid = socket.associated_pids.first().copied();
                let process_name = pid.and_then(|p| process_map.get(&p).cloned());

                match socket.protocol_socket_info {
                    ProtocolSocketInfo::Tcp(tcp) => {
                        connections.push(NetworkConnection {
                            protocol: "TCP".to_string(),
                            local_addr: tcp.local_addr.to_string(),
                            local_port: tcp.local_port,
                            remote_addr: tcp.remote_addr.to_string(),
                            remote_port: tcp.remote_port,
                            state: format!("{:?}", tcp.state).to_uppercase(),
                            pid,
                            process_name,
                        });
                    }
                    ProtocolSocketInfo::Udp(udp) => {
                        connections.push(NetworkConnection {
                            protocol: "UDP".to_string(),
                            local_addr: udp.local_addr.to_string(),
                            local_port: udp.local_port,
                            remote_addr: "*".to_string(),
                            remote_port: 0,
                            state: "LISTENING".to_string(),
                            pid,
                            process_name,
                        });
                    }
                }
            }
        }

        connections.sort_by(|a, b| {
            let order_a = if a.state == "ESTABLISHED" {
                0
            } else if a.state == "LISTEN" {
                1
            } else {
                2
            };
            let order_b = if b.state == "ESTABLISHED" {
                0
            } else if b.state == "LISTEN" {
                1
            } else {
                2
            };
            order_a.cmp(&order_b)
        });

        connections
    }
}
