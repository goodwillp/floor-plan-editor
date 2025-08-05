import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { ErrorType, ErrorSeverity } from '@/lib/ErrorHandler'
import { EventBus } from '@/lib/EventBus'

describe('useErrorHandler', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = EventBus.getInstance()
  })

  afterEach(() => {
    eventBus.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useErrorHandler())

      expect(result.current.errorHandler).toBeTruthy()
      expect(result.current.errorLog).toEqual([])
      expect(result.current.memoryInfo).toBeNull()
      expect(result.current.isRecovering).toBe(false)
      expect(result.current.errorStats).toEqual({
        [ErrorType.GEOMETRIC]: 0,
        [ErrorType.RENDERING]: 0,
        [ErrorType.UI]: 0,
        [ErrorType.MEMORY]: 0,
        [ErrorType.VALIDATION]: 0
      })
    })

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn()
      const { result } = renderHook(() => useErrorHandler({ onError }))

      act(() => {
        result.current.handleUIError(new Error('Test error'))
      })

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        type: ErrorType.UI,
        message: 'Test error'
      }))
    })

    it('should call onMemoryWarning callback when memory usage is high', () => {
      const onMemoryWarning = vi.fn()
      const { result } = renderHook(() => useErrorHandler({ onMemoryWarning }))

      // Mock memory API
      const mockMemory = {
        usedJSHeapSize: 80 * 1024 * 1024, // 80MB (80%)
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
      }
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true
      })

      act(() => {
        // Trigger memory check
        result.current.errorHandler?.checkMemoryUsage()
      })

      expect(onMemoryWarning).toHaveBeenCalledWith(expect.objectContaining({
        percentage: 0.8,
        warningThreshold: 0.7
      }))
    })

    it('should call onRecoveryAttempt callback when recovery starts', () => {
      const onRecoveryAttempt = vi.fn()
      const { result } = renderHook(() => useErrorHandler({ onRecoveryAttempt }))

      act(() => {
        result.current.handleGeometricError(new Error('Test error'))
      })

      expect(onRecoveryAttempt).toHaveBeenCalledWith(expect.objectContaining({
        type: ErrorType.GEOMETRIC
      }))
    })
  })

  describe('Error Handling Functions', () => {
    it('should handle geometric errors', () => {
      const { result } = renderHook(() => useErrorHandler())
      const emitSpy = vi.spyOn(eventBus, 'emit')

      act(() => {
        result.current.handleGeometricError(new Error('Geometric error'), { context: 'test' })
      })

      expect(emitSpy).toHaveBeenCalledWith('error-occurred', expect.objectContaining({
        type: ErrorType.GEOMETRIC,
        severity: ErrorSeverity.MEDIUM,
        message: 'Geometric error'
      }))
    })

    it('should handle rendering errors', () => {
      const { result } = renderHook(() => useErrorHandler())
      const emitSpy = vi.spyOn(eventBus, 'emit')

      act(() => {
        result.current.handleRenderingError(new Error('Rendering error'), { context: 'test' })
      })

      expect(emitSpy).toHaveBeenCalledWith('error-occurred', expect.objectContaining({
        type: ErrorType.RENDERING,
        severity: ErrorSeverity.HIGH,
        message: 'Rendering error'
      }))
    })

    it('should handle UI errors', () => {
      const { result } = renderHook(() => useErrorHandler())
      const emitSpy = vi.spyOn(eventBus, 'emit')

      act(() => {
        result.current.handleUIError(new Error('UI error'), { context: 'test' })
      })

      expect(emitSpy).toHaveBeenCalledWith('error-occurred', expect.objectContaining({
        type: ErrorType.UI,
        severity: ErrorSeverity.LOW,
        message: 'UI error'
      }))
    })

    it('should handle validation errors', () => {
      const { result } = renderHook(() => useErrorHandler())
      const emitSpy = vi.spyOn(eventBus, 'emit')

      act(() => {
        result.current.handleValidationError('Validation error', { context: 'test' })
      })

      expect(emitSpy).toHaveBeenCalledWith('error-occurred', expect.objectContaining({
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: 'Validation error'
      }))
    })
  })

  describe('State Management', () => {
    it('should update error log when errors occur', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        result.current.handleUIError(new Error('Test error'))
      })

      expect(result.current.errorLog.length).toBeGreaterThan(0)
      expect(result.current.errorLog[0]).toMatchObject({
        type: ErrorType.UI,
        message: 'Test error'
      })
    })

    it('should update error stats when errors occur', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        result.current.handleUIError(new Error('UI error'))
        result.current.handleGeometricError(new Error('Geometric error'))
      })

      expect(result.current.errorStats[ErrorType.UI]).toBe(1)
      expect(result.current.errorStats[ErrorType.GEOMETRIC]).toBe(1)
      expect(result.current.errorStats[ErrorType.RENDERING]).toBe(0)
    })

    it('should update memory info when available', () => {
      const { result } = renderHook(() => useErrorHandler())

      // Mock memory API
      const mockMemory = {
        usedJSHeapSize: 50 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024
      }
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true
      })

      act(() => {
        // Trigger memory update
        eventBus.emit('memory-usage-update', {
          used: 50 * 1024 * 1024,
          total: 100 * 1024 * 1024,
          percentage: 0.5,
          warningThreshold: 0.7,
          criticalThreshold: 0.9
        })
      })

      expect(result.current.memoryInfo).toEqual({
        used: 50 * 1024 * 1024,
        total: 100 * 1024 * 1024,
        percentage: 0.5,
        warningThreshold: 0.7,
        criticalThreshold: 0.9
      })
    })

    it('should update recovery state during recovery', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        result.current.handleGeometricError(new Error('Test error'))
      })

      expect(result.current.isRecovering).toBe(true)

      // Wait for recovery to complete
      act(() => {
        // Simulate recovery completion
        setTimeout(() => {
          expect(result.current.isRecovering).toBe(false)
        }, 1100)
      })
    })
  })

  describe('Utility Functions', () => {
    it('should clear error log', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        result.current.handleUIError(new Error('Test error'))
        result.current.clearErrorLog()
      })

      expect(result.current.errorLog).toEqual([])
      expect(result.current.errorStats).toEqual({
        [ErrorType.GEOMETRIC]: 0,
        [ErrorType.RENDERING]: 0,
        [ErrorType.UI]: 0,
        [ErrorType.MEMORY]: 0,
        [ErrorType.VALIDATION]: 0
      })
    })

    it('should get recent errors', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.handleUIError(new Error(`Error ${i}`))
        }
      })

      const recentErrors = result.current.getRecentErrors(10)
      expect(recentErrors.length).toBe(10)
    })

    it('should set memory thresholds', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        result.current.setMemoryThresholds(0.6, 0.8)
      })

      const memoryInfo = result.current.errorHandler?.getMemoryInfo()
      if (memoryInfo) {
        expect(memoryInfo.warningThreshold).toBe(0.6)
        expect(memoryInfo.criticalThreshold).toBe(0.8)
      }
    })
  })

  describe('Event Handling', () => {
    it('should handle error-occurred events', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        eventBus.emit('error-occurred', {
          type: ErrorType.UI,
          severity: ErrorSeverity.LOW,
          message: 'Test error',
          timestamp: Date.now(),
          recoverable: true
        })
      })

      expect(result.current.errorLog.length).toBeGreaterThan(0)
      expect(result.current.errorLog[0]).toMatchObject({
        type: ErrorType.UI,
        message: 'Test error'
      })
    })

    it('should handle memory-usage-update events', () => {
      const { result } = renderHook(() => useErrorHandler())

      const memoryInfo = {
        used: 50 * 1024 * 1024,
        total: 100 * 1024 * 1024,
        percentage: 0.5,
        warningThreshold: 0.7,
        criticalThreshold: 0.9
      }

      act(() => {
        eventBus.emit('memory-usage-update', memoryInfo)
      })

      expect(result.current.memoryInfo).toEqual(memoryInfo)
    })

    it('should handle geometric-error-recovery events', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        eventBus.emit('geometric-error-recovery', {
          type: ErrorType.GEOMETRIC,
          message: 'Test error'
        })
      })

      expect(result.current.isRecovering).toBe(true)
    })

    it('should handle clear-and-rerender events', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        eventBus.emit('clear-and-rerender', {
          type: ErrorType.RENDERING,
          message: 'Test error'
        })
      })

      expect(result.current.isRecovering).toBe(true)
    })
  })

  describe('Cleanup', () => {
    it('should clean up event listeners on unmount', () => {
      const { result, unmount } = renderHook(() => useErrorHandler())
      const offSpy = vi.spyOn(eventBus, 'off')

      unmount()

      expect(offSpy).toHaveBeenCalledWith('error-occurred', expect.any(Function))
      expect(offSpy).toHaveBeenCalledWith('memory-usage-update', expect.any(Function))
      expect(offSpy).toHaveBeenCalledWith('geometric-error-recovery', expect.any(Function))
      expect(offSpy).toHaveBeenCalledWith('clear-and-rerender', expect.any(Function))
    })

    it('should destroy error handler on unmount', () => {
      const { result, unmount } = renderHook(() => useErrorHandler())
      const destroySpy = vi.spyOn(result.current.errorHandler!, 'destroy')

      unmount()

      expect(destroySpy).toHaveBeenCalled()
    })
  })

  describe('Error Recovery', () => {
    it('should handle recovery state transitions', () => {
      const { result } = renderHook(() => useErrorHandler())

      // Start recovery
      act(() => {
        result.current.handleGeometricError(new Error('Test error'))
      })

      expect(result.current.isRecovering).toBe(true)

      // Recovery should complete after timeout
      act(() => {
        // Fast-forward time
        vi.advanceTimersByTime(1100)
      })

      expect(result.current.isRecovering).toBe(false)
    })

    it('should handle multiple recovery attempts', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        result.current.handleGeometricError(new Error('Error 1'))
        result.current.handleRenderingError(new Error('Error 2'))
      })

      expect(result.current.isRecovering).toBe(true)
      expect(result.current.errorLog.length).toBeGreaterThan(1)
    })
  })
}) 