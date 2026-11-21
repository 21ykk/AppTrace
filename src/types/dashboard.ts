export interface WidgetConfig {
  id: string
  type_id: string
  title: string
  x: number
  y: number
  w: number
  h: number
  visible: boolean
  settings: Record<string, unknown>
}

export interface DashboardConfig {
  id: string
  name: string
  description: string
  is_default: boolean
  created_at: number
  updated_at: number
  widgets: WidgetConfig[]
}

export interface WidgetRegistryEntry {
  type_id: string
  title: string
  description: string
  category: 'System' | 'Network' | 'Processes' | 'Filesystem' | 'Events'
  default_w: number
  default_h: number
  min_w: number
  min_h: number
  component: React.ComponentType<{ widget: WidgetConfig; isEditing?: boolean }>
}
