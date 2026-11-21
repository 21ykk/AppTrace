# AppTrace Security Architecture

## Principle of Least Privilege
The desktop graphical interface runs exclusively within an unprivileged user context. Administrative and root privileges are never granted directly to the webview process.

## Command Line Sanitization
Process execution commands are scrubbed in memory before ingestion. Any arguments containing sensitive keywords such as password, token, key, secret, or auth have their corresponding values replaced with `[REDACTED]`.

## Sensitive Path Protection
Configurable exclusion lists omit private directories (`~/.ssh`, `~/.gnupg`, `~/.aws`, browser cookie stores) from filesystem telemetry collection.

## Offline and Local-First
All collected events are persisted solely to local SQLite storage in Write-Ahead Logging (WAL) mode. Zero outbound network connections or cloud synchronization routines exist.
