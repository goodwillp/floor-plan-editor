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
    layout: { guides: boolean; shell: boolean; guidesLabels?: boolean; shellLabels?: boolean }
    zone: { guides: boolean; shell: boolean; guidesLabels?: boolean; shellLabels?: boolean }
    area: { guides: boolean; shell: boolean; guidesLabels?: boolean; shellLabels?: boolean }
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
  wallLayerDebug = { layout: { guides: false, shell: false, guidesLabels: false, shellLabels: false }, zone: { guides: false, shell: false, guidesLabels: false, shellLabels: false }, area: { guides: false, shell: false, guidesLabels: false, shellLabels: false } },
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
    const onApplyGeometric = () => {
      try {
        console.log('🧩 Applying geometric merges from active proximity set')
        const model = modelRef.current
        const nodes = new Map<string, any>()
        model.getAllNodes().forEach(n => nodes.set(n.id, n))
        const segments = new Map<string, any>()
        model.getAllSegments().forEach(s => segments.set(s.id, s))
        const wallsById = new Map<string, any>()
        model.getAllWalls().forEach(w => wallsById.set(w.id, w))
        let edits = 0
        activeMerges.forEach((merge) => {
          merge.segments.forEach(pair => {
            const seg2 = segments.get(pair.seg2Id)
            const s2a = nodes.get(seg2?.startNodeId)
            const s2b = nodes.get(seg2?.endNodeId)
            const seg1 = segments.get(pair.seg1Id)
            const s1a = nodes.get(seg1?.startNodeId)
            const s1b = nodes.get(seg1?.endNodeId)
            if (!seg1 || !seg2 || !s1a || !s1b || !s2a || !s2b) return
            // Project the endpoints of seg1 onto seg2 and subdivide seg2 at the nearest projection of either endpoint
            const project = (p: any, a: any, b: any) => {
              const vx = b.x - a.x, vy = b.y - a.y
              const wx = p.x - a.x, wy = p.y - a.y
              const len2 = vx*vx+vy*vy
              const t = len2>0 ? Math.max(0, Math.min(1, (wx*vx+wy*vy)/len2)) : 0
              return { x: a.x + t*vx, y: a.y + t*vy }
            }
            const pA = project(s1a, s2a, s2b)
            const pB = project(s1b, s2a, s2b)
            const dA = Math.hypot(pA.x - s1a.x, pA.y - s1a.y)
            const dB = Math.hypot(pB.x - s1b.x, pB.y - s1b.y)
            const p = dA < dB ? pA : pB
            const beforeSegCount = model.getAllSegments().length
            const newIds = (model as any).subdivideSegment?.(seg2.id, p)
            const afterSegCount = model.getAllSegments().length
            if (newIds && afterSegCount > beforeSegCount) {
              edits++
              // Normalize topology and unify walls
              ;(model as any).mergeNearbyNodes?.(Math.max(20, 0.5 * (wallsById.get(merge.wall1Id)?.thickness || 100)))
              ;(model as any).unifyWallsByConnectivityOfType?.(wallsById.get(merge.wall1Id)?.type || 'layout')
            }
          })
        })
        refreshProximityMerges()
        console.log('🧩 Geometric apply complete; edits:', edits)
        onStatusMessage?.(`Applied geometric merges: ${edits}`)
        // Force a full wall re-render to reflect any subdivisions
        if (wallRendererRef.current && layers) {
          const nmap = new Map()
          model.getAllNodes().forEach(n => nmap.set(n.id, n))
          model.getAllWalls().forEach(w => {
            const segs = w.segmentIds.map(id => model.getSegment(id)).filter(Boolean) as any[]
            wallRendererRef.current!.renderWall(w, segs, nmap, layers.wall)
          })
        }
      } catch (err) {
        console.error('Geometric merge error:', err)
      }
    }
    window.addEventListener('proximity-enabled-changed', onEnabled as any)
    window.addEventListener('proximity-threshold-changed', onThreshold as any)
    window.addEventListener('proximity-refresh', onRefresh)
    window.addEventListener('proximity-apply-geometric', onApplyGeometric)
    return () => {
      window.removeEventListener('proximity-enabled-changed', onEnabled as any)
      window.removeEventListener('proximity-threshold-changed', onThreshold as any)
      window.removeEventListener('proximity-refresh', onRefresh)
      window.removeEventListener('proximity-apply-geometric', onApplyGeometric)
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
    const guideTextColor = guidesColor
    const shellTextColor = shellColor
    // Readable debug font sizes; combined with inverse scaling to keep them constant on screen
    const GUIDE_SEGMENT_FONT = 22
    const GUIDE_NODE_FONT = 20
    const SHELL_SEGMENT_FONT = 22
    const SHELL_NODE_FONT = 20

    // Match wall line widths used by renderer for visual parity
    const WALL_LINE_WIDTH: Record<'layout' | 'zone' | 'area', number> = {
      layout: 2.5,
      zone: 2.0,
      area: 1.5
    }

    const nodesMap = new Map<string, any>()
    modelRef.current.getAllNodes().forEach(n => nodesMap.set(n.id, n))

    // Global placed rectangles across all debug labels to prevent cross-overlaps
    type Rect = { x: number; y: number; w: number; h: number }
    const placedGlobal: Rect[] = []
    const intersects = (a: Rect, b: Rect) => !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y)
    const makeTryPlace = (sx: number, sy: number, connectors?: PIXI.Graphics) => (textObj: PIXI.Text, bx: number, by: number, primaryOffset?: { x: number; y: number }) => {
      const candidates: Array<{ x: number; y: number }> = []
      if (primaryOffset) candidates.push(primaryOffset)
      const stepsPx = [
        { x: 10, y: 10 }, { x: 12, y: -10 }, { x: -12, y: 12 }, { x: -12, y: -12 },
        { x: 16, y: 0 }, { x: -16, y: 0 }, { x: 0, y: 16 }, { x: 0, y: -16 },
        { x: 22, y: 12 }, { x: -22, y: 12 }, { x: 22, y: -12 }, { x: -22, y: -12 }
      ]
      const steps = stepsPx.map(s => ({ x: s.x / sx, y: s.y / sy }))
      candidates.push(...steps)
      const pad = 2 / Math.max(sx, sy)
      for (const off of candidates) {
        const tx = bx + off.x
        const ty = by + off.y
        textObj.x = tx
        textObj.y = ty
        const rect: Rect = { x: tx - pad, y: ty - pad, w: textObj.width + pad * 2, h: textObj.height + pad * 2 }
        if (!placedGlobal.some(r => intersects(r, rect))) {
          placedGlobal.push(rect)
          const dx = tx - bx
          const dy = ty - by
          if (connectors && Math.hypot(dx * sx, dy * sy) > 22) {
            connectors.moveTo(bx, by).lineTo(tx + textObj.width / 2, ty + textObj.height / 2)
          }
          return
        }
      }
      // Fallback
      textObj.x = bx
      textObj.y = by
      placedGlobal.push({ x: bx, y: by, w: textObj.width, h: textObj.height })
    }

    // Geometry helpers to clean shell rings for clearer topology
    const isClose = (ax: number, ay: number, bx: number, by: number, tol: number) => {
      return Math.hypot(ax - bx, ay - by) <= tol
    }
    const pointLineDistance = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
      const vx = bx - ax, vy = by - ay
      const wx = px - ax, wy = py - ay
      const area2 = Math.abs(vx * wy - vy * wx)
      const len = Math.hypot(vx, vy) || 1
      return area2 / len
    }
    const simplifyRing = (ring: number[][], tol: number): number[][] => {
      if (ring.length <= 4) return ring
      let points = ring.slice(0, ring.length - 1) // exclude closing duplicate
      // Iterate a couple passes to fully collapse chains
      for (let pass = 0; pass < 2; pass++) {
        const out: number[][] = []
        const n = points.length
        for (let i = 0; i < n; i++) {
          const prev = out.length > 0 ? out[out.length - 1] : points[(i - 1 + n) % n]
          const curr = points[i]
          const next = points[(i + 1) % n]
          // Drop near-duplicates
          if (prev && isClose(prev[0], prev[1], curr[0], curr[1], tol * 0.5)) continue
          // Remove vertex if almost on the line between prev and next
          if (prev && next && pointLineDistance(curr[0], curr[1], prev[0], prev[1], next[0], next[1]) <= tol) continue
          // Remove short edges created by numeric noise (prev->curr or curr->next very small)
          const len1 = prev ? Math.hypot(curr[0] - prev[0], curr[1] - prev[1]) : Infinity
          const len2 = next ? Math.hypot(next[0] - curr[0], next[1] - curr[1]) : Infinity
          if (len1 <= tol * 1.2 || len2 <= tol * 1.2) continue
          out.push(curr)
        }
        points = out
        if (points.length <= 3) break
      }
      if (points.length < 3) return ring
      // Close ring
      points.push([points[0][0], points[0][1]])
      return points
    }
    const filterVerticesNearJunctions = (ring: number[][], junctions: Array<{x: number; y: number}>, tol: number): number[][] => {
      if (ring.length <= 4 || junctions.length === 0) return ring
      const pts = ring.slice(0, ring.length - 1)
      const keep: number[][] = []
      for (const p of pts) {
        let near = false
        for (const j of junctions) {
          if (Math.hypot(p[0] - j.x, p[1] - j.y) <= tol) { near = true; break }
        }
        if (!near) keep.push(p)
      }
      if (keep.length < 3) return ring
      keep.push([keep[0][0], keep[0][1]])
      return keep
    }
    const snapVerticesToMiterApex = (
      ring: number[][],
      apexes: Array<{ x: number; y: number }>,
      snapTol: number
    ): number[][] => {
      if (ring.length <= 4 || apexes.length === 0) return ring
      const pts = ring.slice(0, ring.length - 1)
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        for (const a of apexes) {
          if (Math.hypot(p[0] - a.x, p[1] - a.y) <= snapTol) {
            pts[i] = [a.x, a.y]
            break
          }
        }
      }
      // Deduplicate consecutive identical (after snapping)
      const out: number[][] = []
      for (const p of pts) {
        if (out.length === 0) { out.push(p); continue }
        const q = out[out.length - 1]
        if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-3) out.push(p)
      }
      if (out.length < 3) return ring
      out.push([out[0][0], out[0][1]])
      return out
    }
    const mergeCloseVertices = (ring: number[][], tol: number): number[][] => {
      if (ring.length <= 4) return ring
      let pts = ring.slice(0, ring.length - 1)
      const maxIter = pts.length
      let changed = true
      let iter = 0
      const intersectLines = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): [number, number] | null => {
        const r1x = bx - ax, r1y = by - ay
        const r2x = dx - cx, r2y = dy - cy
        const det = r1x * (-r2y) - r1y * (-r2x)
        if (Math.abs(det) < 1e-6) return null
        const vx = cx - ax, vy = cy - ay
        const t = (vx * (-r2y) - vy * (-r2x)) / det
        return [ax + t * r1x, ay + t * r1y]
      }
      while (changed && iter++ < maxIter) {
        changed = false
        const n = pts.length
        for (let i = 0; i < n; i++) {
          const a = pts[(i - 1 + n) % n]
          const b = pts[i]
          const c = pts[(i + 1) % n]
          if (Math.hypot(b[0] - c[0], b[1] - c[1]) <= tol) {
            const d = pts[(i + 2) % n]
            const I = intersectLines(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1])
            const merged: [number, number] = I || [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2]
            // Replace b with merged, drop c
            pts[i] = [merged[0], merged[1]]
            pts.splice((i + 1) % n, 1)
            changed = true
            break
          }
        }
      }
      if (pts.length < 3) return ring
      pts.push([pts[0][0], pts[0][1]])
      return pts
    }
    const collapseApexClusters = (
      ring: number[][],
      apexes: Array<{ x: number; y: number }>,
      tol: number
    ): number[][] => {
      if (ring.length <= 4 || apexes.length === 0) return ring
      let pts = ring.slice(0, ring.length - 1)
      for (const a of apexes) {
        // Collect indices within tol from apex
        const nearIdx: number[] = []
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i]
          if (Math.hypot(p[0] - a.x, p[1] - a.y) <= tol) nearIdx.push(i)
        }
        if (nearIdx.length >= 2) {
          const keep: number[][] = []
          let collapsed = false
          for (let i = 0; i < pts.length; i++) {
            if (nearIdx.includes(i)) {
              if (!collapsed) {
                keep.push([a.x, a.y])
                collapsed = true
              }
              // skip others in cluster
              continue
            }
            keep.push(pts[i])
          }
          pts = keep
        }
      }
      // Deduplicate consecutive equals
      const out: number[][] = []
      for (const p of pts) {
        if (out.length === 0) { out.push(p); continue }
        const q = out[out.length - 1]
        if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-3) out.push(p)
      }
      out.push([out[0][0], out[0][1]])
      return out
    }

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
        const labelContainer = new PIXI.Container()
        labelContainer.zIndex = 3005
        // Inverse scale for constant on-screen size
        const stageForGuides = (overlay.parent && overlay.parent.parent) as PIXI.Container | null
        const gx = stageForGuides?.scale?.x || 1
        const gy = stageForGuides?.scale?.y || 1
        const tryPlaceGuide = makeTryPlace(gx, gy)
        modelRef.current.getAllWalls().forEach(wall => {
          if (wall.type !== t || !wall.visible) return
          wall.segmentIds.forEach(segId => {
            const seg = modelRef.current.getSegment(segId)
            if (!seg) return
            const a = nodesMap.get(seg.startNodeId)
            const b = nodesMap.get(seg.endNodeId)
            if (!a || !b) return
            g.moveTo(a.x, a.y).lineTo(b.x, b.y)
            // Segment ID label at midpoint
            if ((wallLayerDebug as any)[t]?.guidesLabels) {
              const midX = (a.x + b.x) / 2
              const midY = (a.y + b.y) / 2
              const text = new PIXI.Text(`S = ${String(seg.id)}`, {
                fill: guideTextColor,
                fontSize: GUIDE_SEGMENT_FONT,
                fontFamily: 'monospace',
                fontWeight: '600',
                dropShadow: false
              } as any)
              text.scale.set(1 / gx, 1 / gy)
              tryPlaceGuide(text, midX, midY, { x: 18 / gx, y: 18 / gy })
              labelContainer.addChild(text)
            }
            seenNode.add(a.id)
            seenNode.add(b.id)
          })
        })
        g.stroke()
        // Draw nodes as small circles
        g.setFillStyle({ color: nodeFill, alpha: 0.9 })
        seenNode.forEach(id => {
          const n = nodesMap.get(id)
          if (!n) return
          g.circle(n.x, n.y, nodeRadius)
          // Node label with node id
          if ((wallLayerDebug as any)[t]?.guidesLabels) {
            const nodeText = new PIXI.Text(`N = ${String(id)}`, {
              fill: guideTextColor,
              fontSize: GUIDE_NODE_FONT,
              fontFamily: 'monospace',
              fontWeight: '600',
              dropShadow: false
            } as any)
            nodeText.scale.set(1 / gx, 1 / gy)
            tryPlaceGuide(nodeText, n.x, n.y, { x: (nodeRadius + 18) / gx, y: (nodeRadius + 14) / gy })
            labelContainer.addChild(nodeText)
          }
        })
        g.fill()
        overlay.addChild(g)
        if ((wallLayerDebug as any)[t]?.guidesLabels) {
          overlay.addChild(labelContainer)
        }
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
        const shellLabels = new PIXI.Container()
        shellLabels.zIndex = 2002
        ;(shellLabels as any).eventMode = 'none'
        // Connector lines for labels that were displaced to avoid overlaps
        const connectors = new PIXI.Graphics()
        // Stage scale for constant-size label and connector rendering
        const stageForShell = (overlay.parent && overlay.parent.parent) as PIXI.Container | null
        const sx = stageForShell?.scale?.x || 1
        const sy = stageForShell?.scale?.y || 1
        const invAvg = (1 / sx + 1 / sy) / 2
        connectors.setStrokeStyle({ width: 1.5 * invAvg, color: shellColor, alpha: 0.6 })
        connectors.zIndex = 2001
        const tryPlace = makeTryPlace(sx, sy, connectors)
        modelRef.current.getAllWalls().forEach(wall => {
          if (wall.type !== t || !wall.visible) return
          const half = wall.thickness / 2
          const rings: number[][][] = []
          // Compute node degrees within this wall to allow endpoint trimming at junctions
          const degree = new Map<string, number>()
          wall.segmentIds.forEach(id => {
            const s = modelRef.current.getSegment(id)
            if (!s) return
            degree.set(s.startNodeId, (degree.get(s.startNodeId) || 0) + 1)
            degree.set(s.endNodeId, (degree.get(s.endNodeId) || 0) + 1)
          })
          // Segment quads
          wall.segmentIds.forEach(segId => {
            const seg = modelRef.current.getSegment(segId)
            if (!seg) return
            const a = nodesMap.get(seg.startNodeId)
            const b = nodesMap.get(seg.endNodeId)
            if (!a || !b) return
            let ax = a.x, ay = a.y
            let bx = b.x, by = b.y
            const vx = bx - ax
            const vy = by - ay
            const len = Math.hypot(vx, vy) || 1
            const tx = vx / len
            const ty = vy / len
            // Small inward trim at both ends for clean miters when degree==2 (elbow)
            const trim = Math.min(half * 0.35, 18)
            if ((degree.get(seg.startNodeId) || 0) === 2) { ax += tx * trim; ay += ty * trim }
            if ((degree.get(seg.endNodeId) || 0) === 2) { bx -= tx * trim; by -= ty * trim }
            const nx = -vy / len
            const ny = vx / len
            const p1 = [ax + nx * half, ay + ny * half]
            const p2 = [bx + nx * half, by + ny * half]
            const p3 = [bx - nx * half, by - ny * half]
            const p4 = [ax - nx * half, ay - ny * half]
            rings.push([p1, p2, p3, p4, p1])
            if ((wallLayerDebug as any)[t]?.shellLabels) {
              const midX = (ax + bx) / 2
              const midY = (ay + by) / 2
              const text = new PIXI.Text(`S = ${String(seg.id)}`, {
                fill: shellTextColor,
                fontSize: SHELL_SEGMENT_FONT,
                fontFamily: 'monospace',
                fontWeight: '600',
                dropShadow: false
              } as any)
              text.scale.set(1 / sx, 1 / sy)
              tryPlace(text, midX, midY, { x: 18 / sx, y: 18 / sy })
              shellLabels.addChild(text)
            }
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
          multipoly.forEach((polygon) => {
            polygon.forEach((ring, ringIdx) => {
              // Clean up nearly-collinear/duplicate vertices; use stronger tolerance near junctions
              ring = simplifyRing(ring, Math.max(2, half * 0.7))
              // Remove vertices that land directly on elbow guide node centers (degree==2)
              const junctionPositions: Array<{x: number; y: number}> = []
              const apexes: Array<{ x: number; y: number }> = []
              degree.forEach((deg, nid) => {
                if (deg === 2) {
                  const n = nodesMap.get(nid)
                  if (n) {
                    junctionPositions.push({ x: n.x, y: n.y })
                    // Compute miter apex from adjacent normals (using nodeToDirs)
                    const dirs = nodeToDirs.get(nid) || []
                    if (dirs.length === 2) {
                      const d1 = dirs[0]
                      const d2 = dirs[1]
                      const t1x = -d1.ny, t1y = d1.nx
                      const t2x = -d2.ny, t2y = d2.nx
                      const p1x = n.x + d1.nx * half
                      const p1y = n.y + d1.ny * half
                      const p2x = n.x + d2.nx * half
                      const p2y = n.y + d2.ny * half
                      const m = ((): [number, number] | null => {
                        const det = t1x * (-t2y) - t1y * (-t2x)
                        if (Math.abs(det) < 1e-6) return null
                        const dx = p2x - p1x
                        const dy = p2y - p1y
                        const t = (dx * (-t2y) - dy * (-t2x)) / det
                        return [p1x + t * t1x, p1y + t * t1y]
                      })()
                      if (m) apexes.push({ x: m[0], y: m[1] })
                    }
                  }
                }
              })
              ring = filterVerticesNearJunctions(ring, junctionPositions, Math.max(2, half * 1.0))
              // Snap remaining nearby vertices to computed miter apex and deduplicate
              ring = snapVerticesToMiterApex(ring, apexes, Math.max(2, half * 1.2))
              // Finally, collapse any remaining near-duplicate consecutive vertices using line intersection
              ring = mergeCloseVertices(ring, Math.max(2, half * 1.0))
              // And force one-and-only-one vertex for each apex cluster
              ring = collapseApexClusters(ring, apexes, Math.max(2, half * 1.2))
              const [x0, y0] = ring[0]
              outline.moveTo(x0, y0)
              for (let i = 1; i < ring.length; i++) {
                const [x, y] = ring[i]
                outline.lineTo(x, y)
              }
              outline.closePath()

              // Draw vertices and deterministic vertex/edge labels per ring
              for (let i = 0; i < ring.length; i++) {
                const [vx, vy] = ring[i]
                vertices.circle(vx, vy, 12)

                if ((wallLayerDebug as any)[t]?.shellLabels) {
                  // Vertex label: V = r{ringIdx}:v{i}
                  const vLabel = new PIXI.Text(`V = r${ringIdx}:v${i}` as any, {
                    fill: shellTextColor,
                    fontSize: SHELL_NODE_FONT,
                    fontFamily: 'monospace',
                    fontWeight: '600',
                    dropShadow: false
                  } as any)
                  vLabel.scale.set(1 / sx, 1 / sy)
                  tryPlace(vLabel, vx, vy)
                  shellLabels.addChild(vLabel)

                  // Edge label at midpoint to next vertex (wrap around)
                  const [nx, ny] = ring[(i + 1) % ring.length]
                  const mx = (vx + nx) / 2
                  const my = (vy + ny) / 2
                  const eLabel = new PIXI.Text(`E = r${ringIdx}:e${i}` as any, {
                    fill: shellTextColor,
                    fontSize: SHELL_SEGMENT_FONT,
                    fontFamily: 'monospace',
                    fontWeight: '600',
                    dropShadow: false
                  } as any)
                  eLabel.scale.set(1 / sx, 1 / sy)
                  // Prefer initial offset along edge normal away from polygon (deterministic)
                  const ex = nx - vx
                  const ey = ny - vy
                  const elen = Math.hypot(ex, ey) || 1
                  const nnx = -ey / elen
                  const nny = ex / elen
                  tryPlace(eLabel, mx, my, { x: (nnx * 12) / sx, y: (nny * 12) / sy })
                  shellLabels.addChild(eLabel)
                }
              }
            })
          })
        })
        outline.stroke()
        vertices.fill()
        overlay.addChild(outline)
        overlay.addChild(vertices)
        if ((wallLayerDebug as any)[t]?.shellLabels) {
          overlay.addChild(shellLabels)
          overlay.addChild(connectors)
        }
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

  // Wrap viewport change to refresh overlays so inverse-scaling stays correct
  const handleViewportChanged = useCallback((v: { zoom: number; panX: number; panY: number }) => {
    onViewportChange?.(v)
    // Trigger re-render of debug overlays on any zoom/pan update
    setDebugOverlayTick(t => t + 1)
  }, [onViewportChange])

  return (
    <CanvasContainer
      className={className}
      onMouseMove={handleMouseMove}
      onCanvasClick={handleCanvasClick}
      onCanvasDoubleClick={handleCanvasDoubleClick}
      onCanvasRightClick={handleCanvasRightClick}
      onCanvasReady={handleCanvasReady}
      onViewportChange={handleViewportChanged}
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