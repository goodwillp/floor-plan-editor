import { useRef, useCallback } from 'react'
import { WallEditingService } from '@/lib/WallEditingService'
import type { WallTypeString } from '@/lib/types'
import type { FloorPlanModel } from '@/lib/FloorPlanModel'

interface UseWallEditingProps {
  model: FloorPlanModel
  onWallUpdated?: (wallId: string) => void
  onWallDeleted?: (wallIds: string[]) => void
  onStatusMessage?: (message: string) => void
}

interface UseWallEditingReturn {
  updateWallType: (wallId: string, newType: WallTypeString) => Promise<boolean>
  updateWallVisibility: (wallId: string, visible: boolean) => Promise<boolean>
  deleteWalls: (wallIds: string[]) => Promise<boolean>
  mergeWalls: (wallId1: string, wallId2: string) => Promise<boolean>
  validateWall: (wallId: string) => Promise<{isValid: boolean, issues: string[], fixesApplied: string[]}>
  canMergeWalls: (wallId1: string, wallId2: string) => Promise<{canMerge: boolean, reason: string, sharedNodes?: string[]}>
  getWallProperties: (wallId: string) => Promise<any>
}

/**
 * Hook for wall editing operations
 * Requirements: 2.2, 2.3, 2.4, 2.5
 */
export function useWallEditing({
  model,
  onWallUpdated,
  onWallDeleted,
  onStatusMessage
}: UseWallEditingProps): UseWallEditingReturn {
  const editingServiceRef = useRef<WallEditingService | null>(null)

  // Initialize editing service
  if (!editingServiceRef.current) {
    editingServiceRef.current = new WallEditingService(model)
  }

  const updateWallType = useCallback(async (wallId: string, newType: WallTypeString): Promise<boolean> => {
    if (!editingServiceRef.current) return false

    const result = editingServiceRef.current.updateWallType(wallId, newType)
    
    if (result.success) {
      onWallUpdated?.(wallId)
      onStatusMessage?.(`Wall type updated to ${newType}`)
      return true
    } else {
      onStatusMessage?.(`Failed to update wall type: ${result.error}`)
      return false
    }
  }, [onWallUpdated, onStatusMessage])

  const updateWallVisibility = useCallback(async (wallId: string, visible: boolean): Promise<boolean> => {
    if (!editingServiceRef.current) return false

    const result = editingServiceRef.current.updateWallVisibility(wallId, visible)
    
    if (result.success) {
      onWallUpdated?.(wallId)
      onStatusMessage?.(`Wall ${visible ? 'shown' : 'hidden'}`)
      return true
    } else {
      onStatusMessage?.(`Failed to update wall visibility: ${result.error}`)
      return false
    }
  }, [onWallUpdated, onStatusMessage])

  const deleteWalls = useCallback(async (wallIds: string[]): Promise<boolean> => {
    if (!editingServiceRef.current) return false

    const result = editingServiceRef.current.deleteWalls(wallIds)
    
    if (result.success) {
      onWallDeleted?.(result.deletedWalls)
      onStatusMessage?.(`Deleted ${result.deletedWalls.length} wall(s)`)
      return true
    } else {
      onStatusMessage?.(`Failed to delete walls: ${result.errors.join(', ')}`)
      return false
    }
  }, [onWallDeleted, onStatusMessage])

  const mergeWalls = useCallback(async (wallId1: string, wallId2: string): Promise<boolean> => {
    if (!editingServiceRef.current) return false

    const result = editingServiceRef.current.mergeWalls(wallId1, wallId2)
    
    if (result.success && result.mergedWallId) {
      onWallUpdated?.(result.mergedWallId)
      onWallDeleted?.([wallId2])
      onStatusMessage?.('Merged walls into ' + result.mergedWallId.substring(0, 8) + '...')
      return true
    } else {
      onStatusMessage?.('Failed to merge walls: ' + (result.error || 'Unknown error'))
      return false
    }
  }, [onWallUpdated, onWallDeleted, onStatusMessage])

  const validateWall = useCallback(async (wallId: string): Promise<{isValid: boolean, issues: string[], fixesApplied: string[]}> => {
    if (!editingServiceRef.current) {
      return {isValid: false, issues: ['Editing service not available'], fixesApplied: []}
    }

    const result = editingServiceRef.current.validateAndFixWall(wallId)
    
    if (result.fixesApplied.length > 0) {
      onWallUpdated?.(wallId)
      onStatusMessage?.(`Wall validated, ${result.fixesApplied.length} fixes applied`)
    }
    
    return result
  }, [onWallUpdated, onStatusMessage])

  const canMergeWalls = useCallback(async (wallId1: string, wallId2: string): Promise<{canMerge: boolean, reason: string, sharedNodes?: string[]}> => {
    if (!editingServiceRef.current) {
      return {canMerge: false, reason: 'Editing service not available'}
    }

    return editingServiceRef.current.canMergeWalls(wallId1, wallId2)
  }, [])

  const getWallProperties = useCallback(async (wallId: string): Promise<any> => {
    if (!editingServiceRef.current) {
      return null
    }

    return editingServiceRef.current.getWallProperties(wallId)
  }, [])

  return {
    updateWallType,
    updateWallVisibility,
    deleteWalls,
    mergeWalls,
    validateWall,
    canMergeWalls,
    getWallProperties
  }
} 