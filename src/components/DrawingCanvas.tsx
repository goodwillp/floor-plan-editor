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
  activeWallType: WallTypeString | null
  activeTool: Tool
  gridVisible?: boolean
  wallsVisible?: boolean
  proximityMergingEnabled?: boolean
  proximityThreshold?: number
  onMouseMove?: (coordinates: { x: number; y: number }) => void
  onWallCreated?: (wallId: string) => void
  onWallSelected?: (wallIds: string[], wallProperties: any[]) => void
  onWallDeleted?: (wallIds: string[]) => void
  // onGridToggle is not used here
  // onGridToggle?: () => void
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
  wallsVisible = true,
  proximityMergingEnabled = false,
  proximityThreshold = 15,
  onMouseMove,
  onWallCreated,
  onWallSelected,
  onWallDeleted,
  // onGridToggle,
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
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | undefined>(undefined)

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
    activeWallType: activeWallType ?? 'layout',
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
    // toggleGrid is unused; grid controlled by parent prop
    setGridVisible,
    snapPoint
  } = useGrid({
    layers,
    canvasSize: canvasSize,
    initialVisible: gridVisible
  })

  // Sync grid visibility when prop changes
  useEffect(() => {
    console.log('🔍 Grid visibility prop changed:', { gridVisible, gridIsVisible })
    
    // Only update if there's a mismatch
    if (gridVisible !== gridIsVisible && setGridVisible) {
      console.log('🔍 Setting grid visibility to:', gridVisible)
      setGridVisible(gridVisible)
    }
  }, [gridVisible, gridIsVisible, setGridVisible])

  // Reference image hook
  const referenceImage = useReferenceImage({
    layers
  })

  // Sync walls layer visibility
  useEffect(() => {
    if (layers?.wall) {
      layers.wall.visible = !!wallsVisible
    }
  }, [layers, wallsVisible])

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
        onReferenceImageUpdate?.({ 
          hasImage: referenceImage.hasImage, 
          isLocked, 
          isVisible: referenceImage.isVisible 
        })
        return isLocked
      }
      return true
    },
    toggleReferenceImageVisibility: () => {
      if (referenceImage.toggleVisibility) {
        const isVisible = referenceImage.toggleVisibility()
        onReferenceImageUpdate?.({ 
          hasImage: referenceImage.hasImage, 
          isLocked: referenceImage.isLocked, 
          isVisible 
        })
        return isVisible
      }
      return true
    }
  }), [referenceImage, onReferenceImageUpdate])

  // Update parent component when reference image state changes
  useEffect(() => {
    if (onReferenceImageUpdate) {
      onReferenceImageUpdate({
        hasImage: referenceImage.hasImage,
        isLocked: referenceImage.isLocked,
        isVisible: referenceImage.isVisible
      })
    }
  }, [referenceImage.hasImage, referenceImage.isLocked, referenceImage.isVisible, onReferenceImageUpdate])

  // Handle global mouse up for reference image
  const handleGlobalMouseUp = useCallback(() => {
    if (referenceImage.hasImage && !referenceImage.isLocked) {
      const handled = referenceImage.handleMouseUp()
      if (handled) {
        onStatusMessage?.('Reference image drag ended')
      }
    }
  }, [referenceImage, onStatusMessage])

  // Add global mouse up listener for reference image dragging
  useEffect(() => {
    const handleMouseUp = () => {
      handleGlobalMouseUp()
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleGlobalMouseUp])

  // Initialize wall renderer when canvas is ready
  const handleCanvasReady = useCallback((canvasLayers: CanvasLayers, pixiApp: PIXI.Application, viewportAPI: CanvasViewportAPI) => {
    try {
      setLayers(canvasLayers)
      setApp(pixiApp)
      
      // Store viewport API reference
      viewportAPIRef.current = viewportAPI
      
      // Set actual canvas size from the canvas element
      const canvas = pixiApp.canvas as HTMLCanvasElement
      const actualWidth = canvas.clientWidth || canvas.width || 800
      const actualHeight = canvas.clientHeight || canvas.height || 600
      
      console.log('🔍 Canvas ready - setting canvas size:', {
        actualWidth,
        actualHeight,
        pixiAppScreen: { width: pixiApp.screen.width, height: pixiApp.screen.height },
        canvasElement: { width: canvas.width, height: canvas.height },
        canvasClient: { width: canvas.clientWidth, height: canvas.clientHeight }
      })
      
      // Debug: Check if PixiJS app is running
      console.log('🔍 PixiJS App Status:', {
        stage: !!pixiApp.stage,
        stageChildren: pixiApp.stage?.children?.length || 0,
        renderer: !!pixiApp.renderer,
        canvas: !!pixiApp.canvas
      })
      
      // Debug: Check stage hierarchy
      if (pixiApp.stage) {
        console.log('🔍 Stage Hierarchy:', {
          stageChildren: pixiApp.stage.children.length,
          stageVisible: pixiApp.stage.visible,
          stageAlpha: pixiApp.stage.alpha,
          stageScale: { x: pixiApp.stage.scale.x, y: pixiApp.stage.scale.y },
          stagePosition: { x: pixiApp.stage.position.x, y: pixiApp.stage.position.y }
        })
        
        // Log each child
        pixiApp.stage.children.forEach((child, index) => {
          console.log(`🔍 Stage Child ${index}:`, {
            type: child.constructor.name,
            visible: child.visible,
            alpha: child.alpha,
            zIndex: child.zIndex,
            children: child.children?.length || 0
          })
        })
        
        // DEBUG: Check if viewport is affecting visibility
        console.log('🔍 Viewport Debug:', {
          stageScale: { x: pixiApp.stage.scale.x, y: pixiApp.stage.scale.y },
          stagePosition: { x: pixiApp.stage.position.x, y: pixiApp.stage.position.y },
          canvasWidth: actualWidth,
          canvasHeight: actualHeight,
          // Check if stage is positioned outside visible area
          stageInView: {
            scaleVisible: pixiApp.stage.scale.x > 0.01 && pixiApp.stage.scale.y > 0.01,
            positionInBounds: pixiApp.stage.position.x < actualWidth && pixiApp.stage.position.y < actualHeight
          }
        })
        
        // DEBUG: Show actual values
        console.log('🔍 Stage Scale:', pixiApp.stage.scale.x, pixiApp.stage.scale.y)
        console.log('🔍 Stage Position:', pixiApp.stage.position.x, pixiApp.stage.position.y)
        console.log('🔍 Canvas Size:', actualWidth, actualHeight)
        console.log('🔍 Scale Visible:', pixiApp.stage.scale.x > 0.01 && pixiApp.stage.scale.y > 0.01)
        console.log('🔍 Position In Bounds:', pixiApp.stage.position.x < actualWidth && pixiApp.stage.position.y < actualHeight)
        
        // DEBUG: Check PixiJS renderer state
        console.log('🔍 PixiJS Renderer Debug:', {
          renderer: !!pixiApp.renderer,
          rendererType: pixiApp.renderer?.constructor.name,
          canvas: !!pixiApp.canvas,
          canvasWidth: pixiApp.canvas?.width,
          canvasHeight: pixiApp.canvas?.height,
          screenWidth: pixiApp.screen?.width,
          screenHeight: pixiApp.screen?.height
        })
      }
      
      setCanvasSize({
        width: actualWidth,
        height: actualHeight
      })
      
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
      // Coordinates from CanvasContainer are world space
      const worldPoint = point
      console.log('🎯 handleCanvasClick', { activeTool, isDrawing, worldPoint })
      if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
        console.log('🎯 Canvas click', { worldPoint, hasImage: referenceImage.hasImage, isLocked: referenceImage.isLocked })
      }
      // First, try to handle reference image interaction
      if (referenceImage.hasImage && !referenceImage.isLocked) {
        const handled = referenceImage.handleMouseDown({ 
          x: worldPoint.x, 
          y: worldPoint.y, 
          button: 0 
        })
        if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
          console.log('🖼️ referenceImage.handleMouseDown result:', handled)
        }
        if (handled) {
          onStatusMessage?.('Reference image interaction started')
          return
        }
      }

      if (activeTool === 'draw') {
        // Apply grid snapping if grid is visible
        const snappedPoint = gridIsVisible ? snapPoint(worldPoint) : worldPoint
        
        if (!isDrawing) {
          // Start new drawing
          startDrawing(snappedPoint)
          console.log('🧱 startDrawing', { snappedPoint, activeWallType })
          onStatusMessage?.(`Started drawing ${activeWallType} wall${gridIsVisible ? ' (grid snap)' : ''}`)
        } else {
          // Add point to current drawing
          addPoint(snappedPoint)
          console.log('➕ addPoint', { snappedPoint })
          const length = getCurrentDrawingLength()
          onStatusMessage?.(`Drawing length: ${Math.round(length)}px${gridIsVisible ? ' (grid snap)' : ''}`)
        }
      } else if (activeTool === 'select') {
        const selectedWallId = handleSelectionClick(worldPoint)
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
        const selectedWallId = handleSelectionClick(worldPoint)
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
    gridIsVisible, snapPoint, handleUIError, referenceImage
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
                    // Re-render ALL walls to reflect intersection-driven subdivisions
          // and ensure seamless outer shells are updated everywhere.
          if (wallRendererRef.current && layers) {
            const nodes = new Map()
            modelRef.current.getAllNodes().forEach(node => nodes.set(node.id, node))
            modelRef.current.getAllWalls().forEach(wall => {
              const segments = wall.segmentIds
                .map(id => modelRef.current.getSegment(id))
                .filter(Boolean) as any[]
              wallRendererRef.current!.renderWall(wall, segments, nodes, layers.wall)
            })
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
    const world = coordinates
    if ((globalThis as any).DEBUG_REFERENCE_IMAGE && referenceImage.hasImage) {
      console.log('🖱️ Canvas move', { world, isLocked: referenceImage.isLocked })
    }
    
    // Handle reference image dragging
    if (referenceImage.hasImage && !referenceImage.isLocked) {
      const handled = referenceImage.handleMouseMove({ x: world.x, y: world.y })
      if (handled) {
        onStatusMessage?.('Dragging reference image')
        return
      }
    }
    
    if (activeTool === 'draw') {
      // Always update to show snap guides even when not actively drawing
      updatePreview({ x: world.x, y: world.y })
    } else if (activeTool === 'select' || activeTool === 'delete') {
      handleSelectionHover({ x: world.x, y: world.y })
      // Hover feedback is handled by the selection renderer
    }
  }, [activeTool, isDrawing, updatePreview, handleSelectionHover, onMouseMove, referenceImage, onStatusMessage])

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

  // Removed the problematic useEffect that was causing infinite loop
  // Grid visibility should be managed by the parent component only

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