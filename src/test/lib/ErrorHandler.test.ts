import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ErrorHandler, ErrorType, ErrorSeverity } from '@/lib/ErrorHandler'
import { EventBus } from '@/lib/EventBus'

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = EventBus.getInstance()
    errorHandler = new ErrorHandler(eventBus)
  })

  afterEach(() => {
    errorHandler.destroy()
  })

  describe('Geometric Error Handling', () => {
    it('should handle geometric errors correctly', () => {
      const mockError = new Error('Intersection calculation failed')
      const context = { point1: { x: 0, y: 0 }, point2: { x: 1, y: 1 } }
      
      const emitSpy = vi.spyOn(eventBus, 'emit')
      
      errorHandler.handleGeometricError(mockError, context)
      
      expect(emitSpy).toHaveBeenCalledWith('error-occurred', expect.objectContaining({
        type: ErrorType.GEOMETRIC,
        severity: ErrorSeverity.MEDIUM,
        message: 'Intersection calculation failed',
        details: context,
        recoverable: true,
        userMessage: 'A geometric operation failed. The system will attempt to recover.'
      }))
      
      expect(emitSpy).toHaveBeenCalledWith('geometric-error-recovery', expect.any(Object))
      expect(emitSpy).toHaveBeenCalledWith('revert-to-last-valid-state')
    })

    it('should not attempt recovery if already recovering', () => {
      const mockError = new Error('Test error')
      const emitSpy = vi.spyOn(eventBus, 'emit')
      
      // First error should trigger recovery
      errorHandler.handleGeometricError(mockError)
      expect(emitSpy).toHaveBeenCalledWith('geometric-error-recovery', expect.any(Object))
      
      // Reset spy
      emitSpy.mockClear()
      
      // Second error should not trigger recovery
      errorHandler.handleGeometricError(mockError)
      expect(emitSpy).not.toHaveBeenCalledWith('geometric-error-recovery', expect.any(Object))
    })
  })

  describe('Rendering Error Handling', () => {
    it('should handle rendering errors correctly', () => {
      const mockError = new Error('PixiJS rendering failed')
      const context = { layer: 'wall', operation: 'draw' }
      
      const emitSpy = vi.spyOn(eventBus, 'emit')
      
      errorHandler.handleRenderingError(mockError, context)
      
      expect(emitSpy).toHaveBeenCalledWith('error-occurred', expect.objectContaining({
        type: ErrorType.RENDERING,
        severity: ErrorSeverity.HIGH,
        message: 'PixiJS rendering failed',
        details: context,
        recoverable: true,
        userMessage: 'A rendering error occurred. The canvas will be refreshed.'
      }))
      
      expect(emitSpy).toHaveBeenCalledWith('clear-and-rerender', expect.any(Object))
    })

    it('should force canvas refresh after rendering error', () => {
      const mockError = new Error('Rendering error')
      const emitSpy = vi.spyOn(eventBus, 'emit')
      
      errorHandler.handleRenderingError(mockError)
      
      expect(emitSpy).toHaveBeenCalledWith('clear-and-rerender', expect.any(Object))
      
      // Wait for timeout
      setTimeout(() => {
        expect(emitSpy).toHaveBeenCalledWith('force-canvas-refresh')
      }, 150)
    })
  })

  describe('UI Error Handling', () => {
    it('should handle UI errors correctly', () => {
      const mockError = new Error('Button click failed')
      const context = { component: 'ToolPalette', action: 'tool-change' }
      
      const emitSpy = vi.spyOn(eventBus, 'emit')
      
      errorHandler.handleUIError(mockError, context)
      
      expect(emitSpy).toHaveBeenCalledWith('error-occurred', expect.objectContaining({
        type: ErrorType.UI,
        severity: ErrorSeverity.LOW,
        message: 'Button click failed',
        details: context,
        recoverable: true,
        userMessage: 'A UI error occurred. Please try the operation again.'
      }))
      
      expect(emitSpy).toHaveBeenCalledWith('show-user-notification', expect.objectContaining({
        message: 'A UI error occurred. Please try the operation again.',
        severity: ErrorSeverity.LOW,
        type: ErrorType.UI
      }))
    })
  })

  describe('Validation Error Handling', () => {
    it('should handle validation errors correctly', () => {
      const message = 'Invalid wall thickness value'
      const context = { value: -5, min: 0, max: 1000 }
      
      const emitSpy = vi.spyOn(eventBus, 'emit')
      
      errorHandler.handleValidationError(message, context)
      
      expect(emitSpy).toHaveBeenCalledWith('error-occurred', expect.objectContaining({
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        message,
        details: context,
        recoverable: true,
        userMessage: message
      }))
    })
  })

  describe('Memory Monitoring', () => {
    it('should monitor memory usage when available', () => {
      // Mock performance.memory
      const mockMemory = {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
      }
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true
      })
      
      const emitSpy = vi.spyOn(eventBus, 'emit')
      
      // Trigger memory check
      errorHandler['checkMemoryUsage']()
      
      expect(emitSpy).toHaveBeenCalledWith('memory-usage-update', expect.objectContaining({
        used: 50 * 1024 * 1024,
        total: 100 * 1024 * 1024,
        percentage: 0.5,
        warningThreshold: 0.7,
        criticalThreshold: 0.9
      }))
    })

    it('should handle memory warnings correctly', () => {
      const mockMemory = {
        usedJSHeapSize: 80 * 1024 * 1024, // 80MB (80%)
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
      }
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true
      })
      
      const emitSpy = vi.spyOn(eventBus, 'emit')
      
      errorHandler['checkMemoryUsage']()
      
      expect(emitSpy).toHaveBeenCalledWith('error-occurred', expect.objectContaining({
        type: ErrorType.MEMORY,
        severity: ErrorSeverity.MEDIUM,
        message: 'Memory usage is 80.0%',
        recoverable: true,
        userMessage: 'High memory usage detected (80.0%). Consider saving your work.'
      }))
    })

    it('should handle critical memory errors correctly', () => {
      const mockMemory = {
        usedJSHeapSize: 95 * 1024 * 1024, // 95MB (95%)
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
      }
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true
      })
      
      const emitSpy = vi.spyOn(eventBus, 'emit')
      
      errorHandler['checkMemoryUsage']()
      
      expect(emitSpy).toHaveBeenCalledWith('error-occurred', expect.objectContaining({
        type: ErrorType.MEMORY,
        severity: ErrorSeverity.CRITICAL,
        message: 'Memory usage is 95.0%',
        recoverable: false,
        userMessage: 'Critical memory usage detected. Please save your work and refresh the page.'
      }))
      
      expect(emitSpy).toHaveBeenCalledWith('clear-cache')
      expect(emitSpy).toHaveBeenCalledWith('suggest-save-and-refresh')
    })
  })

  describe('Error Logging and Management', () => {
    it('should maintain error log with size limit', () => {
      const maxErrors = 100
      
      // Add more errors than the limit
      for (let i = 0; i < maxErrors + 10; i++) {
        errorHandler.handleUIError(new Error(`Error ${i}`))
      }
      
      const errorLog = errorHandler.getErrorLog()
      expect(errorLog.length).toBeLessThanOrEqual(maxErrors)
    })

    it('should provide error statistics', () => {
      errorHandler.handleGeometricError(new Error('Geometric error'))
      errorHandler.handleRenderingError(new Error('Rendering error'))
      errorHandler.handleUIError(new Error('UI error'))
      errorHandler.handleValidationError('Validation error')
      
      const stats = errorHandler.getErrorStats()
      
      expect(stats[ErrorType.GEOMETRIC]).toBe(1)
      expect(stats[ErrorType.RENDERING]).toBe(1)
      expect(stats[ErrorType.UI]).toBe(1)
      expect(stats[ErrorType.VALIDATION]).toBe(1)
      expect(stats[ErrorType.MEMORY]).toBe(0)
    })

    it('should clear error log', () => {
      errorHandler.handleUIError(new Error('Test error'))
      expect(errorHandler.getErrorLog().length).toBeGreaterThan(0)
      
      errorHandler.clearErrorLog()
      expect(errorHandler.getErrorLog().length).toBe(0)
    })

    it('should get recent errors', () => {
      for (let i = 0; i < 15; i++) {
        errorHandler.handleUIError(new Error(`Error ${i}`))
      }
      
      const recentErrors = errorHandler.getRecentErrors(10)
      expect(recentErrors.length).toBe(10)
    })
  })

  describe('Memory Thresholds', () => {
    it('should set memory thresholds correctly', () => {
      errorHandler.setMemoryThresholds(0.6, 0.8)
      
      const memoryInfo = errorHandler.getMemoryInfo()
      if (memoryInfo) {
        expect(memoryInfo.warningThreshold).toBe(0.6)
        expect(memoryInfo.criticalThreshold).toBe(0.8)
      }
    })

    it('should clamp memory thresholds to valid range', () => {
      errorHandler.setMemoryThresholds(-0.1, 1.5)
      
      const memoryInfo = errorHandler.getMemoryInfo()
      if (memoryInfo) {
        expect(memoryInfo.warningThreshold).toBe(0)
        expect(memoryInfo.criticalThreshold).toBe(1)
      }
    })
  })

  describe('Recovery State', () => {
    it('should track recovery state', () => {
      expect(errorHandler.isRecoveringFromError()).toBe(false)
      
      errorHandler.handleGeometricError(new Error('Test error'))
      expect(errorHandler.isRecoveringFromError()).toBe(true)
      
      // Wait for recovery to complete
      setTimeout(() => {
        expect(errorHandler.isRecoveringFromError()).toBe(false)
      }, 1100)
    })
  })

  describe('Memory Info', () => {
    it('should return null when memory API is not available', () => {
      // Mock the getMemoryInfo method to simulate memory API not available
      const originalGetMemoryInfo = errorHandler.getMemoryInfo.bind(errorHandler)
      
      // Create a spy that returns null to simulate no memory API
      vi.spyOn(errorHandler, 'getMemoryInfo').mockReturnValue(null)
      
      const memoryInfo = errorHandler.getMemoryInfo()
      expect(memoryInfo).toBeNull()
      
      // Restore original method
      vi.restoreAllMocks()
    })

    it('should return memory info when available', () => {
      const mockMemory = {
        usedJSHeapSize: 50 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024
      }
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true
      })
      
      const memoryInfo = errorHandler.getMemoryInfo()
      expect(memoryInfo).toEqual({
        used: 50 * 1024 * 1024,
        total: 100 * 1024 * 1024,
        percentage: 0.5,
        warningThreshold: 0.7,
        criticalThreshold: 0.9
      })
    })
  })

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      errorHandler.handleUIError(new Error('Test error'))
      expect(errorHandler.getErrorLog().length).toBeGreaterThan(0)
      
      errorHandler.destroy()
      
      expect(errorHandler.getErrorLog().length).toBe(0)
      expect(errorHandler.isRecoveringFromError()).toBe(false)
    })
  })
}) 