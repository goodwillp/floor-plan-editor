/**
 * Keyboard shortcuts system for common operations
 * Requirements: 7.5 - Add keyboard shortcuts for common operations
 */

export interface ShortcutAction {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  description: string
  category: 'file' | 'edit' | 'view' | 'tool' | 'selection'
  handler: () => void
}

export interface ShortcutGroup {
  category: string
  shortcuts: ShortcutAction[]
}

/**
 * Keyboard shortcut manager
 */
export class KeyboardShortcutManager {
  private shortcuts: Map<string, ShortcutAction> = new Map()
  private isEnabled = true
  private activeElement: HTMLElement | null = null

  constructor() {
    this.bindEventListeners()
  }

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: ShortcutAction): void {
    const key = this.getShortcutKey(shortcut)
    this.shortcuts.set(key, shortcut)
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(shortcut: Partial<ShortcutAction>): void {
    const key = this.getShortcutKey(shortcut as ShortcutAction)
    this.shortcuts.delete(key)
  }

  /**
   * Enable or disable keyboard shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  /**
   * Get all registered shortcuts grouped by category
   */
  getShortcutGroups(): ShortcutGroup[] {
    const groups: Map<string, ShortcutAction[]> = new Map()
    
    this.shortcuts.forEach(shortcut => {
      const category = shortcut.category
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(shortcut)
    })
    
    return Array.from(groups.entries()).map(([category, shortcuts]) => ({
      category: this.getCategoryDisplayName(category),
      shortcuts: shortcuts.sort((a, b) => a.description.localeCompare(b.description))
    }))
  }

  /**
   * Get formatted shortcut display string
   */
  getShortcutDisplay(shortcut: ShortcutAction): string {
    const parts: string[] = []
    
    if (shortcut.ctrlKey || shortcut.metaKey) {
      parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    }
    if (shortcut.altKey) {
      parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt')
    }
    if (shortcut.shiftKey) {
      parts.push('⇧')
    }
    
    parts.push(shortcut.key.toUpperCase())
    
    return parts.join(navigator.platform.includes('Mac') ? '' : '+')
  }

  /**
   * Set the active element for context-aware shortcuts
   */
  setActiveElement(element: HTMLElement | null): void {
    this.activeElement = element
  }

  /**
   * Check if shortcuts should be processed based on current focus
   */
  private shouldProcessShortcuts(): boolean {
    if (!this.isEnabled) return false
    
    const activeElement = document.activeElement
    
    // Don't process shortcuts when typing in input fields
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.getAttribute('contenteditable') === 'true'
    )) {
      return false
    }
    
    return true
  }

  /**
   * Generate unique key for shortcut
   */
  private getShortcutKey(shortcut: ShortcutAction): string {
    const modifiers = [
      shortcut.ctrlKey ? 'ctrl' : '',
      shortcut.shiftKey ? 'shift' : '',
      shortcut.altKey ? 'alt' : '',
      shortcut.metaKey ? 'meta' : ''
    ].filter(Boolean).join('+')
    
    return `${modifiers}+${shortcut.key.toLowerCase()}`
  }

  /**
   * Get display name for category
   */
  private getCategoryDisplayName(category: string): string {
    switch (category) {
      case 'file': return 'File Operations'
      case 'edit': return 'Edit Operations'
      case 'view': return 'View Controls'
      case 'tool': return 'Tools'
      case 'selection': return 'Selection'
      default: return category
    }
  }

  /**
   * Bind keyboard event listeners
   */
  private bindEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.shouldProcessShortcuts()) return
    
    const shortcutKey = this.getShortcutKey({
      key: event.key,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey
    } as ShortcutAction)
    
    const shortcut = this.shortcuts.get(shortcutKey)
    if (shortcut) {
      event.preventDefault()
      event.stopPropagation()
      
      try {
        shortcut.handler()
      } catch (error) {
        console.error('Error executing keyboard shortcut:', error)
      }
    }
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
    this.shortcuts.clear()
  }
}

/**
 * Default keyboard shortcuts for the floor plan editor
 */
