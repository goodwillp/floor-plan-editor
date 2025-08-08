import { useState, useCallback, useRef, useEffect } from 'react'
import type { Point, WallTypeString } from '@/lib/types'
import { DrawingService } from '@/lib/DrawingService'
import { DrawingRenderer } from '@/lib/DrawingRenderer'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import type { CanvasLayers } from '@/components/CanvasContainer'

interface UseDrawingProps {
  model: FloorPlanModel
  layers: CanvasLayers | null
  activeWallType: WallTypeString
  isDrawingMode: boolean
}

interface UseDrawingReturn {
  isDrawing: boolean
  currentPoints: Point[]
  startDrawing: (point: Point) => void
  addPoint: (point: Point) => void
  completeDrawing: () => string | null
  cancelDrawing: () => void
  updatePreview: (mousePosition: Point) => void
  getCurrentDrawingLength: () => number
}

/**
 * Hook for managing wall drawing state and operations
 * Requirements: 2.1, 6.4, 11.4, 14.1
 */
export function useDrawing({
  model,
  layers,
  activeWallType,
  isDrawingMode
}: UseDrawingProps): UseDrawingReturn {
  const drawingServiceRef = useRef<DrawingService | null>(null)
  const drawingRendererRef = useRef<DrawingRenderer | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])

  // Initialize drawing service
  useEffect(() => {
    drawingServiceRef.current = new DrawingService(model)
    drawingServiceRef.current.setActiveWallType(activeWallType)
  }, [model, activeWallType])

  // Initialize drawing renderer when layers are available
  useEffect(() => {
    if (layers?.ui && !drawingRendererRef.current) {
      drawingRendererRef.current = new DrawingRenderer(layers.ui)
    }
    
    return () => {
      if (drawingRendererRef.current) {
        drawingRendererRef.current.destroy()
        drawingRendererRef.current = null
      }
    }
  }, [layers])

  // Clear drawing when not in drawing mode
  useEffect(() => {
    console.log('🔍 useDrawing useEffect triggered', {
      isDrawingMode,
      isDrawing,
      timestamp: Date.now()
    })
    
    if (!isDrawingMode && isDrawing) {
      console.log('🔍 Canceling drawing due to mode change')
      if (drawingServiceRef.current) {
        drawingServiceRef.current.cancelDrawing()
        setIsDrawing(false)
        setCurrentPoints([])
        
        // Clear visual feedback
        if (drawingRendererRef.current) {
          drawingRendererRef.current.clear()
        }
      }
    }
  }, [isDrawingMode]) // Removed isDrawing to prevent infinite loop

  const startDrawing = useCallback((point: Point) => {
    if (!drawingServiceRef.current || !isDrawingMode) return

    drawingServiceRef.current.startDrawing(point)
    setIsDrawing(true)
    setCurrentPoints([point])
  }, [isDrawingMode])

  const addPoint = useCallback((point: Point) => {
    if (!drawingServiceRef.current || !isDrawing) return

    drawingServiceRef.current.addPoint(point)
    const updatedPoints = drawingServiceRef.current.getCurrentPoints()
    setCurrentPoints(updatedPoints)

    // Update visual feedback
    if (drawingRendererRef.current) {
      drawingRendererRef.current.renderCurrentDrawing(updatedPoints, activeWallType)
    }
  }, [isDrawing, activeWallType])

  const completeDrawing = useCallback(() => {
    if (!drawingServiceRef.current || !isDrawing) return null

    const wallId = drawingServiceRef.current.completeDrawing()
    setIsDrawing(false)
    setCurrentPoints([])

    // Clear visual feedback
    if (drawingRendererRef.current) {
      drawingRendererRef.current.clear()
    }

    return wallId
  }, [isDrawing])

  const cancelDrawing = useCallback(() => {
    if (!drawingServiceRef.current) return

    drawingServiceRef.current.cancelDrawing()
    setIsDrawing(false)
    setCurrentPoints([])

    // Clear visual feedback
    if (drawingRendererRef.current) {
      drawingRendererRef.current.clear()
    }
  }, [])

  const updatePreview = useCallback((mousePosition: Point) => {
    if (!drawingServiceRef.current || !drawingRendererRef.current) return

    // Always show preview line when drawing; otherwise only guides
    const previewLine = drawingServiceRef.current.getPreviewLine(mousePosition)
    if (isDrawing && previewLine) {
      drawingRendererRef.current.renderPreviewLine(
        previewLine.start,
        previewLine.end,
        activeWallType
      )
    } else {
      drawingRendererRef.current.renderPreviewLine({ x: 0, y: 0 }, { x: 0, y: 0 }, activeWallType)
    }

    // Compute snap guides to nearest existing segment
    const model: FloorPlanModel = (drawingServiceRef.current as any).model
    const segments = (model as any).getAllSegments?.() as any[] | undefined
    if (segments && segments.length > 0) {
      let minDist = Infinity
      let nearest: any = null
      segments.forEach((seg: any) => {
        const start = (model as any).getNode(seg.startNodeId)
        const end = (model as any).getNode(seg.endNodeId)
        if (start && end) {
          const d = Math.abs(((end.y - start.y) * mousePosition.x - (end.x - start.x) * mousePosition.y + end.x * start.y - end.y * start.x) /
            Math.hypot(end.y - start.y, end.x - start.x))
          if (d < minDist) {
            minDist = d
            nearest = { start, end }
          }
        }
      })
      const SNAP_TOL = 10
      if (nearest && minDist <= SNAP_TOL) {
        // Project mouse to nearest segment for a snapped visual
        const ax = nearest.start.x, ay = nearest.start.y
        const bx = nearest.end.x, by = nearest.end.y
        const vx = bx - ax, vy = by - ay
        const wx = mousePosition.x - ax, wy = mousePosition.y - ay
        const len2 = vx * vx + vy * vy
        const t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0
        const px = ax + t * vx
        const py = ay + t * vy
        drawingRendererRef.current.renderSnapGuide({ x: ax, y: ay }, { x: bx, y: by }, { x: px, y: py })
        return
      }
    }
    // Clear guides if none
    drawingRendererRef.current.renderSnapGuide()
  }, [isDrawing, activeWallType])

  const getCurrentDrawingLength = useCallback(() => {
    if (!drawingServiceRef.current) return 0
    return drawingServiceRef.current.getCurrentDrawingLength()
  }, [])

  return {
    isDrawing,
    currentPoints,
    startDrawing,
    addPoint,
    completeDrawing,
    cancelDrawing,
    updatePreview,
    getCurrentDrawingLength
  }
}