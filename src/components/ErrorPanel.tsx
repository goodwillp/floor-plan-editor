import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  XCircle, 
  Trash2, 
  RefreshCw,
  HardDrive,
  Activity,
  Shield,
  Bug
} from 'lucide-react'
import { ErrorSeverity } from '@/lib/ErrorHandler'
import type { ErrorInfo, MemoryInfo, ErrorType } from '@/lib/ErrorHandler'

interface ErrorPanelProps {
  errorLog?: ErrorInfo[]
  memoryInfo?: MemoryInfo | null
  isRecovering?: boolean
  errorStats?: { [key in ErrorType]: number }
  onClearErrors?: () => void
  // onSetMemoryThresholds?: (warning: number, critical: number) => void // Removed unused parameter
}

export function ErrorPanel({
  errorLog,
  memoryInfo,
  isRecovering,
  errorStats,
  onClearErrors,
  // onSetMemoryThresholds // Removed unused parameter
}: ErrorPanelProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [selectedError, setSelectedError] = useState<ErrorInfo | null>(null)

  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case 'geometric': return <Bug className="h-4 w-4" />
      case 'rendering': return <AlertTriangle className="h-4 w-4" />
      case 'ui': return <AlertCircle className="h-4 w-4" />
             case 'memory': return <HardDrive className="h-4 w-4" />
      case 'validation': return <Info className="h-4 w-4" />
      default: return <XCircle className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMemoryStatus = () => {
    if (!memoryInfo) return { status: 'Unknown', color: 'text-gray-500' }
    
    if (memoryInfo.percentage > memoryInfo.criticalThreshold) {
      return { status: 'Critical', color: 'text-red-600' }
    } else if (memoryInfo.percentage > memoryInfo.warningThreshold) {
      return { status: 'Warning', color: 'text-yellow-600' }
    } else {
      return { status: 'Normal', color: 'text-green-600' }
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const totalErrors = errorStats ? Object.values(errorStats).reduce((sum: number, count: number) => sum + count, 0) : 0

  const errorTypeStats = errorStats ? Object.entries(errorStats).filter(([, count]) => count > 0) : []

  const recentErrors = errorLog ? errorLog.slice(0, 5) : []

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Error Monitoring
            {totalErrors > 0 && (
              <Badge variant="destructive">{totalErrors}</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearErrors}
              disabled={totalErrors === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recovery Status */}
        {isRecovering && (
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertTitle>Recovering from Error</AlertTitle>
            <AlertDescription>
              The system is attempting to recover from an error. Please wait...
            </AlertDescription>
          </Alert>
        )}

        {/* Memory Usage */}
        {memoryInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                 <HardDrive className="h-4 w-4" />
                 <span className="font-medium">Memory Usage</span>
                <Badge className={getMemoryStatus().color}>
                  {getMemoryStatus().status}
                </Badge>
              </div>
              <span className="text-sm text-gray-500">
                {formatBytes(memoryInfo.used)} / {formatBytes(memoryInfo.total)}
              </span>
            </div>
            <Progress 
              value={memoryInfo.percentage * 100} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Used: {formatBytes(memoryInfo.used)}</span>
              <span>Available: {formatBytes(memoryInfo.total - memoryInfo.used)}</span>
            </div>
          </div>
        )}

        <Separator />

        {/* Error Statistics */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Error Statistics
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {errorTypeStats.map(([type, count]) => (
              <Badge key={type} variant="secondary" className="mr-2 mb-2">
                {type}: {count}
              </Badge>
            ))}
          </div>
        </div>

        {/* Error Log */}
        {showDetails && errorLog && errorLog.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium">Recent Errors</h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {recentErrors.map((error, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      error.severity === ErrorSeverity.CRITICAL
                        ? 'border-red-200 bg-red-50'
                        : error.severity === ErrorSeverity.HIGH
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getErrorIcon(error.type)}
                        <div>
                          <div className="font-medium text-sm">
                            {error.type.charAt(0).toUpperCase() + error.type.slice(1)} Error
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {error.message}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          error.severity === ErrorSeverity.CRITICAL
                            ? 'destructive'
                            : error.severity === ErrorSeverity.HIGH
                            ? 'secondary'
                            : 'default'
                        }
                        className="text-xs"
                      >
                        {error.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Error Details Modal */}
        {selectedError && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Error Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedError(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Type:</span>
                  <div className="flex items-center gap-2 mt-1">
                    {getErrorIcon(selectedError.type)}
                    <span className="capitalize">{selectedError.type}</span>
                  </div>
                </div>
                <div>
                  <span className="font-medium">Severity:</span>
                  <Badge className={`mt-1 ${getSeverityColor(selectedError.severity)}`}>
                    {selectedError.severity}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Message:</span>
                  <p className="text-sm mt-1">{selectedError.message}</p>
                </div>
                {selectedError.userMessage && (
                  <div>
                    <span className="font-medium">User Message:</span>
                    <p className="text-sm mt-1">{selectedError.userMessage}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium">Time:</span>
                  <p className="text-sm mt-1">
                    {new Date(selectedError.timestamp).toLocaleString()}
                  </p>
                </div>
                {selectedError.details && (
                  <div>
                    <span className="font-medium">Details:</span>
                    <pre className="text-xs mt-1 bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(selectedError.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 