export function createDefaultShortcuts(handlers: {
  // File operations
  save: () => void
  load: () => void
  export: () => void
  
  // Edit operations
  undo: () => void
  redo: () => void
  delete: () => void
  selectAll: () => void
  copy: () => void
  paste: () => void
  
  // View operations
  zoomIn: () => void
  zoomOut: () => void
  zoomFit: () => void
  zoomActual: () => void
  toggleGrid: () => void
  resetView: () => void
  
  // Tool operations
  selectTool: () => void
  drawTool: () => void
  moveTool: () => void
  deleteTool: () => void
  
  // Wall type operations
  layoutWall: () => void
  zoneWall: () => void
  areaWall: () => void
}): ShortcutAction[] {
  return [
    // File operations
    {
      key: 's',
      ctrlKey: true,
      description: 'Save floor plan',
      category: 'file',
      handler: handlers.save
    },
    {
      key: 'o',
      ctrlKey: true,
      description: 'Open floor plan',
      category: 'file',
      handler: handlers.load
    },
    {
      key: 'e',
      ctrlKey: true,
      description: 'Export floor plan',
      category: 'file',
      handler: handlers.export
    },
    
    // Edit operations
    {
      key: 'z',
      ctrlKey: true,
      description: 'Undo',
      category: 'edit',
      handler: handlers.undo
    },
    {
      key: 'y',
      ctrlKey: true,
      description: 'Redo',
      category: 'edit',
      handler: handlers.redo
    },
    {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      description: 'Redo (alternative)',
      category: 'edit',
      handler: handlers.redo
    },
    {
      key: 'Delete',
      description: 'Delete selected',
      category: 'edit',
      handler: handlers.delete
    },
    {
      key: 'Backspace',
      description: 'Delete selected (alternative)',
      category: 'edit',
      handler: handlers.delete
    },
    {
      key: 'a',
      ctrlKey: true,
      description: 'Select all',
      category: 'selection',
      handler: handlers.selectAll
    },
    {
      key: 'c',
      ctrlKey: true,
      description: 'Copy',
      category: 'edit',
      handler: handlers.copy
    },
    {
      key: 'v',
      ctrlKey: true,
      description: 'Paste',
      category: 'edit',
      handler: handlers.paste
    },
    
    // View operations
    {
      key: '=',
      ctrlKey: true,
      description: 'Zoom in',
      category: 'view',
      handler: handlers.zoomIn
    },
    {
      key: '+',
      ctrlKey: true,
      description: 'Zoom in (alternative)',
      category: 'view',
      handler: handlers.zoomIn
    },
    {
      key: '-',
      ctrlKey: true,
      description: 'Zoom out',
      category: 'view',
      handler: handlers.zoomOut
    },
    {
      key: '0',
      ctrlKey: true,
      description: 'Zoom to actual size',
      category: 'view',
      handler: handlers.zoomActual
    },
    {
      key: '9',
      ctrlKey: true,
      description: 'Fit to screen',
      category: 'view',
      handler: handlers.zoomFit
    },
    {
      key: 'g',
      ctrlKey: true,
      description: 'Toggle grid',
      category: 'view',
      handler: handlers.toggleGrid
    },
    {
      key: 'Home',
      description: 'Reset view',
      category: 'view',
      handler: handlers.resetView
    },
    
    // Tool shortcuts
    {
      key: 'v',
      description: 'Select tool',
      category: 'tool',
      handler: handlers.selectTool
    },
    {
      key: 'p',
      description: 'Draw tool',
      category: 'tool',
      handler: handlers.drawTool
    },
    {
      key: 'm',
      description: 'Move tool',
      category: 'tool',
      handler: handlers.moveTool
    },
    {
      key: 'd',
      description: 'Delete tool',
      category: 'tool',
      handler: handlers.deleteTool
    },
    
    // Wall type shortcuts
    {
      key: '1',
      description: 'Layout wall (350mm)',
      category: 'tool',
      handler: handlers.layoutWall
    },
    {
      key: '2',
      description: 'Zone wall (250mm)',
      category: 'tool',
      handler: handlers.zoneWall
    },
    {
      key: '3',
      description: 'Area wall (150mm)',
      category: 'tool',
      handler: handlers.areaWall
    },
    
    // Quick access
    {
      key: 'Escape',
      description: 'Cancel current operation',
      category: 'tool',
      handler: handlers.selectTool
    },
    {
      key: 'Space',
      description: 'Pan mode (hold)',
      category: 'view',
      handler: () => {} // Handled separately for hold behavior
    }
  ]
}

/**
 * Hook for using keyboard shortcuts in React components
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutAction[],
  enabled = true
): KeyboardShortcutManager {
  const manager = new KeyboardShortcutManager()
  
  // Register shortcuts
  shortcuts.forEach(shortcut => {
    manager.register(shortcut)
  })
  
  // Set enabled state
  manager.setEnabled(enabled)
  
  return manager
}