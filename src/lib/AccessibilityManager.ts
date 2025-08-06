/**
 * Accessibility manager for the floor plan editor
 * Requirements: 7.5 - Perform final UI/UX polish and accessibility improvements
 */

export interface AccessibilityConfig {
  enableScreenReader: boolean
  enableKeyboardNavigation: boolean
  enableHighContrast: boolean
  enableReducedMotion: boolean
  announceChanges: boolean
  focusManagement: boolean
}

export interface FocusableElement {
  element: HTMLElement
  priority: number
  group: string
  description: string
}

/**
 * Accessibility manager for improved user experience
 */
export class AccessibilityManager {
  private config: AccessibilityConfig
  private focusableElements: Map<string, FocusableElement[]> = new Map()
  private currentFocusGroup: string | null = null
  private currentFocusIndex = 0
  private announcer: HTMLElement | null = null
  private reducedMotionQuery: MediaQueryList | null = null
  private highContrastQuery: MediaQueryList | null = null

  constructor(config: Partial<AccessibilityConfig> = {}) {
    this.config = {
      enableScreenReader: true,
      enableKeyboardNavigation: true,
      enableHighContrast: false,
      enableReducedMotion: false,
      announceChanges: true,
      focusManagement: true,
      ...config
    }

    this.initialize()
  }

  /**
   * Initialize accessibility features
   */
  private initialize(): void {
    this.createScreenReaderAnnouncer()
    this.setupMediaQueries()
    this.bindKeyboardNavigation()
    this.applyAccessibilityStyles()
  }

  /**
   * Create screen reader announcer element
   */
  private createScreenReaderAnnouncer(): void {
    if (!this.config.enableScreenReader) return

    this.announcer = document.createElement('div')
    this.announcer.setAttribute('aria-live', 'polite')
    this.announcer.setAttribute('aria-atomic', 'true')
    this.announcer.className = 'sr-only'
    this.announcer.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `
    
    document.body.appendChild(this.announcer)
  }

  /**
   * Setup media queries for accessibility preferences
   */
  private setupMediaQueries(): void {
    // Reduced motion preference
    this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.reducedMotionQuery.addEventListener('change', (e) => {
      this.config.enableReducedMotion = e.matches
      this.applyReducedMotion()
    })
    this.config.enableReducedMotion = this.reducedMotionQuery.matches

    // High contrast preference
    this.highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    this.highContrastQuery.addEventListener('change', (e) => {
      this.config.enableHighContrast = e.matches
      this.applyHighContrast()
    })
    this.config.enableHighContrast = this.highContrastQuery.matches
  }

  /**
   * Bind keyboard navigation handlers
   */
  private bindKeyboardNavigation(): void {
    if (!this.config.enableKeyboardNavigation) return

    document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this))
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyboardNavigation(event: KeyboardEvent): void {
    // Tab navigation within focus groups
    if (event.key === 'Tab' && this.currentFocusGroup) {
      const elements = this.focusableElements.get(this.currentFocusGroup)
      if (elements && elements.length > 1) {
        event.preventDefault()
        
        if (event.shiftKey) {
          this.focusPrevious()
        } else {
          this.focusNext()
        }
      }
    }

    // Arrow key navigation for canvas
    if (this.currentFocusGroup === 'canvas') {
      this.handleCanvasKeyNavigation(event)
    }

    // Escape to exit focus group
    if (event.key === 'Escape' && this.currentFocusGroup) {
      this.exitFocusGroup()
    }
  }

  /**
   * Handle canvas-specific keyboard navigation
   */
  private handleCanvasKeyNavigation(event: KeyboardEvent): void {
    const step = event.shiftKey ? 10 : 1 // Larger steps with Shift
    
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        this.announceCanvasMovement('up', step)
        break
      case 'ArrowDown':
        event.preventDefault()
        this.announceCanvasMovement('down', step)
        break
      case 'ArrowLeft':
        event.preventDefault()
        this.announceCanvasMovement('left', step)
        break
      case 'ArrowRight':
        event.preventDefault()
        this.announceCanvasMovement('right', step)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        this.announceCanvasAction('activate')
        break
    }
  }

  /**
   * Register focusable elements for a group
   */
  registerFocusGroup(groupName: string, elements: FocusableElement[]): void {
    if (!this.config.focusManagement) return

    // Sort elements by priority
    const sortedElements = elements.sort((a, b) => a.priority - b.priority)
    this.focusableElements.set(groupName, sortedElements)

    // Add ARIA attributes to elements
    sortedElements.forEach((item, index) => {
      const element = item.element
      element.setAttribute('tabindex', index === 0 ? '0' : '-1')
      element.setAttribute('role', element.getAttribute('role') || 'button')
      element.setAttribute('aria-describedby', `${groupName}-description`)
      
      // Add focus event listeners
      element.addEventListener('focus', () => {
        this.currentFocusGroup = groupName
        this.currentFocusIndex = index
        this.announceElementFocus(item)
      })
    })
  }

  /**
   * Focus next element in current group
   */
  private focusNext(): void {
    if (!this.currentFocusGroup) return

    const elements = this.focusableElements.get(this.currentFocusGroup)
    if (!elements) return

    this.currentFocusIndex = (this.currentFocusIndex + 1) % elements.length
    this.focusElement(elements[this.currentFocusIndex])
  }

  /**
   * Focus previous element in current group
   */
  private focusPrevious(): void {
    if (!this.currentFocusGroup) return

    const elements = this.focusableElements.get(this.currentFocusGroup)
    if (!elements) return

    this.currentFocusIndex = this.currentFocusIndex === 0 
      ? elements.length - 1 
      : this.currentFocusIndex - 1
    this.focusElement(elements[this.currentFocusIndex])
  }

  /**
   * Focus specific element
   */
  private focusElement(focusableElement: FocusableElement): void {
    // Update tabindex for all elements in group
    if (this.currentFocusGroup) {
      const elements = this.focusableElements.get(this.currentFocusGroup)
      elements?.forEach((item, index) => {
        item.element.setAttribute('tabindex', index === this.currentFocusIndex ? '0' : '-1')
      })
    }

    // Focus the element
    focusableElement.element.focus()
    this.announceElementFocus(focusableElement)
  }

  /**
   * Exit current focus group
   */
  private exitFocusGroup(): void {
    this.currentFocusGroup = null
    this.currentFocusIndex = 0
    this.announce('Exited focus group')
  }

  /**
   * Announce element focus to screen readers
   */
  private announceElementFocus(element: FocusableElement): void {
    if (!this.config.announceChanges) return
    
    const announcement = `${element.description}. ${element.group} group. Use arrow keys to navigate, Enter to activate, Escape to exit.`
    this.announce(announcement)
  }

  /**
   * Announce canvas movement
   */
  private announceCanvasMovement(direction: string, step: number): void {
    if (!this.config.announceChanges) return
    
    const announcement = `Moved ${direction} by ${step} ${step === 1 ? 'unit' : 'units'}`
    this.announce(announcement)
  }

  /**
   * Announce canvas action
   */
  private announceCanvasAction(action: string): void {
    if (!this.config.announceChanges) return
    
    const announcement = `Canvas ${action}`
    this.announce(announcement)
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.announcer || !this.config.announceChanges) return

    this.announcer.setAttribute('aria-live', priority)
    this.announcer.textContent = message

    // Clear after announcement
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = ''
      }
    }, 1000)
  }

  /**
   * Apply accessibility styles
   */
  private applyAccessibilityStyles(): void {
    const style = document.createElement('style')
    style.textContent = `
      /* Focus indicators */
      .a11y-focus-visible:focus-visible {
        outline: 2px solid #0066cc !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px rgba(0, 102, 204, 0.2) !important;
      }

      /* High contrast mode */
      .a11y-high-contrast {
        filter: contrast(150%) !important;
      }

      /* Reduced motion */
      .a11y-reduced-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }

