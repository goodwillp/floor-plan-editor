import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, XCircle, Activity, Zap } from 'lucide-react'
import type { RenderStats } from '@/lib/PerformanceOptimizer'

/**
 * Performance monitoring component for development and debugging
 * Requirements: 6.7, 9.5 - Monitor and optimize performance
 */

export interface PerformanceMonitorProps {
  renderStats?: RenderStats
  frameStats?: {
    averageFrameTime: number
    maxFrameTime: number
    minFrameTime: number
    fps: number
    performanceLevel: 'good' | 'warning' | 'critical'
  }
  memoryStats?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
    percentage: number
  }
  recommendations?: string[]
  onEnablePerformanceMode?: () => void
  onDisablePerformanceMode?: () => void
  isPerformanceModeEnabled?: boolean
  className?: string
}

export function PerformanceMonitor({
  renderStats,
  frameStats,
  memoryStats,
  recommendations = [],
  onEnablePerformanceMode,
  onDisablePerformanceMode,
  isPerformanceModeEnabled = false,
  className
}: PerformanceMonitorProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentMemory, setCurrentMemory] = useState<PerformanceMonitorProps['memoryStats']>()

  // Update memory stats periodically
  useEffect(() => {
    const updateMemoryStats = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const used = memory.usedJSHeapSize
        const total = memory.totalJSHeapSize
        const limit = memory.jsHeapSizeLimit
        
        setCurrentMemory({
          usedJSHeapSize: used,
          totalJSHeapSize: total,
          jsHeapSizeLimit: limit,
          percentage: (used / limit) * 100
        })
      }
    }

    updateMemoryStats()
    const interval = setInterval(updateMemoryStats, 1000)
    return () => clearInterval(interval)
  }, [])

  const displayMemoryStats = memoryStats || currentMemory

  const getPerformanceIcon = (level: string) => {
    switch (level) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getPerformanceBadgeVariant = (level: string) => {
    switch (level) {
      case 'good':
        return 'default'
      case 'warning':
        return 'secondary'
      case 'critical':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatTime = (ms: number) => {
    return `${ms.toFixed(2)}ms`
  }

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className={`fixed bottom-4 right-4 z-50 ${className}`}
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
      </Button>
    )
  }

  return (
    <Card className={`fixed bottom-4 right-4 w-80 z-50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance Monitor
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Frame Performance */}
        {frameStats && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Frame Performance</span>
              <div className="flex items-center gap-1">
                {getPerformanceIcon(frameStats.performanceLevel)}
                <Badge variant={getPerformanceBadgeVariant(frameStats.performanceLevel)}>
                  {frameStats.fps.toFixed(0)} FPS
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Avg:</span> {formatTime(frameStats.averageFrameTime)}
              </div>
              <div>
                <span className="text-muted-foreground">Max:</span> {formatTime(frameStats.maxFrameTime)}
              </div>
            </div>
          </div>
        )}

        {/* Render Statistics */}
        {renderStats && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Render Statistics</span>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Total Walls:</span> {renderStats.totalWalls}
              </div>
              <div>
                <span className="text-muted-foreground">Visible:</span> {renderStats.visibleWalls}
              </div>
              <div>
                <span className="text-muted-foreground">Culled:</span> {renderStats.culledWalls}
              </div>
              <div>
                <span className="text-muted-foreground">Render Time:</span> {formatTime(renderStats.renderTime)}
              </div>
            </div>
            
            {renderStats.totalWalls > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Culling Efficiency</span>
                  <span>{((renderStats.culledWalls / renderStats.totalWalls) * 100).toFixed(0)}%</span>
                </div>
                <Progress 
                  value={(renderStats.culledWalls / renderStats.totalWalls) * 100} 
                  className="h-1"
                />
              </div>
            )}
          </div>
        )}

        {/* Memory Usage */}
        {displayMemoryStats && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Memory Usage</span>
              <Badge variant={displayMemoryStats.percentage > 80 ? 'destructive' : 'default'}>
                {displayMemoryStats.percentage.toFixed(1)}%
              </Badge>
            </div>
            
            <div className="space-y-1">
              <Progress 
                value={displayMemoryStats.percentage} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {formatBytes(displayMemoryStats.usedJSHeapSize)} / {formatBytes(displayMemoryStats.jsHeapSizeLimit)}
              </div>
            </div>
          </div>
        )}

        {/* Performance Mode Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Performance Mode</span>
          <Button
            variant={isPerformanceModeEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={isPerformanceModeEnabled ? onDisablePerformanceMode : onEnablePerformanceMode}
            className="h-7"
          >
            <Zap className="h-3 w-3 mr-1" />
            {isPerformanceModeEnabled ? 'Enabled' : 'Disabled'}
          </Button>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Recommendations</span>
            <div className="space-y-1">
              {recommendations.slice(0, 3).map((recommendation, index) => (
                <div key={index} className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  {recommendation}
                </div>
              ))}
              {recommendations.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{recommendations.length - 3} more recommendations
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Hook for monitoring performance metrics
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    frameStats?: PerformanceMonitorProps['frameStats']
    memoryStats?: PerformanceMonitorProps['memoryStats']
  }>({})

  useEffect(() => {
    let frameId: number | null = null
    let intervalId: number | null = null
    const frameTimes: number[] = []
    let lastTime = performance.now()
    let isActive = true

    const measureFrame = (currentTime: number) => {
      if (!isActive) return
      
      const frameTime = currentTime - lastTime
      frameTimes.push(frameTime)
      
      // Keep only last 60 frames
      if (frameTimes.length > 60) {
        frameTimes.shift()
      }

      lastTime = currentTime
      frameId = requestAnimationFrame(measureFrame)
    }

    // Update stats periodically instead of every frame
    const updateStats = () => {
      if (!isActive || frameTimes.length === 0) return
      
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
      const maxFrameTime = Math.max(...frameTimes)
      const minFrameTime = Math.min(...frameTimes)
      const fps = Math.round(1000 / avgFrameTime)

      let performanceLevel: 'good' | 'warning' | 'critical' = 'good'
      if (avgFrameTime > 50) {
        performanceLevel = 'critical'
      } else if (avgFrameTime > 33) {
        performanceLevel = 'warning'
      }

      // Get memory stats if available
      let memoryStats: PerformanceMonitorProps['memoryStats'] | undefined
      if ('memory' in performance) {
        const memory = (performance as any).memory
        memoryStats = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        }
      }

      setMetrics({
        frameStats: {
          averageFrameTime: avgFrameTime,
          maxFrameTime,
          minFrameTime,
          fps,
          performanceLevel
        },
        memoryStats
      })
    }

    // Start frame measurement
    frameId = requestAnimationFrame(measureFrame)
    
    // Update stats every 2 seconds instead of every frame
    intervalId = window.setInterval(updateStats, 2000)

    return () => {
      isActive = false
      if (frameId) {
        cancelAnimationFrame(frameId)
      }
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [])

  return metrics
}