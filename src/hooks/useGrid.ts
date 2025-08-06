import { useEffect, useRef, useState, useCallback } from 'react'
import { GridService } from '@/lib/GridService'
import { GridRenderer, type GridConfig, DEFAULT_GRID_CONFIG } from '@/lib/GridRenderer'
import type { CanvasLayers } from '@/components/CanvasContainer'

interface UseGridProps {
  layers: CanvasLayers | null
  canvasSize?: { width: number; height: number }
  initialConfig?: Partial<GridConfig>
  initialVisible?: boolean
}

interface UseGridReturn {
  isVisible: boolean
  isSnapEnabled: boolean
  config: GridConfig
  gridStats: {
    visible: boolean
    snapEnabled: boolean
    cellSize: number
    majorInterval: number
    totalCells: { x: number; y: number }
    visibleCells: { x: number; y: number }
  }
  toggleGrid: () => boolean
  setGridVisible: (visible: boolean) => void
  setSnapEnabled: (enabled: boolean) => void
  updateConfig: (config: Partial<GridConfig>) => void
  applyPreset: (presetName: string) => void
  snapPoint: (point: { x: number; y: number }) => { x: number; y: number }
  isNearGridIntersection: (point: { x: number; y: number }, tolerance?: number) => boolean
  exportSettings: () => any
  importSettings: (settings: any) => void
}

