# AppTrace — Linux GUI Screenshots Directory

This directory is designated for authentic screenshots captured from a running AppTrace graphical desktop session on a genuine Linux environment (Ubuntu 24.04 LTS / Debian 12 / Fedora under X11 or Wayland).

## Non-Fabrication Policy
In strict compliance with project verification standards:
- **No simulated or synthetic screenshots are generated.**
- **Windows screenshots are never reused or relabeled as Linux evidence.**
- **Because local virtualization was blocked on the Windows development host, this directory remains awaiting genuine graphical Linux execution.**

## Expected Screenshots
When running AppTrace on an active Linux desktop environment:
1. `dashboard.png`: System overview dashboard showing CPU, RAM, network, and disk telemetry.
2. `applications.png`: Applications Manager listing packages discovered via `dpkg-query`, `rpm`, or `flatpak`.
3. `services.png`: System Services Manager showing `systemd` units and active/inactive status badges.
4. `startup.png`: Startup Manager showing user and system XDG autostart entries.
5. `linux_config.png`: Configuration Browser displaying the `/etc` directory hierarchy and file contents.
6. `cleaner_preview.png`: Storage Cleaner scanning temporary files, logs, and user cache directories.
7. `cleaner_result.png`: Reclaimed storage summary after cleaning.
8. `duplicates.png`: 3-stage duplicate detection results with grouped identical files.
9. `history.png`: Operation History table displaying persistent audit records.
10. `permission_denied.png`: Error state visualization when accessing root-protected resources without elevation.
