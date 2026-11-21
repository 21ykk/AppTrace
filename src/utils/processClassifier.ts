/**
 * Process classification utility to distinguish between user applications
 * and OS/background system services.
 */

const SYSTEM_PROCESS_NAMES = new Set([
  'system',
  'idle',
  'registry',
  'smss.exe',
  'csrss.exe',
  'wininit.exe',
  'services.exe',
  'lsass.exe',
  'svchost.exe',
  'fontdrvhost.exe',
  'dwm.exe',
  'audiodg.exe',
  'spoolsv.exe',
  'conhost.exe',
  'sihost.exe',
  'taskhostw.exe',
  'ctfmon.exe',
  'textinputhost.exe',
  'applicationframehost.exe',
  'aggregatorhost.exe',
  'searchhost.exe',
  'startmenuexperiencehost.exe',
  'runtimebroker.exe',
  'securityhealthservice.exe',
  'smartscreen.exe',
  'wmiprvse.exe',
  'searchindexer.exe',
  'dllhost.exe',
  'msedgewebview2.exe',
  'shellexperiencehost.exe',
  'securityhealthsystray.exe',
  'systemsettingsbroker.exe',
  'dashost.exe',
  'searchfilterhost.exe',
  'searchprotocolhost.exe',
  'sgrmbroker.exe',
  'wlanext.exe',
  'werfault.exe',
])

export function isSystemProcess(proc: { name: string; exe_path?: string }): boolean {
  const lowerName = proc.name.toLowerCase().trim()
  if (SYSTEM_PROCESS_NAMES.has(lowerName)) return true
  if (lowerName.startsWith('svchost') || lowerName.startsWith('system') || lowerName.startsWith('wmi')) return true

  const lowerPath = (proc.exe_path || '').toLowerCase()
  if (
    lowerPath.includes('\\windows\\system32\\') ||
    lowerPath.includes('\\windows\\syswow64\\') ||
    lowerPath.includes('\\windows\\systemapps\\') ||
    lowerPath.includes('/usr/lib/systemd') ||
    lowerPath.includes('/lib/systemd')
  ) {
    return true
  }

  return false
}

export function isUserApp(proc: { name: string; exe_path?: string }): boolean {
  return !isSystemProcess(proc)
}
