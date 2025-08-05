import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Trash2, Eye, EyeOff } from 'lucide-react'
import type { WallTypeString } from '@/lib/types'
import { WALL_THICKNESS } from '@/lib/types'

interface WallPropertiesPanelProps {
  selectedWallIds: string[]
  wallProperties: Array<{
    id: string
    type: WallTypeString
    thickness: number
    visible: boolean
    segmentCount: number
    totalLength: number
    nodeCount: number
    createdAt: Date
    updatedAt: Date
  }> | null
  onWallTypeChange: (wallIds: string[], newType: WallTypeString) => void
  onWallVisibilityChange: (wallIds: string[], visible: boolean) => void
  onWallDelete: (wallIds: string[]) => void
  onSelectionClear: () => void
  className?: string
}

/**
 * Panel for editing wall properties
 * Requirements: 2.3, 2.4, 11.2
 */
export function WallPropertiesPanel({
  selectedWallIds,
  wallProperties,
  onWallTypeChange,
  onWallVisibilityChange,
  onWallDelete,
  onSelectionClear,
  className
}: WallPropertiesPanelProps) {
  const [pendingType, setPendingType] = useState<WallTypeString | null>(null)
  const [pendingVisibility, setPendingVisibility] = useState<boolean | null>(null)

  // Reset pending changes when selection changes
  useEffect(() => {
    setPendingType(null)
    setPendingVisibility(null)
  }, [selectedWallIds])

  if (selectedWallIds.length === 0) {
    return (
      <div className={className}>
        <h3 className="font-semibold mb-3">Properties</h3>
        <div className="text-sm text-muted-foreground">
          No wall selected. Click on a wall to edit its properties.
        </div>
      </div>
    )
  }

  if (!wallProperties || wallProperties.length === 0) {
    return (
      <div className={className}>
        <h3 className="font-semibold mb-3">Properties</h3>
        <div className="text-sm text-muted-foreground">
          Loading wall properties...
        </div>
      </div>
    )
  }

  const isMultiSelection = selectedWallIds.length > 1
  const firstWall = wallProperties[0]

  // Check if all selected walls have the same properties
  const allSameType = wallProperties.every(w => w.type === firstWall.type)
  const allSameVisibility = wallProperties.every(w => w.visible === firstWall.visible)

  // Calculate totals for multi-selection
  const totalLength = wallProperties.reduce((sum, w) => sum + w.totalLength, 0)
  const totalSegments = wallProperties.reduce((sum, w) => sum + w.segmentCount, 0)
  const totalNodes = wallProperties.reduce((sum, w) => sum + w.nodeCount, 0)

  const handleTypeChange = (newType: WallTypeString) => {
    setPendingType(newType)
    onWallTypeChange(selectedWallIds, newType)
  }

  const handleVisibilityChange = (visible: boolean) => {
    setPendingVisibility(visible)
    onWallVisibilityChange(selectedWallIds, visible)
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedWallIds.length} wall(s)?`)) {
      onWallDelete(selectedWallIds)
    }
  }

  const currentType = pendingType || (allSameType ? firstWall.type : null)
  const currentVisibility = pendingVisibility !== null ? pendingVisibility : (allSameVisibility ? firstWall.visible : null)

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Properties</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectionClear}
          className="h-6 px-2 text-xs"
        >
          Clear
        </Button>
      </div>

      {/* Selection Info */}
      <div className="mb-4 p-2 bg-muted rounded-md">
        <div className="text-sm font-medium">
          {isMultiSelection ? `${selectedWallIds.length} walls selected` : '1 wall selected'}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {isMultiSelection ? 'Editing multiple walls' : `ID: ${firstWall.id.substring(0, 8)}...`}
        </div>
      </div>

      <div className="space-y-4">
        {/* Wall Type */}
        <div>
          <Label className="text-sm font-medium">Wall Type</Label>
          <Select
            value={currentType || ''}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="mt-1">
              <SelectValue 
                placeholder={allSameType ? undefined : "Mixed types"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="layout">
                Layout Wall (350mm)
              </SelectItem>
              <SelectItem value="zone">
                Zone Wall (250mm)
              </SelectItem>
              <SelectItem value="area">
                Area Wall (150mm)
              </SelectItem>
            </SelectContent>
          </Select>
          {!allSameType && (
            <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Mixed wall types
            </div>
          )}
        </div>

        {/* Thickness */}
        <div>
          <Label className="text-sm font-medium">Thickness</Label>
          <div className="mt-1 text-sm">
            {currentType ? (
              <Badge variant="secondary">
                {WALL_THICKNESS[currentType]}mm
              </Badge>
            ) : (
              <span className="text-muted-foreground">Mixed</span>
            )}
          </div>
        </div>

        {/* Visibility */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Visible</Label>
          <div className="flex items-center gap-2">
            {currentVisibility !== null ? (
              <>
                {currentVisibility ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <Switch
                  checked={currentVisibility}
                  onCheckedChange={handleVisibilityChange}
                />
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Mixed</span>
            )}
          </div>
        </div>

        <Separator />

        {/* Measurements */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-sm font-medium">Total Length</Label>
            <span className="text-sm">{Math.round(totalLength)}px</span>
          </div>
          
          <div className="flex justify-between">
            <Label className="text-sm font-medium">Segments</Label>
            <span className="text-sm">{totalSegments}</span>
          </div>
          
          <div className="flex justify-between">
            <Label className="text-sm font-medium">Nodes</Label>
            <span className="text-sm">{totalNodes}</span>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete {isMultiSelection ? 'Walls' : 'Wall'}
          </Button>
        </div>

        {/* Timestamps (single selection only) */}
        {!isMultiSelection && (
          <>
            <Separator />
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Created: {firstWall.createdAt.toLocaleString()}</div>
              <div>Updated: {firstWall.updatedAt.toLocaleString()}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}