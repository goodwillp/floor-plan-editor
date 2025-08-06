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
    console.log('🔍 useErrorHandler useEffect triggered', {
      errorStats,
      isRecovering,
      memoryInfo,
      timestamp: Date.now()
    })
    
    const eventBus = EventBus.getInstance()
    errorHandlerRef.current = new ErrorHandler(eventBus)

    const handleErrorOccurred = (errorInfo: ErrorInfo) => {
      console.log('🔍 Error occurred:', errorInfo)
      setErrorLog(prev => [...prev, errorInfo])
      setErrorStats(errorHandlerRef.current?.getErrorStats() || errorStats)
      onError?.(errorInfo)
    }

    const handleMemoryUpdate = (memoryInfo: MemoryInfo) => {
      console.log('🔍 Memory update:', memoryInfo)
      setMemoryInfo(memoryInfo)
      if (memoryInfo.percentage > memoryInfo.warningThreshold) {
        onMemoryWarning?.(memoryInfo)
      }
    }

    const handleRecoveryAttempt = (errorInfo: ErrorInfo) => {
      console.log('🔍 Recovery attempt:', errorInfo)
      setIsRecovering(true)
      onRecoveryAttempt?.(errorInfo)
      
      // Reset recovery state after a delay
      setTimeout(() => {
        console.log('🔍 Resetting recovery state')
        setIsRecovering(false)
      }, 3000)
    }

    const handleRecoverySuccess = (errorInfo: ErrorInfo) => {
      console.log('🔍 Recovery success:', errorInfo)
      setIsRecovering(false)
    }

    const handleRecoveryFailure = (errorInfo: ErrorInfo) => {
      console.log('🔍 Recovery failure:', errorInfo)
      setIsRecovering(false)
    }

    eventBus.on('error:occurred', handleErrorOccurred)
    eventBus.on('memory:update', handleMemoryUpdate)
    eventBus.on('recovery:attempt', handleRecoveryAttempt)
    eventBus.on('recovery:success', handleRecoverySuccess)
    eventBus.on('recovery:failure', handleRecoveryFailure)

    return () => {
      console.log('🔍 useErrorHandler useEffect cleanup')
      eventBus.off('error:occurred', handleErrorOccurred)
      eventBus.off('memory:update', handleMemoryUpdate)
      eventBus.off('recovery:attempt', handleRecoveryAttempt)
      eventBus.off('recovery:success', handleRecoverySuccess)
      eventBus.off('recovery:failure', handleRecoveryFailure)
    }
  }, []) // Removed errorStats to prevent infinite loop

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