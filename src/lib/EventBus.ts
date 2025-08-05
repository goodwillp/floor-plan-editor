type EventListener = (...args: any[]) => void

export class EventBus {
  private static instance: EventBus
  private listeners: Map<string, EventListener[]> = new Map()

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  on(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener)
  }

  off(event: string, listener: EventListener): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      const index = eventListeners.indexOf(listener)
      if (index > -1) {
        eventListeners.splice(index, 1)
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(...args)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  clear(): void {
    this.listeners.clear()
  }

  destroy(): void {
    this.clear()
    EventBus.instance = null as any
  }
} 