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
import * as martinez from 'martinez-polygon-clipping'

interface DrawingCanvasProps {
  className?: string
  activeWallType: WallTypeString | null
  activeTool: Tool
  gridVisible?: boolean
  wallsVisible?: boolean
  wallLayerVisibility?: { layout: boolean; zone: boolean; area: boolean }
  wallLayerDebug?: {
    layout: { guides: boolean; shell: boolean }
    zone: { guides: boolean; shell: boolean }
    area: { guides: boolean; shell: boolean }
  }
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
  wallLayerVisibility = { layout: true, zone: true, area: true },
  wallLayerDebug = { layout: { guides: false, shell: false }, zone: { guides: false, shell: false }, area: { guides: false, shell: false } },
  proximityMergingEnabled = true,
  proximityThreshold = 120,
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
  const debugOverlayRef = useRef<PIXI.Container | null>(null)
  const [debugOverlayTick, setDebugOverlayTick] = useState(0)
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
      // Update debug overlays
      setDebugOverlayTick(t => t + 1)
    },
    onWallDeleted: (wallIds) => {
      clearSelection()
      onWallDeleted?.(wallIds)
      // Refresh proximity merges after wall deletion
      refreshProximityMerges()
      // Update debug overlays
      setDebugOverlayTick(t => t + 1)
    },
    onStatusMessage
  })

  // Proximity merging hook
  const {
    activeMerges,
    mergeStats,
    refreshMerges: refreshProximityMerges,
    setEnabled: setProximityEnabled,
    setProximityThreshold
  } = useProximityMerging({
    model: modelRef.current,
    layers,
    enabled: proximityMergingEnabled,
    proximityThreshold,
    checkInterval: 200 // Check every 200ms
  })

  // Listen for tolerance config updates from the ProximityMergingPanel advanced UI
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      try {
        const { updateToleranceConfig } = require('@/lib/ToleranceConfig')
        updateToleranceConfig(e.detail || {})
      } catch {}
    }
    window.addEventListener('tolerance-config-request-update', handler as any)
    return () => window.removeEventListener('tolerance-config-request-update', handler as any)
  }, [])

  // Keep canvas state in sync with panel controls
  useEffect(() => {
    const onEnabled = (e: CustomEvent) => {
      try {
        console.log('⚙️ Proximity enabled changed:', e.detail)
        setProximityEnabled(e.detail === true)
        refreshProximityMerges()
        onStatusMessage?.('Proximity merging ' + (e.detail ? 'enabled' : 'disabled'))
      } catch {}
    }
    const onThreshold = (e: CustomEvent) => {
      try {
        console.log('⚙️ Proximity threshold changed:', e.detail)
        setProximityThreshold(e.detail)
        refreshProximityMerges()
        onStatusMessage?.('Proximity threshold: ' + e.detail + 'px')
      } catch {}
    }
    const onRefresh = () => { console.log('🔄 Proximity refresh requested'); refreshProximityMerges(); onStatusMessage?.('Proximity merges refreshed') }
    window.addEventListener('proximity-enabled-changed', onEnabled as any)
    window.addEventListener('proximity-threshold-changed', onThreshold as any)
    window.addEventListener('proximity-refresh', onRefresh)
    return () => {
      window.removeEventListener('proximity-enabled-changed', onEnabled as any)
      window.removeEventListener('proximity-threshold-changed', onThreshold as any)
      window.removeEventListener('proximity-refresh', onRefresh)
    }
  }, [refreshProximityMerges, setProximityEnabled, setProximityThreshold, onStatusMessage])

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

      // Create a dedicated container for debug overlays so we don't clear the entire UI layer
      try {
        // Ensure UI container can sort its children by zIndex so overlays can appear on top
        canvasLayers.ui.sortableChildren = true
        const overlay = new PIXI.Container()
        overlay.zIndex = 1000
        ;(overlay as any).eventMode = 'none'
        canvasLayers.ui.addChild(overlay)
        debugOverlayRef.current = overlay
      } catch (e) {
        console.warn('Failed to create debug overlay container', e)
      }
      
      onStatusMessage?.('Canvas ready for drawing')
    } catch (error) {
      console.error('Failed to initialize canvas:', error)
      handleRenderingError(error as Error, { context: 'canvas-initialization' })
      onStatusMessage?.('Failed to initialize canvas')
    }
  }, [onStatusMessage, handleRenderingError])

  // Helper: render or remove walls based on layer visibility
  const syncWallVisibility = useCallback(() => {
    if (!wallRendererRef.current || !layers) return
    const nodes = new Map()
    modelRef.current.getAllNodes().forEach(node => nodes.set(node.id, node))
    modelRef.current.getAllWalls().forEach(wall => {
      const typeVisible = wallsVisible && (wallLayerVisibility as any)[wall.type] !== false
      const existingSegments = wall.segmentIds
        .map(id => modelRef.current.getSegment(id))
        .filter(Boolean) as any[]
      if (typeVisible) {
        wallRendererRef.current!.renderWall(wall, existingSegments, nodes, layers.wall)
      } else {
        wallRendererRef.current!.removeWallGraphics(wall.id, layers.wall)
      }
    })
  }, [layers, wallsVisible, wallLayerVisibility])

  // React to parent or per-type visibility changes
  useEffect(() => {
    syncWallVisibility()
  }, [syncWallVisibility])

  // Debug overlays: guides and shell outlines per layer type
  const renderDebugOverlays = useCallback(() => {
    const overlay = debugOverlayRef.current
    if (!overlay) return
    // Clear previous overlays only from our overlay container
    overlay.removeChildren()

    const types: Array<'layout' | 'zone' | 'area'> = ['layout', 'zone', 'area']
    const guidesColor = 0x2aa9ff
    const nodeFill = 0x1773b0
    const shellColor = 0xff8800
    const vertexFill = 0xff8800

    // Match wall line widths used by renderer for visual parity
    const WALL_LINE_WIDTH: Record<'layout' | 'zone' | 'area', number> = {
      layout: 2.5,
      zone: 2.0,
      area: 1.5
    }

    const nodesMap = new Map<string, any>()
    modelRef.current.getAllNodes().forEach(n => nodesMap.set(n.id, n))

    for (const t of types) {
      const typeVisible = wallsVisible && (wallLayerVisibility as any)[t] !== false
      if (!typeVisible) continue

      // Guides: draw segment cores and nodes for this type
      if ((wallLayerDebug as any)[t]?.guides) {
        const g = new PIXI.Graphics()
        const guideWidth = (WALL_LINE_WIDTH as any)[t] * 2 // twice as thick as wall line
        // Make nodes twice as big as current (previously 15x base width)
        const nodeRadius = Math.max((WALL_LINE_WIDTH as any)[t] * 20, 24)
        g.setStrokeStyle({ width: guideWidth, color: guidesColor, alpha: 0.8 })
        const seenNode = new Set<string>()
        modelRef.current.getAllWalls().forEach(wall => {
          if (wall.type !== t || !wall.visible) return
          wall.segmentIds.forEach(segId => {
            const seg = modelRef.current.getSegment(segId)
            if (!seg) return
            const a = nodesMap.get(seg.startNodeId)
            const b = nodesMap.get(seg.endNodeId)
            if (!a || !b) return
            g.moveTo(a.x, a.y).lineTo(b.x, b.y)
            seenNode.add(a.id)
            seenNode.add(b.id)
          })
        })
        g.stroke()
        // Draw nodes as small circles
        g.setFillStyle({ color: nodeFill, alpha: 0.9 })
        seenNode.forEach(id => {
          const n = nodesMap.get(id)
          if (n) g.circle(n.x, n.y, nodeRadius)
        })
        g.fill()
        overlay.addChild(g)
      }

      // Shell Outline: draw union shell as outline only, with vertex dots; do not fill polygon area
      if ((wallLayerDebug as any)[t]?.shell) {
        const outline = new PIXI.Graphics()
        // Make shell outline 3x thicker for stronger visibility
        outline.setStrokeStyle({ width: 6, color: shellColor, alpha: 0.95 })
        outline.zIndex = 2000
        const vertices = new PIXI.Graphics()
        vertices.setFillStyle({ color: vertexFill, alpha: 0.9 })
        vertices.zIndex = 2001
        modelRef.current.getAllWalls().forEach(wall => {
          if (wall.type !== t || !wall.visible) return
          const half = wall.thickness / 2
          const rings: number[][][] = []
          // Segment quads
          wall.segmentIds.forEach(segId => {
            const seg = modelRef.current.getSegment(segId)
            if (!seg) return
            const a = nodesMap.get(seg.startNodeId)
            const b = nodesMap.get(seg.endNodeId)
            if (!a || !b) return
            const vx = b.x - a.x
            const vy = b.y - a.y
            const len = Math.hypot(vx, vy) || 1
            const nx = -vy / len
            const ny = vx / len
            const p1 = [a.x + nx * half, a.y + ny * half]
            const p2 = [b.x + nx * half, b.y + ny * half]
            const p3 = [b.x - nx * half, b.y - ny * half]
            const p4 = [a.x - nx * half, a.y - ny * half]
            rings.push([p1, p2, p3, p4, p1])
          })
          // Node wedge joins to bridge at corners and avoid wrong vertices using miter intersection
          const idToSeg = new Map(wall.segmentIds.map(id => {
            const s = modelRef.current.getSegment(id)
            return [id, s]
          }))
          const nodeToDirs = new Map<string, Array<{ nx: number; ny: number }>>()
          wall.segmentIds.forEach(id => {
            const seg = idToSeg.get(id)
            if (!seg) return
            const a = nodesMap.get(seg.startNodeId)
            const b = nodesMap.get(seg.endNodeId)
            if (!a || !b) return
            const vx = b.x - a.x
            const vy = b.y - a.y
            const len = Math.hypot(vx, vy) || 1
            const nx = -vy / len
            const ny = vx / len
            if (!nodeToDirs.has(a.id)) nodeToDirs.set(a.id, [])
            if (!nodeToDirs.has(b.id)) nodeToDirs.set(b.id, [])
            nodeToDirs.get(a.id)!.push({ nx, ny })
            nodeToDirs.get(b.id)!.push({ nx, ny })
          })
          nodeToDirs.forEach((dirs, nodeId) => {
            const n = nodesMap.get(nodeId)
            if (!n || dirs.length < 2) return
            const order = dirs.map((d, i) => ({ ang: Math.atan2(d.ny, d.nx), i })).sort((a, b) => a.ang - b.ang).map(o => o.i)
            const sorted = order.map(i => dirs[i])
            const intersect = (ax: number, ay: number, ux: number, uy: number, bx: number, by: number, vx: number, vy: number): [number, number] | null => {
              const det = ux * (-vy) - uy * (-vx)
              if (Math.abs(det) < 1e-6) return null
              const dx = bx - ax
              const dy = by - ay
              const t = (dx * (-vy) - dy * (-vx)) / det
              return [ax + t * ux, ay + t * uy]
            }
            for (let i = 0; i < sorted.length; i++) {
              const d1 = sorted[i]
              const d2 = sorted[(i + 1) % sorted.length]
              const t1x = -d1.ny, t1y = d1.nx
              const t2x = -d2.ny, t2y = d2.nx
              const p1x = n.x + d1.nx * half
              const p1y = n.y + d1.ny * half
              const p2x = n.x + d2.nx * half
              const p2y = n.y + d2.ny * half
              const m = intersect(p1x, p1y, t1x, t1y, p2x, p2y, t2x, t2y)
              if (m) {
                rings.push([[p1x, p1y], m, [p2x, p2y], [p1x, p1y]])
              } else {
                rings.push([[p1x, p1y], [p2x, p2y], [n.x + (d1.nx + d2.nx) * half * 0.5, n.y + (d1.ny + d2.ny) * half * 0.5], [p1x, p1y]])
              }
            }
          })
          if (rings.length === 0) return
          let unionResult: any = null
          for (const r of rings) {
            const poly = [r]
            unionResult = unionResult ? martinez.union(unionResult, poly) : poly
          }
          if (!unionResult) return
          const isMulti = Array.isArray(unionResult[0][0][0])
          const multipoly: number[][][][] = isMulti ? unionResult : [unionResult]
          multipoly.forEach(polygon => {
            polygon.forEach(ring => {
              const [x0, y0] = ring[0]
              outline.moveTo(x0, y0)
              for (let i = 1; i < ring.length; i++) {
                const [x, y] = ring[i]
                outline.lineTo(x, y)
              }
              outline.closePath()
              // Draw vertices as separate filled circles (5x bigger than before)
              ring.forEach(([vx, vy]) => {
                vertices.circle(vx, vy, 12)
              })
            })
          })
        })
        outline.stroke()
        vertices.fill()
        overlay.addChild(outline)
        overlay.addChild(vertices)
      }
    }
  }, [layers, wallsVisible, wallLayerVisibility, wallLayerDebug, debugOverlayTick])

  useEffect(() => {
    renderDebugOverlays()
  }, [renderDebugOverlays])

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
          // Update debug overlays
          setDebugOverlayTick(t => t + 1)
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