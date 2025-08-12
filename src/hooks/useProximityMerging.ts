import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import { ProximityMergingService, type ProximityMerge } from '@/lib/ProximityMergingService'
import { ProximityMergeRenderer } from '@/lib/ProximityMergeRenderer'
import type { CanvasLayers } from '@/components/CanvasContainer'

interface UseProximityMergingProps {
  model: FloorPlanModel
  layers: CanvasLayers | null
  enabled: boolean
  proximityThreshold?: number
  checkInterval?: number
}

interface UseProximityMergingReturn {
  activeMerges: ProximityMerge[]
  isEnabled: boolean
  proximityThreshold: number
  mergeStats: {
    totalMerges: number
    averageDistance: number
    mergesByType: Record<string, number>
  }
  setEnabled: (enabled: boolean) => void
  setProximityThreshold: (threshold: number) => void
  refreshMerges: () => void
  clearAllMerges: () => void
  getMergedWalls: (wallId: string) => string[]
  areWallsMerged: (wall1Id: string, wall2Id: string) => boolean
}

/**
 * Hook for managing proximity-based wall merging
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export function useProximityMerging({
  model,
  layers,
  enabled,
  proximityThreshold = 15,
  checkInterval = 100
}: UseProximityMergingProps): UseProximityMergingReturn {
  const [activeMerges, setActiveMerges] = useState<ProximityMerge[]>([])
  const [isEnabled, setIsEnabled] = useState(enabled)
  const [currentThreshold, setCurrentThreshold] = useState(proximityThreshold)

  const mergingServiceRef = useRef<ProximityMergingService | null>(null)
  const rendererRef = useRef<ProximityMergeRenderer | null>(null)

  // Initialize proximity merging service
  useEffect(() => {
    mergingServiceRef.current = new ProximityMergingService(model)
    mergingServiceRef.current.setProximityThreshold(proximityThreshold)

    return () => {
      if (mergingServiceRef.current) {
        mergingServiceRef.current.destroy()
        mergingServiceRef.current = null
      }
    }
  }, [model, proximityThreshold])

  // Initialize renderer when layers are available
  useEffect(() => {
    if (layers?.wall && !rendererRef.current) {
      rendererRef.current = new ProximityMergeRenderer(layers.wall, model)
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy()
        rendererRef.current = null
      }
    }
  }, [layers, model])

  // Handle enable/disable state changes
  useEffect(() => {
    if (!mergingServiceRef.current) return

    if (isEnabled) {
      mergingServiceRef.current.startProximityChecking(checkInterval)
    } else {
      mergingServiceRef.current.stopProximityChecking()
      mergingServiceRef.current.clearAllMerges()
      setActiveMerges([])
    }
  }, [isEnabled, checkInterval])

  // Handle proximity threshold changes
  useEffect(() => {
    if (mergingServiceRef.current) {
      mergingServiceRef.current.setProximityThreshold(currentThreshold)
      // Refresh merges with new threshold
      if (isEnabled) {
        mergingServiceRef.current.updateProximityMerges()
      }
    }
  }, [currentThreshold, isEnabled])

  // Listen for merge events and update state
  useEffect(() => {
    const handleMergeCreated = (event: Event) => {
      const merge = (event as CustomEvent).detail as ProximityMerge
      setActiveMerges(prev => {
        const existing = prev.find(m => m.id === merge.id)
        if (existing) return prev
        return [...prev, merge]
      })
    }

    const handleMergeSeparated = (event: Event) => {
      const merge = (event as CustomEvent).detail as ProximityMerge
      setActiveMerges(prev => prev.filter(m => m.id !== merge.id))
    }

    window.addEventListener('merge-created' as any, handleMergeCreated as unknown as EventListener)
    window.addEventListener('merge-separated' as any, handleMergeSeparated as unknown as EventListener)

    return () => {
      window.removeEventListener('merge-created' as any, handleMergeCreated as unknown as EventListener)
      window.removeEventListener('merge-separated' as any, handleMergeSeparated as unknown as EventListener)
    }
  }, [])

  // Update renderer when merges change
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.refresh(activeMerges)
    }
  }, [activeMerges])

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled)
  }, [])

  const setProximityThreshold = useCallback((threshold: number) => {
    setCurrentThreshold(threshold)
  }, [])

  const refreshMerges = useCallback(() => {
    if (mergingServiceRef.current && isEnabled) {
      mergingServiceRef.current.updateProximityMerges()
    }
  }, [isEnabled])

  const clearAllMerges = useCallback(() => {
    if (mergingServiceRef.current) {
      mergingServiceRef.current.clearAllMerges()
      setActiveMerges([])
    }
  }, [])

  const getMergedWalls = useCallback((wallId: string): string[] => {
    if (!mergingServiceRef.current) return []
    return mergingServiceRef.current.getMergedWalls(wallId)
  }, [])

  const areWallsMerged = useCallback((wall1Id: string, wall2Id: string): boolean => {
    if (!mergingServiceRef.current) return false
    return mergingServiceRef.current.areWallsMerged(wall1Id, wall2Id)
  }, [])

  // Calculate merge statistics
  const mergeStats = useMemo(() => {
    console.log('🔍 useProximityMerging mergeStats calculation', {
      activeMergesLength: activeMerges.length,
      timestamp: Date.now()
    })
    
    return {
      totalMerges: activeMerges.length,
      averageDistance: activeMerges.length > 0
        ? activeMerges.reduce((sum, merge) => sum + merge.distance, 0) / activeMerges.length
        : 0,
      mergesByType: activeMerges.reduce((acc, merge) => {
        acc[merge.mergeType] = (acc[merge.mergeType] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }, [activeMerges])

  return {
    activeMerges,
    isEnabled,
    proximityThreshold: currentThreshold,
    mergeStats,
    setEnabled,
    setProximityThreshold,
    refreshMerges,
    clearAllMerges,
    getMergedWalls,
    areWallsMerged
  }
}