      /* Screen reader only content */
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }

      /* Skip links */
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        z-index: 1000;
        border-radius: 4px;
      }

      .skip-link:focus {
        top: 6px;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Apply reduced motion preferences
   */
  private applyReducedMotion(): void {
    if (this.config.enableReducedMotion) {
      document.body.classList.add('a11y-reduced-motion')
    } else {
      document.body.classList.remove('a11y-reduced-motion')
    }
  }

  /**
   * Apply high contrast preferences
   */
  private applyHighContrast(): void {
    if (this.config.enableHighContrast) {
      document.body.classList.add('a11y-high-contrast')
    } else {
      document.body.classList.remove('a11y-high-contrast')
    }
  }

  /**
   * Add focus indicators to elements
   */
  addFocusIndicators(elements: HTMLElement[]): void {
    elements.forEach(element => {
      element.classList.add('a11y-focus-visible')
    })
  }

  /**
   * Create skip links for better navigation
   */
  createSkipLinks(targets: { label: string; target: string }[]): void {
    const skipContainer = document.createElement('div')
    skipContainer.className = 'skip-links'
    
    targets.forEach(({ label, target }) => {
      const link = document.createElement('a')
      link.href = `#${target}`
      link.className = 'skip-link'
      link.textContent = label
      skipContainer.appendChild(link)
    })
    
    document.body.insertBefore(skipContainer, document.body.firstChild)
  }

  /**
   * Add ARIA labels and descriptions to canvas elements
   */
  enhanceCanvasAccessibility(canvas: HTMLElement): void {
    canvas.setAttribute('role', 'application')
    canvas.setAttribute('aria-label', 'Floor plan editor canvas')
    canvas.setAttribute('aria-describedby', 'canvas-instructions')
    canvas.setAttribute('tabindex', '0')

    // Create instructions element
    const instructions = document.createElement('div')
    instructions.id = 'canvas-instructions'
    instructions.className = 'sr-only'
    instructions.textContent = 'Use arrow keys to navigate, Enter to select, Space to pan, and keyboard shortcuts for tools'
    
    canvas.parentNode?.insertBefore(instructions, canvas)
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.applyReducedMotion()
    this.applyHighContrast()
  }

  /**
   * Get current configuration
   */
  getConfig(): AccessibilityConfig {
    return { ...this.config }
  }

  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion(): boolean {
    return this.config.enableReducedMotion
  }

  /**
   * Check if user prefers high contrast
   */
  prefersHighContrast(): boolean {
    return this.config.enableHighContrast
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.announcer) {
      document.body.removeChild(this.announcer)
      this.announcer = null
    }

    if (this.reducedMotionQuery) {
      this.reducedMotionQuery.removeEventListener('change', () => {})
    }

    if (this.highContrastQuery) {
      this.highContrastQuery.removeEventListener('change', () => {})
    }

    document.removeEventListener('keydown', this.handleKeyboardNavigation.bind(this))
    this.focusableElements.clear()
  }
}