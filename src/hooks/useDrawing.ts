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
    if (!isDrawingMode && isDrawing) {
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
  }, [isDrawingMode, isDrawing])

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
    if (!drawingServiceRef.current || !drawingRendererRef.current || !isDrawing) return

    const previewLine = drawingServiceRef.current.getPreviewLine(mousePosition)
    if (previewLine) {
      drawingRendererRef.current.renderPreviewLine(
        previewLine.start,
        previewLine.end,
        activeWallType
      )
    }
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