import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { CanvasContainer, type CanvasLayers, type CanvasViewportAPI } from './CanvasContainer'
import { useDrawing } from '@/hooks/useDrawing'
import { useWallSelection } from '@/hooks/useWallSelection'
import { useWallEditing } from '@/hooks/useWallEditing'
import { useProximityMerging } from '@/hooks/useProximityMerging'
import { useGrid } from '@/hooks/useGrid'
import { useReferenceImage } from '@/hooks/useReferenceImage'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import { WallRenderer } from '@/lib/WallRenderer'
import type { Point, WallTypeString } from '@/lib/types'
import type { Tool } from './ToolPalette'
import * as PIXI from 'pixi.js'

interface DrawingCanvasProps {
  className?: string
  activeWallType: WallTypeString
  activeTool: Tool
  gridVisible?: boolean
  proximityMergingEnabled?: boolean
  proximityThreshold?: number
  onMouseMove?: (coordinates: { x: number; y: number }) => void
  onWallCreated?: (wallId: string) => void
  onWallSelected?: (wallIds: string[], wallProperties: any[]) => void
  onWallDeleted?: (wallIds: string[]) => void
  onGridToggle?: () => void
  onProximityMergingUpdate?: (merges: any[], stats: any) => void
  onStatusMessage?: (message: string) => void
  onViewportChange?: (viewport: { zoom: number; panX: number; panY: number }) => void
  onReferenceImageUpdate?: (state: { hasImage: boolean; isLocked: boolean; isVisible: boolean }) => void
}

/**
 * DrawingCanvas integrates wall drawing functionality with the PixiJS canvas
 * Requirements: 2.1, 6.4, 11.4, 14.1
 */
