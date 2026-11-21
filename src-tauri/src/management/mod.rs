pub mod applications;
pub mod cleaner;
pub mod disk_analyzer;
pub mod duplicates;
pub mod health;
pub mod hunter;
pub mod models;
pub mod optimizer;
pub mod registry;
pub mod scheduled_tasks;
pub mod services;
pub mod startup;
pub mod uninstall;

use models::ManagementCapabilities;

pub fn get_management_capabilities() -> ManagementCapabilities {
    #[cfg(target_os = "windows")]
    {
        ManagementCapabilities {
            platform: "windows".to_string(),
            has_registry_manager: true,
            has_linux_config_manager: false,
            has_services_manager: true,
            has_scheduled_tasks_manager: true,
            has_startup_manager: true,
            has_uninstaller: true,
            has_cleaner: true,
            has_disk_analyzer: true,
            has_duplicate_finder: true,
            has_system_optimizer: true,
            has_health_center: true,
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        ManagementCapabilities {
            platform: "linux".to_string(),
            has_registry_manager: false,
            has_linux_config_manager: true,
            has_services_manager: true,
            has_scheduled_tasks_manager: true,
            has_startup_manager: true,
            has_uninstaller: true,
            has_cleaner: true,
            has_disk_analyzer: true,
            has_duplicate_finder: true,
            has_system_optimizer: true,
            has_health_center: true,
        }
    }
}
