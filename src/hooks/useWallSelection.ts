import { useState, useCallback, useRef, useEffect } from 'react'
import type { Point } from '@/lib/types'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import { WallSelectionService } from '@/lib/WallSelectionService'
import { WallEditingService } from '@/lib/WallEditingService'
import { SelectionRenderer } from '@/lib/SelectionRenderer'
import type { CanvasLayers } from '@/components/CanvasContainer'

interface UseWallSelectionProps {
  model: FloorPlanModel
  layers: CanvasLayers | null
  isSelectionMode: boolean
}

interface UseWallSelectionReturn {
  selectedWallIds: string[]
  hoveredWallId: string | null
  selectWall: (wallId: string) => void
  deselectWall: (wallId: string) => void
  toggleWallSelection: (wallId: string) => void
  clearSelection: () => void
  selectMultiple: (wallIds: string[]) => void
  handleCanvasClick: (point: Point) => string | null
  handleCanvasHover: (point: Point) => string | null
  isWallSelected: (wallId: string) => boolean
  getWallProperties: () => ReturnType<WallEditingService['getMultipleWallProperties']>
}

/**
 * Hook for managing wall selection state and interactions
 * Requirements: 2.2, 2.3, 11.2
 */
export function useWallSelection({
  model,
  layers,
  isSelectionMode
}: UseWallSelectionProps): UseWallSelectionReturn {
  const [selectedWallIds, setSelectedWallIds] = useState<string[]>([])
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null)
  
  const selectionServiceRef = useRef<WallSelectionService | null>(null)
  const editingServiceRef = useRef<WallEditingService | null>(null)
  const selectionRendererRef = useRef<SelectionRenderer | null>(null)

  // Initialize services
  useEffect(() => {
    selectionServiceRef.current = new WallSelectionService(model)
    editingServiceRef.current = new WallEditingService(model)
  }, [model])

  // Initialize selection renderer when layers are available
  useEffect(() => {
    if (layers?.selection && !selectionRendererRef.current) {
      selectionRendererRef.current = new SelectionRenderer(layers.selection, model)
    }
    
    return () => {
      if (selectionRendererRef.current) {
        selectionRendererRef.current.destroy()
        selectionRendererRef.current = null
      }
    }
  }, [layers, model])

  // Update renderer when selection changes
  useEffect(() => {
    if (selectionRendererRef.current) {
      selectionRendererRef.current.clearSelection()
      selectedWallIds.forEach(wallId => {
        selectionRendererRef.current!.selectWall(wallId)
      })
    }
  }, [selectedWallIds])

  // Update renderer when hover changes
  useEffect(() => {
    if (selectionRendererRef.current) {
      selectionRendererRef.current.setHoveredWall(hoveredWallId)
    }
  }, [hoveredWallId])

  // Clear selection when not in selection mode
  useEffect(() => {
    if (!isSelectionMode && selectedWallIds.length > 0) {
      setSelectedWallIds([])
      setHoveredWallId(null)
    }
  }, [isSelectionMode, selectedWallIds.length])

  const selectWall = useCallback((wallId: string) => {
    setSelectedWallIds(prev => {
      if (!prev.includes(wallId)) {
        return [...prev, wallId]
      }
      return prev
    })
  }, [])

  const deselectWall = useCallback((wallId: string) => {
    setSelectedWallIds(prev => prev.filter(id => id !== wallId))
  }, [])

  const toggleWallSelection = useCallback((wallId: string) => {
    setSelectedWallIds(prev => {
      if (prev.includes(wallId)) {
        return prev.filter(id => id !== wallId)
      } else {
        return [...prev, wallId]
      }
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedWallIds([])
    setHoveredWallId(null)
  }, [])

  const selectMultiple = useCallback((wallIds: string[]) => {
    setSelectedWallIds(wallIds)
  }, [])

  const handleCanvasClick = useCallback((point: Point): string | null => {
    if (!isSelectionMode || !selectionServiceRef.current) return null

    const result = selectionServiceRef.current.findWallAtPoint(point)
    if (result) {
      toggleWallSelection(result.wallId)
      return result.wallId
    } else {
      // Click on empty space - clear selection
      clearSelection()
      return null
    }
  }, [isSelectionMode, toggleWallSelection, clearSelection])

  const handleCanvasHover = useCallback((point: Point): string | null => {
    if (!isSelectionMode || !selectionServiceRef.current) {
      if (hoveredWallId) {
        setHoveredWallId(null)
      }
      return null
    }

    const result = selectionServiceRef.current.findWallAtPoint(point)
    const newHoveredWallId = result ? result.wallId : null
    
    if (newHoveredWallId !== hoveredWallId) {
      setHoveredWallId(newHoveredWallId)
    }
    
    return newHoveredWallId
  }, [isSelectionMode, hoveredWallId])

  const isWallSelected = useCallback((wallId: string): boolean => {
    return selectedWallIds.includes(wallId)
  }, [selectedWallIds])

  const getWallProperties = useCallback(() => {
    if (!editingServiceRef.current || selectedWallIds.length === 0) {
      return []
    }
    return editingServiceRef.current.getMultipleWallProperties(selectedWallIds)
  }, [selectedWallIds])

  return {
    selectedWallIds,
    hoveredWallId,
    selectWall,
    deselectWall,
    toggleWallSelection,
    clearSelection,
    selectMultiple,
    handleCanvasClick,
    handleCanvasHover,
    isWallSelected,
    getWallProperties
  }
}