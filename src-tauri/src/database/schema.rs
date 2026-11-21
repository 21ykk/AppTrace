pub const SCHEMA_V1: &str = "
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS telemetry_events (
        event_id TEXT PRIMARY KEY,
        timestamp_ns INTEGER NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        pid INTEGER,
        process_name TEXT,
        summary TEXT NOT NULL,
        payload_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_time_cat ON telemetry_events (timestamp_ns DESC, category);
    CREATE INDEX IF NOT EXISTS idx_events_pid ON telemetry_events (pid, timestamp_ns DESC) WHERE pid IS NOT NULL;

    CREATE TABLE IF NOT EXISTS system_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp_ns INTEGER NOT NULL,
        cpu_pct REAL NOT NULL,
        memory_used INTEGER NOT NULL,
        memory_total INTEGER NOT NULL,
        net_rx INTEGER NOT NULL,
        net_tx INTEGER NOT NULL,
        process_count INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_time ON system_snapshots (timestamp_ns DESC);

    CREATE TABLE IF NOT EXISTS saved_dashboards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        layout_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        timestamp_ns INTEGER NOT NULL,
        severity TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        source TEXT NOT NULL,
        acknowledged INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_time ON alerts (timestamp_ns DESC);
";

pub const SCHEMA_V2: &str = "
    CREATE TABLE IF NOT EXISTS installed_applications (
        app_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        publisher TEXT,
        version TEXT,
        install_location TEXT,
        install_date TEXT,
        estimated_size_bytes INTEGER,
        uninstall_string TEXT,
        quiet_uninstall_string TEXT,
        scope TEXT NOT NULL,
        source TEXT NOT NULL,
        architecture TEXT NOT NULL,
        icon_path TEXT,
        last_seen_ns INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_apps_name ON installed_applications (name);

    CREATE TABLE IF NOT EXISTS operation_history (
        operation_id TEXT PRIMARY KEY,
        timestamp_ns INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        target_name TEXT NOT NULL,
        target_path TEXT,
        status TEXT NOT NULL,
        details_json TEXT NOT NULL,
        error_message TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_op_history_time ON operation_history (timestamp_ns DESC);

    CREATE TABLE IF NOT EXISTS monitored_installations (
        session_id TEXT PRIMARY KEY,
        app_name TEXT NOT NULL,
        started_at_ns INTEGER NOT NULL,
        completed_at_ns INTEGER,
        installer_pid INTEGER,
        snapshot_data_json TEXT NOT NULL
    );
";
