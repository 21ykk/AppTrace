type EventCallback = (data: unknown) => void

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map()

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data)
      } catch (e) {
        console.error(`Error in event listener for ${event}:`, e)
      }
    })
  }
}

export const eventBus = new EventBus()