export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({
  className,
  activeWallType,
  activeTool,
  gridVisible = false,
  proximityMergingEnabled = false,
  proximityThreshold = 15,
  onMouseMove,
  onWallCreated,
  onWallSelected,
  onWallDeleted,
  onGridToggle,
  onProximityMergingUpdate,
  onStatusMessage,
  onViewportChange,
  onReferenceImageUpdate
}, ref) => {
  const modelRef = useRef(new FloorPlanModel())
  const wallRendererRef = useRef<WallRenderer | null>(null)
  const viewportAPIRef = useRef<CanvasViewportAPI | null>(null)
  const [layers, setLayers] = useState<CanvasLayers | null>(null)
  const [, setApp] = useState<PIXI.Application | null>(null)

  // Drawing hook
  const {
    isDrawing,
    startDrawing,
    addPoint,
    completeDrawing,
    cancelDrawing,
    updatePreview,
    getCurrentDrawingLength
  } = useDrawing({
    model: modelRef.current,
    layers,
    activeWallType,
    isDrawingMode: activeTool === 'draw'
  })

  // Wall selection hook
  const {
    selectedWallIds,
    clearSelection,
    handleCanvasClick: handleSelectionClick,
    handleCanvasHover: handleSelectionHover,
    getWallProperties
  } = useWallSelection({
    model: modelRef.current,
    layers,
    isSelectionMode: activeTool === 'select'
  })

  // Wall editing hook
  const {
    deleteWalls
  } = useWallEditing({
    model: modelRef.current,
    onWallUpdated: (wallId) => {
      // Re-render the updated wall
      if (wallRendererRef.current && layers) {
        const wall = modelRef.current.getWall(wallId)
        if (wall) {
          const segments = wall.segmentIds.map(id => modelRef.current.getSegment(id)).filter(Boolean) as any[]
          const nodes = new Map()
          modelRef.current.getAllNodes().forEach(node => nodes.set(node.id, node))
          wallRendererRef.current.renderWall(wall, segments, nodes, layers.wall)
        }
      }
      // Refresh proximity merges after wall update
      refreshProximityMerges()
    },
    onWallDeleted: (wallIds) => {
      clearSelection()
      onWallDeleted?.(wallIds)
      // Refresh proximity merges after wall deletion
      refreshProximityMerges()
    },
    onStatusMessage
  })

  // Proximity merging hook
  const {
    activeMerges,
    mergeStats,
    refreshMerges: refreshProximityMerges
  } = useProximityMerging({
    model: modelRef.current,
    layers,
    enabled: proximityMergingEnabled,
    proximityThreshold,
    checkInterval: 200 // Check every 200ms
  })

  // Grid system hook
  const {
    isVisible: gridIsVisible,
    toggleGrid,
    snapPoint
  } = useGrid({
    layers,
    canvasSize: layers ? { width: 800, height: 600 } : undefined, // TODO: Get actual canvas size
    initialVisible: gridVisible
  })

  // Reference image hook
  const referenceImage = useReferenceImage({
    layers
  })

  // Error handling hook
  const {
    handleGeometricError,
    handleRenderingError,
    handleUIError,
  } = useErrorHandler({
    onError: (errorInfo) => {
      onStatusMessage?.(`Error: ${errorInfo.userMessage || errorInfo.message}`)
    },
    onRecoveryAttempt: (errorInfo) => {
      onStatusMessage?.(`Recovering from ${errorInfo.type} error...`)
    }
  })

  // Expose ref methods for parent components
  useImperativeHandle(ref, () => ({
    loadReferenceImage: async (file: File) => {
      if (referenceImage.loadImage) {
        await referenceImage.loadImage(file)
        onReferenceImageUpdate?.({ hasImage: true, isLocked: true, isVisible: true })
      }
    },
    removeReferenceImage: () => {
      if (referenceImage.removeImage) {
        referenceImage.removeImage()
        onReferenceImageUpdate?.({ hasImage: false, isLocked: true, isVisible: true })
      }
    },
    toggleReferenceImageLock: () => {
      if (referenceImage.toggleLock) {
        const isLocked = referenceImage.toggleLock()
        onReferenceImageUpdate?.({ hasImage: true, isLocked, isVisible: true })
        return isLocked
      }
      return true
    },
    toggleReferenceImageVisibility: () => {
      if (referenceImage.toggleVisibility) {
        const isVisible = referenceImage.toggleVisibility()
        onReferenceImageUpdate?.({ hasImage: true, isLocked: true, isVisible })
        return isVisible
      }
      return true
    }
  }), [referenceImage, onReferenceImageUpdate])

  // Initialize wall renderer when canvas is ready
  const handleCanvasReady = useCallback((canvasLayers: CanvasLayers, pixiApp: PIXI.Application, viewportAPI: CanvasViewportAPI) => {
    try {
      setLayers(canvasLayers)
      setApp(pixiApp)
      
      // Store viewport API reference
      viewportAPIRef.current = viewportAPI
      
      // Initialize wall renderer
      wallRendererRef.current = new WallRenderer()
      
      onStatusMessage?.('Canvas ready for drawing')
    } catch (error) {
      console.error('Failed to initialize canvas:', error)
      handleRenderingError(error as Error, { context: 'canvas-initialization' })
      onStatusMessage?.('Failed to initialize canvas')
    }
  }, [onStatusMessage, handleRenderingError])

  // Handle canvas clicks based on active tool
  const handleCanvasClick = useCallback((point: Point) => {
    try {
      if (activeTool === 'draw') {
        // Apply grid snapping if grid is visible
        const snappedPoint = gridIsVisible ? snapPoint(point) : point
        
        if (!isDrawing) {
          // Start new drawing
          startDrawing(snappedPoint)
          onStatusMessage?.(`Started drawing ${activeWallType} wall${gridIsVisible ? ' (grid snap)' : ''}`)
        } else {
          // Add point to current drawing
          addPoint(snappedPoint)
          const length = getCurrentDrawingLength()
          onStatusMessage?.(`Drawing length: ${Math.round(length)}px${gridIsVisible ? ' (grid snap)' : ''}`)
        }
      } else if (activeTool === 'select') {
        const selectedWallId = handleSelectionClick(point)
        if (selectedWallId) {
          onStatusMessage?.(`Selected wall ${selectedWallId.substring(0, 8)}...`)
          const properties = getWallProperties()
          onWallSelected?.(selectedWallIds, properties)
        } else if (selectedWallIds.length === 0) {
          onStatusMessage?.('No wall found at click location')
        } else {
          onStatusMessage?.('Selection cleared')
          onWallSelected?.([], [])
        }
      } else if (activeTool === 'delete') {
        const selectedWallId = handleSelectionClick(point)
        if (selectedWallId) {
          // Delete the clicked wall immediately
          deleteWalls([selectedWallId])
        } else {
          onStatusMessage?.('No wall found to delete')
        }
      }
    } catch (error) {
      console.error('Canvas click error:', error)
      handleUIError(error as Error, { context: 'canvas-click', point, activeTool })
    }
  }, [
    activeTool, isDrawing, activeWallType, startDrawing, addPoint, getCurrentDrawingLength,
    handleSelectionClick, selectedWallIds, deleteWalls, onStatusMessage, onWallSelected,
    gridIsVisible, snapPoint, handleUIError
  ])

  // Handle double-click to complete drawing
  const handleCanvasDoubleClick = useCallback((point: Point) => {
    try {
      if (activeTool === 'draw' && isDrawing) {
        // Add final point and complete drawing
        addPoint(point)
        const wallId = completeDrawing()
        
        if (wallId) {
          onWallCreated?.(wallId)
          onStatusMessage?.(`Created ${activeWallType} wall`)
          
          // Render the new wall
          if (wallRendererRef.current && layers) {
            const wall = modelRef.current.getWall(wallId)
            if (wall) {
              const segments = wall.segmentIds.map(id => modelRef.current.getSegment(id)).filter(Boolean) as any[]
              const nodes = new Map()
              modelRef.current.getAllNodes().forEach(node => nodes.set(node.id, node))
              wallRendererRef.current.renderWall(wall, segments, nodes, layers.wall)
            }
          }
          // Refresh proximity merges after wall creation
          refreshProximityMerges()
        } else {
          onStatusMessage?.('Failed to create wall')
        }
      }
    } catch (error) {
      console.error('Wall creation error:', error)
      handleGeometricError(error as Error, { context: 'wall-creation', point, activeWallType })
    }
  }, [activeTool, isDrawing, activeWallType, addPoint, completeDrawing, onWallCreated, onStatusMessage, refreshProximityMerges, handleGeometricError])

  // Handle right-click to cancel drawing
  const handleCanvasRightClick = useCallback(() => {
    if (activeTool === 'draw' && isDrawing) {
      cancelDrawing()
      onStatusMessage?.('Drawing cancelled')
    }
  }, [activeTool, isDrawing, cancelDrawing, onStatusMessage])

  // Handle mouse move for preview and hover
  const handleMouseMove = useCallback((coordinates: { x: number; y: number }) => {
    onMouseMove?.(coordinates)
    
    if (activeTool === 'draw' && isDrawing) {
      updatePreview({ x: coordinates.x, y: coordinates.y })
    } else if (activeTool === 'select' || activeTool === 'delete') {
      handleSelectionHover({ x: coordinates.x, y: coordinates.y })
      // Hover feedback is handled by the selection renderer
    }
  }, [activeTool, isDrawing, updatePreview, handleSelectionHover, onMouseMove])

  // Cancel drawing when switching away from draw tool
  useEffect(() => {
    if (activeTool !== 'draw' && isDrawing) {
      cancelDrawing()
      onStatusMessage?.('Drawing cancelled - switched tools')
    }
  }, [activeTool, isDrawing, cancelDrawing, onStatusMessage])

  // Update status when drawing state changes
  useEffect(() => {
    if (activeTool === 'draw') {
      if (isDrawing) {
        onStatusMessage?.(`Drawing ${activeWallType} wall - double-click to finish, right-click to cancel`)
      } else {
        onStatusMessage?.(`Draw tool active - click to start drawing ${activeWallType} wall`)
      }
    }
  }, [activeTool, isDrawing, activeWallType, onStatusMessage])

  // Notify parent about proximity merging updates
  useEffect(() => {
    console.log('🔍 DrawingCanvas useEffect triggered', {
      activeMergesLength: activeMerges.length,
      mergeStats,
      onProximityMergingUpdate: !!onProximityMergingUpdate,
      timestamp: Date.now()
    })
    
    if (onProximityMergingUpdate) {
      onProximityMergingUpdate(activeMerges, mergeStats)
    }
  }, [activeMerges, onProximityMergingUpdate]) // Removed mergeStats to prevent infinite loop

  // Handle grid visibility changes from parent
  useEffect(() => {
    if (gridVisible !== gridIsVisible) {
      toggleGrid()
      onGridToggle?.()
    }
  }, [gridVisible, gridIsVisible, toggleGrid, onGridToggle])

  // Notify parent of reference image updates
  useEffect(() => {
    if (onReferenceImageUpdate) {
      onReferenceImageUpdate({
        hasImage: referenceImage.hasImage,
        isLocked: referenceImage.isLocked,
        isVisible: referenceImage.isVisible
      })
    }
  }, [referenceImage.hasImage, referenceImage.isLocked, referenceImage.isVisible, onReferenceImageUpdate])

  return (
    <CanvasContainer
      className={className}
      onMouseMove={handleMouseMove}
      onCanvasClick={handleCanvasClick}
      onCanvasDoubleClick={handleCanvasDoubleClick}
      onCanvasRightClick={handleCanvasRightClick}
      onCanvasReady={handleCanvasReady}
      onViewportChange={onViewportChange}
    />
  )
})

DrawingCanvas.displayName = 'DrawingCanvas'

export type { DrawingCanvasProps }

// Export reference image functions for parent components
export interface DrawingCanvasRef {
  loadReferenceImage: (file: File) => Promise<void>
  removeReferenceImage: () => void
  toggleReferenceImageLock: () => boolean
  toggleReferenceImageVisibility: () => boolean
}