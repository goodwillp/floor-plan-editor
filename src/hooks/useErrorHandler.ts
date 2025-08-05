import { useEffect, useRef, useState, useCallback } from 'react'
import { ErrorHandler, type ErrorInfo, type MemoryInfo, ErrorType, ErrorSeverity } from '@/lib/ErrorHandler'
import { EventBus } from '@/lib/EventBus'

interface UseErrorHandlerProps {
  onError?: (errorInfo: ErrorInfo) => void
  onMemoryWarning?: (memoryInfo: MemoryInfo) => void
  onRecoveryAttempt?: (errorInfo: ErrorInfo) => void
}

interface UseErrorHandlerReturn {
  errorHandler: ErrorHandler | null
  errorLog: ErrorInfo[]
  memoryInfo: MemoryInfo | null
  isRecovering: boolean
  errorStats: { [key in ErrorType]: number }
  handleGeometricError: (error: Error, context?: any) => void
  handleRenderingError: (error: Error, context?: any) => void
  handleUIError: (error: Error, context?: any) => void
  handleValidationError: (message: string, context?: any) => void
  clearErrorLog: () => void
  getRecentErrors: (count?: number) => ErrorInfo[]
  setMemoryThresholds: (warning: number, critical: number) => void
}

export function useErrorHandler({
  onError,
  onMemoryWarning,
  onRecoveryAttempt
}: UseErrorHandlerProps = {}): UseErrorHandlerReturn {
  const errorHandlerRef = useRef<ErrorHandler | null>(null)
  const [errorLog, setErrorLog] = useState<ErrorInfo[]>([])
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null)
  const [isRecovering, setIsRecovering] = useState(false)
  const [errorStats, setErrorStats] = useState<{ [key in ErrorType]: number }>({
    [ErrorType.GEOMETRIC]: 0,
    [ErrorType.RENDERING]: 0,
    [ErrorType.UI]: 0,
    [ErrorType.MEMORY]: 0,
    [ErrorType.VALIDATION]: 0
  })

  useEffect(() => {
    const eventBus = EventBus.getInstance()
    errorHandlerRef.current = new ErrorHandler(eventBus)

    const handleErrorOccurred = (errorInfo: ErrorInfo) => {
      setErrorLog(prev => [...prev, errorInfo])
      setErrorStats(errorHandlerRef.current?.getErrorStats() || errorStats)
      onError?.(errorInfo)
    }

    const handleMemoryUpdate = (memoryInfo: MemoryInfo) => {
      setMemoryInfo(memoryInfo)
      if (memoryInfo.percentage > memoryInfo.warningThreshold) {
        onMemoryWarning?.(memoryInfo)
      }
    }

    const handleRecoveryAttempt = (errorInfo: ErrorInfo) => {
      setIsRecovering(true)
      onRecoveryAttempt?.(errorInfo)
      
      // Reset recovery state after a delay
      setTimeout(() => {
        setIsRecovering(false)
      }, 2000)
    }

    const handleGeometricRecovery = (errorInfo: ErrorInfo) => {
      setIsRecovering(true)
      onRecoveryAttempt?.(errorInfo)
      
      setTimeout(() => {
        setIsRecovering(false)
      }, 1000)
    }

    const handleRenderingRecovery = (errorInfo: ErrorInfo) => {
      setIsRecovering(true)
      onRecoveryAttempt?.(errorInfo)
      
      setTimeout(() => {
        setIsRecovering(false)
      }, 500)
    }

    // Subscribe to error events
    eventBus.on('error-occurred', handleErrorOccurred)
    eventBus.on('memory-usage-update', handleMemoryUpdate)
    eventBus.on('geometric-error-recovery', handleGeometricRecovery)
    eventBus.on('clear-and-rerender', handleRenderingRecovery)

    // Initial state
    if (errorHandlerRef.current) {
      setErrorLog(errorHandlerRef.current.getErrorLog())
      setErrorStats(errorHandlerRef.current.getErrorStats())
      setMemoryInfo(errorHandlerRef.current.getMemoryInfo())
    }

    return () => {
      eventBus.off('error-occurred', handleErrorOccurred)
      eventBus.off('memory-usage-update', handleMemoryUpdate)
      eventBus.off('geometric-error-recovery', handleGeometricRecovery)
      eventBus.off('clear-and-rerender', handleRenderingRecovery)
      
      errorHandlerRef.current?.destroy()
      errorHandlerRef.current = null
    }
  }, [onError, onMemoryWarning, onRecoveryAttempt, errorStats])

  const handleGeometricError = useCallback((error: Error, context?: any) => {
    errorHandlerRef.current?.handleGeometricError(error, context)
  }, [])

  const handleRenderingError = useCallback((error: Error, context?: any) => {
    errorHandlerRef.current?.handleRenderingError(error, context)
  }, [])

  const handleUIError = useCallback((error: Error, context?: any) => {
    errorHandlerRef.current?.handleUIError(error, context)
  }, [])

  const handleValidationError = useCallback((message: string, context?: any) => {
    errorHandlerRef.current?.handleValidationError(message, context)
  }, [])

  const clearErrorLog = useCallback(() => {
    errorHandlerRef.current?.clearErrorLog()
    setErrorLog([])
    setErrorStats({
      [ErrorType.GEOMETRIC]: 0,
      [ErrorType.RENDERING]: 0,
      [ErrorType.UI]: 0,
      [ErrorType.MEMORY]: 0,
      [ErrorType.VALIDATION]: 0
    })
  }, [])

  const getRecentErrors = useCallback((count: number = 10) => {
    return errorHandlerRef.current?.getRecentErrors(count) || []
  }, [])

  const setMemoryThresholds = useCallback((warning: number, critical: number) => {
    errorHandlerRef.current?.setMemoryThresholds(warning, critical)
  }, [])

  return {
    errorHandler: errorHandlerRef.current,
    errorLog,
    memoryInfo,
    isRecovering,
    errorStats,
    handleGeometricError,
    handleRenderingError,
    handleUIError,
    handleValidationError,
    clearErrorLog,
    getRecentErrors,
    setMemoryThresholds
  }
} 