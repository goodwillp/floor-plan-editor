import { IconButton } from '@/components/ui/icon-button'
import { ToggleIconButton } from '@/components/ui/toggle-icon-button'
import { ButtonGroup } from '@/components/ui/button-group'
import { CompactZoomControls } from '@/components/ZoomControls'
import { CompactImageUpload } from '@/components/ImageUpload'
import { CompactReferenceImageControls } from '@/components/ReferenceImagePanel'
import { iconMappings } from '@/lib/icon-mappings'

import type { WallTypeString } from '@/lib/types'

export type Tool = 'select' | 'draw' | 'delete'

interface ToolPaletteProps {
  activeWallType: WallTypeString
  activeTool: Tool
  gridVisible: boolean
  // Zoom controls
  zoom?: number
  zoomPercentage?: number
  canZoomIn?: boolean
  canZoomOut?: boolean
  // Reference image controls
  hasReferenceImage?: boolean
  referenceImageLocked?: boolean
  referenceImageVisible?: boolean
  onWallTypeChange: (type: WallTypeString) => void
  onToolChange: (tool: Tool) => void
  onGridToggle: () => void
  onReferenceImageLoad?: (file: File) => Promise<void>
  // Zoom functions
  onZoomIn?: () => void
  onZoomOut?: () => void
  onResetZoom?: () => void
  onResetViewport?: () => void
  // Reference image functions
  onReferenceImageToggleLock?: () => void
  onReferenceImageToggleVisibility?: () => void
}

export function ToolPalette({
  activeWallType,
  activeTool,
  gridVisible,
  zoom = 1,
  zoomPercentage = 100,
  canZoomIn = true,
  canZoomOut = true,
  hasReferenceImage = false,
  referenceImageLocked = true,
  referenceImageVisible = true,
  onWallTypeChange,
  onToolChange,
  onGridToggle,
  onReferenceImageLoad,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onReferenceImageToggleLock,
  onReferenceImageToggleVisibility
}: ToolPaletteProps) {
  return (
    <div className="flex items-center p-2 border-b bg-background">
      {/* Wall Types */}
      <ButtonGroup separator>
        <IconButton
          icon={iconMappings.layoutWall.icon}
          tooltip={iconMappings.layoutWall.tooltip}
          isActive={activeWallType === 'layout'}
          onClick={() => onWallTypeChange('layout')}
        />
        <IconButton
          icon={iconMappings.zoneWall.icon}
          tooltip={iconMappings.zoneWall.tooltip}
          isActive={activeWallType === 'zone'}
          onClick={() => onWallTypeChange('zone')}
        />
        <IconButton
          icon={iconMappings.areaWall.icon}
          tooltip={iconMappings.areaWall.tooltip}
          isActive={activeWallType === 'area'}
          onClick={() => onWallTypeChange('area')}
        />
      </ButtonGroup>

      {/* Drawing Tools */}
      <ButtonGroup separator>
        <IconButton
          icon={iconMappings.select.icon}
          tooltip={iconMappings.select.tooltip}
          isActive={activeTool === 'select'}
          onClick={() => onToolChange('select')}
        />
        <IconButton
          icon={iconMappings.drawWall.icon}
          tooltip={iconMappings.drawWall.tooltip}
          isActive={activeTool === 'draw'}
          onClick={() => onToolChange('draw')}
        />
        <IconButton
          icon={iconMappings.delete.icon}
          tooltip={iconMappings.delete.tooltip}
          isActive={activeTool === 'delete'}
          onClick={() => onToolChange('delete')}
        />
      </ButtonGroup>

      {/* View Tools */}
      <ButtonGroup>
        <ToggleIconButton
          icon={iconMappings.grid.icon}
          tooltip={iconMappings.grid.tooltip}
          isToggled={gridVisible}
          onToggle={onGridToggle}
          activeTooltip="Hide Grid"
          inactiveTooltip="Show Grid"
        />
        {onReferenceImageLoad && (
          <CompactImageUpload
            onImageLoad={onReferenceImageLoad}
            hasImage={hasReferenceImage}
          />
        )}
        <CompactReferenceImageControls
          hasImage={hasReferenceImage}
          isLocked={referenceImageLocked}
          isVisible={referenceImageVisible}
          onToggleLock={onReferenceImageToggleLock || (() => {})}
          onToggleVisibility={onReferenceImageToggleVisibility || (() => {})}
        />
      </ButtonGroup>

      {/* Zoom Controls */}
      {(onZoomIn || onZoomOut || onResetZoom) && (
        <ButtonGroup>
          <CompactZoomControls
            zoom={zoom}
            zoomPercentage={zoomPercentage}
            canZoomIn={canZoomIn}
            canZoomOut={canZoomOut}
            onZoomIn={onZoomIn || (() => {})}
            onZoomOut={onZoomOut || (() => {})}
            onResetZoom={onResetZoom || (() => {})}
            onFitToScreen={() => {}} // Not implemented in this context
            className="ml-2"
          />
        </ButtonGroup>
      )}
    </div>
  )
}