/**
 * Hook for managing grid system functionality
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
export function useGrid({
  layers,
  canvasSize,
  initialConfig,
  initialVisible = false // Default to inactive (Requirement 10.4)
}: UseGridProps): UseGridReturn {
  const [isVisible, setIsVisible] = useState(initialVisible)
  const [isSnapEnabled, setIsSnapEnabled] = useState(true)
  const [config, setConfig] = useState<GridConfig>(() => {
    return { ...DEFAULT_GRID_CONFIG, ...initialConfig }
  })
  const [gridStats, setGridStats] = useState({
    visible: false,
    snapEnabled: true,
    cellSize: 20,
    majorInterval: 5,
    totalCells: { x: 0, y: 0 },
    visibleCells: { x: 0, y: 0 }
  })

  const gridServiceRef = useRef<GridService | null>(null)
  const rendererRef = useRef<GridRenderer | null>(null)
  const prevCanvasSizeRef = useRef<{ width: number; height: number } | null>(null)

  // Initialize grid service
  useEffect(() => {
    gridServiceRef.current = new GridService(config)
    gridServiceRef.current.setVisibility(initialVisible)
    gridServiceRef.current.setSnapEnabled(isSnapEnabled)

    // Set up event listeners
    const handleVisibilityChange = (data: { visible: boolean }) => {
      console.log('🔍 Grid visibility changed:', data.visible)
      setIsVisible(data.visible)
      // Removed updateGridStats() to prevent infinite loop
    }

    const handleConfigChange = (data: { newConfig: GridConfig }) => {
      console.log('🔍 Grid config changed:', data.newConfig)
      setConfig(data.newConfig)
      // Removed updateGridStats() to prevent infinite loop
    }

    const handleSnapChange = (data: { enabled: boolean }) => {
      console.log('🔍 Grid snap changed:', data.enabled)
      setIsSnapEnabled(data.enabled)
      // Removed updateGridStats() to prevent infinite loop
    }

    gridServiceRef.current.addEventListener('visibility-changed', handleVisibilityChange)
    gridServiceRef.current.addEventListener('config-changed', handleConfigChange)
    gridServiceRef.current.addEventListener('snap-changed', handleSnapChange)

    return () => {
      if (gridServiceRef.current) {
        gridServiceRef.current.removeEventListener('visibility-changed', handleVisibilityChange)
        gridServiceRef.current.removeEventListener('config-changed', handleConfigChange)
        gridServiceRef.current.removeEventListener('snap-changed', handleSnapChange)
        gridServiceRef.current.destroy()
        gridServiceRef.current = null
      }
    }
  }, []) // Only run once on mount

  // Initialize renderer when layers are available
  useEffect(() => {
    if (layers?.grid && !rendererRef.current) {
      rendererRef.current = new GridRenderer(layers.grid, config)
      
      if (gridServiceRef.current) {
        gridServiceRef.current.setRenderer(rendererRef.current)
      }

      // Removed updateGridStats() to prevent infinite loop
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy()
        rendererRef.current = null
      }
    }
  }, [layers, config])

  // Update canvas size when it changes
  useEffect(() => {
    console.log('🔍 useGrid useEffect triggered', {
      canvasSize,
      hasGridService: !!gridServiceRef.current,
      timestamp: Date.now()
    })
    
    if (canvasSize && gridServiceRef.current) {
      // Only update if the canvas size actually changed
      const prevSize = prevCanvasSizeRef.current
      const hasChanged = !prevSize || 
        prevSize.width !== canvasSize.width || 
        prevSize.height !== canvasSize.height
      
      if (hasChanged) {
        console.log('🔍 Canvas size changed, updating grid service', {
          from: prevSize,
          to: canvasSize
        })
        gridServiceRef.current.setCanvasSize(canvasSize.width, canvasSize.height)
        prevCanvasSizeRef.current = { width: canvasSize.width, height: canvasSize.height }
      } else {
        console.log('🔍 Canvas size unchanged, skipping update')
      }
    }
  }, [canvasSize?.width, canvasSize?.height]) // Use individual properties instead of the object

  // Update grid stats
  const updateGridStats = useCallback(() => {
    console.log('🔍 updateGridStats called', {
      hasGridService: !!gridServiceRef.current,
      timestamp: Date.now()
    })
    
    if (gridServiceRef.current) {
      const stats = gridServiceRef.current.getGridStats()
      setGridStats(stats)
    }
  }, [])

  // Toggle grid visibility
  const toggleGrid = useCallback((): boolean => {
    if (gridServiceRef.current) {
      const newVisibility = gridServiceRef.current.toggleVisibility()
      return newVisibility
    }
    return false
  }, [])

  // Set grid visibility
  const setGridVisible = useCallback((visible: boolean) => {
    if (gridServiceRef.current) {
      gridServiceRef.current.setVisibility(visible)
    }
  }, [])

  // Set snap enabled
  const setSnapEnabledCallback = useCallback((enabled: boolean) => {
    if (gridServiceRef.current) {
      gridServiceRef.current.setSnapEnabled(enabled)
    }
  }, [])

  // Update grid configuration
  const updateConfig = useCallback((newConfig: Partial<GridConfig>) => {
    if (gridServiceRef.current) {
      gridServiceRef.current.updateConfig(newConfig)
    }
  }, [])

  // Apply preset configuration
  const applyPreset = useCallback((presetName: string) => {
    if (gridServiceRef.current) {
      gridServiceRef.current.applyPreset(presetName)
    }
  }, [])

  // Snap point to grid
  const snapPoint = useCallback((point: { x: number; y: number }): { x: number; y: number } => {
    if (gridServiceRef.current) {
      return gridServiceRef.current.snapPoint(point)
    }
    return point
  }, [])

  // Check if point is near grid intersection
  const isNearGridIntersection = useCallback((
    point: { x: number; y: number }, 
    tolerance: number = 5
  ): boolean => {
    if (gridServiceRef.current) {
      return gridServiceRef.current.isNearGridIntersection(point, tolerance)
    }
    return false
  }, [])

  // Export grid settings
  const exportSettings = useCallback(() => {
    if (gridServiceRef.current) {
      return gridServiceRef.current.exportSettings()
    }
    return null
  }, [])

  // Import grid settings
  const importSettings = useCallback((settings: any) => {
    if (gridServiceRef.current && settings) {
      gridServiceRef.current.importSettings(settings)
    }
  }, [])

  // Update viewport for zoom/pan changes
  const updateViewport = useCallback((viewport: { 
    scale: number
    translateX: number
    translateY: number
  }) => {
    if (gridServiceRef.current) {
      gridServiceRef.current.updateViewport(viewport)
    }
  }, [])

  return {
    isVisible,
    isSnapEnabled,
    config,
    gridStats,
    toggleGrid,
    setGridVisible,
    setSnapEnabled: setSnapEnabledCallback,
    updateConfig,
    applyPreset,
    snapPoint,
    isNearGridIntersection,
    exportSettings,
    importSettings,
    // Internal method for canvas integration
    updateViewport: updateViewport as any
  }
}