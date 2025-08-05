import { EventBus } from './EventBus'

export enum ErrorType {
  GEOMETRIC = 'geometric',
  RENDERING = 'rendering',
  UI = 'ui',
  MEMORY = 'memory',
  VALIDATION = 'validation'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorInfo {
  type: ErrorType
  severity: ErrorSeverity
  message: string
  details?: any
  timestamp: number
  recoverable: boolean
  userMessage?: string
}

export interface MemoryInfo {
  used: number
  total: number
  percentage: number
  warningThreshold: number
  criticalThreshold: number
}

export class ErrorHandler {
  private eventBus: EventBus
  private errorLog: ErrorInfo[] = []
  private memoryThresholds = {
    warning: 0.7, // 70% of available memory
    critical: 0.9  // 90% of available memory
  }
  private maxErrorLogSize = 100
  private isRecovering = false

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
    this.startMemoryMonitoring()
  }

  // Geometric Error Handling
  handleGeometricError(error: Error, context?: any): void {
    const errorInfo: ErrorInfo = {
      type: ErrorType.GEOMETRIC,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      details: context,
      timestamp: Date.now(),
      recoverable: true,
      userMessage: 'A geometric operation failed. The system will attempt to recover.'
    }

    this.logError(errorInfo)
    this.attemptGeometricRecovery(errorInfo)
  }

  private attemptGeometricRecovery(errorInfo: ErrorInfo): void {
    if (this.isRecovering) return

    this.isRecovering = true
    try {
      // Emit recovery event for components to handle
      this.eventBus.emit('geometric-error-recovery', errorInfo)
      
      // Attempt to revert to last valid state
      this.eventBus.emit('revert-to-last-valid-state')
      
      setTimeout(() => {
        this.isRecovering = false
      }, 1000)
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError)
      this.isRecovering = false
    }
  }

  // Rendering Error Handling
  handleRenderingError(error: Error, context?: any): void {
    const errorInfo: ErrorInfo = {
      type: ErrorType.RENDERING,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      details: context,
      timestamp: Date.now(),
      recoverable: true,
      userMessage: 'A rendering error occurred. The canvas will be refreshed.'
    }

    this.logError(errorInfo)
    this.attemptRenderingRecovery(errorInfo)
  }

  private attemptRenderingRecovery(errorInfo: ErrorInfo): void {
    try {
      // Clear and re-render the canvas
      this.eventBus.emit('clear-and-rerender', errorInfo)
      
      // Force a complete canvas refresh
      setTimeout(() => {
        this.eventBus.emit('force-canvas-refresh')
      }, 100)
    } catch (recoveryError) {
      console.error('Rendering recovery failed:', recoveryError)
    }
  }

  // UI Error Handling
  handleUIError(error: Error, context?: any): void {
    const errorInfo: ErrorInfo = {
      type: ErrorType.UI,
      severity: ErrorSeverity.LOW,
      message: error.message,
      details: context,
      timestamp: Date.now(),
      recoverable: true,
      userMessage: 'A UI error occurred. Please try the operation again.'
    }

    this.logError(errorInfo)
    this.notifyUser(errorInfo)
  }

  // Validation Error Handling
  handleValidationError(message: string, context?: any): void {
    const errorInfo: ErrorInfo = {
      type: ErrorType.VALIDATION,
      severity: ErrorSeverity.LOW,
      message,
      details: context,
      timestamp: Date.now(),
      recoverable: true,
      userMessage: message
    }

    this.logError(errorInfo)
    this.notifyUser(errorInfo)
  }

  // Memory Monitoring
  private startMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        this.checkMemoryUsage()
      }, 5000) // Check every 5 seconds
    }
  }

  private checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const used = memory.usedJSHeapSize
      const total = memory.jsHeapSizeLimit
      const percentage = used / total

      const memoryInfo: MemoryInfo = {
        used,
        total,
        percentage,
        warningThreshold: this.memoryThresholds.warning,
        criticalThreshold: this.memoryThresholds.critical
      }

      if (percentage > this.memoryThresholds.critical) {
        this.handleMemoryError(memoryInfo, ErrorSeverity.CRITICAL)
      } else if (percentage > this.memoryThresholds.warning) {
        this.handleMemoryError(memoryInfo, ErrorSeverity.MEDIUM)
      }

      // Emit memory info for monitoring
      this.eventBus.emit('memory-usage-update', memoryInfo)
    }
  }

  private handleMemoryError(memoryInfo: MemoryInfo, severity: ErrorSeverity): void {
    const errorInfo: ErrorInfo = {
      type: ErrorType.MEMORY,
      severity,
      message: `Memory usage is ${(memoryInfo.percentage * 100).toFixed(1)}%`,
      details: memoryInfo,
      timestamp: Date.now(),
      recoverable: severity !== ErrorSeverity.CRITICAL,
      userMessage: severity === ErrorSeverity.CRITICAL 
        ? 'Critical memory usage detected. Please save your work and refresh the page.'
        : `High memory usage detected (${(memoryInfo.percentage * 100).toFixed(1)}%). Consider saving your work.`
    }

    this.logError(errorInfo)
    this.notifyUser(errorInfo)

    if (severity === ErrorSeverity.CRITICAL) {
      this.attemptMemoryRecovery()
    }
  }

  private attemptMemoryRecovery(): void {
    try {
      // Clear non-essential data
      this.eventBus.emit('clear-cache')
      
      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc()
      }
      
      // Suggest user action
      this.eventBus.emit('suggest-save-and-refresh')
    } catch (recoveryError) {
      console.error('Memory recovery failed:', recoveryError)
    }
  }

  // Error Logging and Management
  private logError(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo)
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxErrorLogSize)
    }

    // Emit error event
    this.eventBus.emit('error-occurred', errorInfo)
    
    // Log to console for debugging
    console.error(`[${errorInfo.type.toUpperCase()}] ${errorInfo.message}`, errorInfo.details)
  }

  private notifyUser(errorInfo: ErrorInfo): void {
    if (errorInfo.userMessage) {
      this.eventBus.emit('show-user-notification', {
        message: errorInfo.userMessage,
        severity: errorInfo.severity,
        type: errorInfo.type
      })
    }
  }

  // Public API
  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog]
  }

  clearErrorLog(): void {
    this.errorLog = []
  }

  getMemoryInfo(): MemoryInfo | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.jsHeapSizeLimit,
        percentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
        warningThreshold: this.memoryThresholds.warning,
        criticalThreshold: this.memoryThresholds.critical
      }
    }
    return null
  }

  setMemoryThresholds(warning: number, critical: number): void {
    this.memoryThresholds.warning = Math.max(0, Math.min(1, warning))
    this.memoryThresholds.critical = Math.max(0, Math.min(1, critical))
  }

  isRecoveringFromError(): boolean {
    return this.isRecovering
  }

  // Error Statistics
  getErrorStats(): { [key in ErrorType]: number } {
    const stats = {
      [ErrorType.GEOMETRIC]: 0,
      [ErrorType.RENDERING]: 0,
      [ErrorType.UI]: 0,
      [ErrorType.MEMORY]: 0,
      [ErrorType.VALIDATION]: 0
    }

    this.errorLog.forEach(error => {
      stats[error.type]++
    })

    return stats
  }

  getRecentErrors(count: number = 10): ErrorInfo[] {
    return this.errorLog.slice(-count)
  }

  // Cleanup
  destroy(): void {
    this.errorLog = []
    this.isRecovering = false
  }
} 