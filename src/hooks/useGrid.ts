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

  // Initialize grid service
  useEffect(() => {
    gridServiceRef.current = new GridService(config)
    gridServiceRef.current.setVisibility(initialVisible)
    gridServiceRef.current.setSnapEnabled(isSnapEnabled)

    // Set up event listeners
    const handleVisibilityChange = (data: { visible: boolean }) => {
      setIsVisible(data.visible)
      updateGridStats()
    }

    const handleConfigChange = (data: { newConfig: GridConfig }) => {
      setConfig(data.newConfig)
      updateGridStats()
    }

    const handleSnapChange = (data: { enabled: boolean }) => {
      setIsSnapEnabled(data.enabled)
      updateGridStats()
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

      updateGridStats()
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
    if (canvasSize && gridServiceRef.current) {
      gridServiceRef.current.setCanvasSize(canvasSize.width, canvasSize.height)
      updateGridStats()
    }
  }, [canvasSize])

  // Update grid stats
  const updateGridStats = useCallback(() => {
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