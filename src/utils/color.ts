export function getSeverityBadge(severity: string): { bg: string; text: string; border: string } {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'error':
      return {
        bg: 'bg-rose-950/40',
        text: 'text-rose-400',
        border: 'border-rose-800/60',
      }
    case 'warning':
    case 'warn':
      return {
        bg: 'bg-amber-950/40',
        text: 'text-amber-400',
        border: 'border-amber-800/60',
      }
    case 'notice':
    case 'info':
    default:
      return {
        bg: 'bg-blue-950/40',
        text: 'text-blue-400',
        border: 'border-blue-800/60',
      }
  }
}

export function getCategoryColor(category: string): string {
  switch (category.toLowerCase()) {
    case 'process':
      return '#35B879' // green
    case 'network':
      return '#2878D0' // blue
    case 'filesystem':
      return '#38bdf8' // sky
    case 'systemmetrics':
    case 'system':
      return '#34d399' // emerald
    case 'health':
      return '#fbbf24' // amber
    default:
      return '#94a3b8' // slate
  }
}
