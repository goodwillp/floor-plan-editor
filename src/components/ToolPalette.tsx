import * as React from 'react'
import { SimpleIconButton } from '@/components/ui/simple-icon-button'
import { ToggleIconButton } from '@/components/ui/toggle-icon-button'
import { ButtonGroup } from '@/components/ui/button-group'
import { CompactZoomControls } from '@/components/ZoomControls'
import { CompactImageUpload } from '@/components/ImageUpload'
import { CompactReferenceImageControls } from '@/components/ReferenceImagePanel'
import { iconMappings } from '@/lib/icon-mappings'

import type { WallTypeString } from '@/lib/types'

export type Tool = 'select' | 'draw' | 'delete'

interface ToolPaletteProps {
  activeWallType: WallTypeString | null
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
  onWallTypeChange: (type: WallTypeString | null) => void
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
  // Create stable handlers to prevent infinite re-renders
  const handleLayoutWallClick = React.useCallback(() => onWallTypeChange(activeWallType === 'layout' ? null : 'layout'), [onWallTypeChange, activeWallType])
  const handleZoneWallClick = React.useCallback(() => onWallTypeChange(activeWallType === 'zone' ? null : 'zone'), [onWallTypeChange, activeWallType])
  const handleAreaWallClick = React.useCallback(() => onWallTypeChange(activeWallType === 'area' ? null : 'area'), [onWallTypeChange, activeWallType])
  
  const handleSelectToolClick = React.useCallback(() => onToolChange('select'), [onToolChange])
  const handleDrawToolClick = React.useCallback(() => onToolChange('draw'), [onToolChange])
  const handleDeleteToolClick = React.useCallback(() => onToolChange('delete'), [onToolChange])
  
  // Create stable fallback handlers
  const handleZoomInClick = React.useCallback(() => onZoomIn?.(), [onZoomIn])
  const handleZoomOutClick = React.useCallback(() => onZoomOut?.(), [onZoomOut])
  const handleResetZoomClick = React.useCallback(() => onResetZoom?.(), [onResetZoom])
  const handleToggleLockClick = React.useCallback(() => onReferenceImageToggleLock?.(), [onReferenceImageToggleLock])
  const handleToggleVisibilityClick = React.useCallback(() => onReferenceImageToggleVisibility?.(), [onReferenceImageToggleVisibility])
  const noopHandler = React.useCallback(() => {}, [])
  return (
    <div className="flex items-center p-2 border-b bg-background">
      {/* Wall Types */}
      <ButtonGroup separator>
        <SimpleIconButton
          icon={iconMappings.layoutWall.icon}
          isActive={activeWallType === 'layout'}
          onClick={handleLayoutWallClick}
          aria-label={iconMappings.layoutWall.tooltip}
        />
        <SimpleIconButton
          icon={iconMappings.zoneWall.icon}
          isActive={activeWallType === 'zone'}
          onClick={handleZoneWallClick}
          aria-label={iconMappings.zoneWall.tooltip}
        />
        <SimpleIconButton
          icon={iconMappings.areaWall.icon}
          isActive={activeWallType === 'area'}
          onClick={handleAreaWallClick}
          aria-label={iconMappings.areaWall.tooltip}
        />
      </ButtonGroup>

      {/* Drawing Tools */}
      <ButtonGroup separator>
        <SimpleIconButton
          icon={iconMappings.select.icon}
          isActive={activeTool === 'select'}
          onClick={handleSelectToolClick}
          aria-label={iconMappings.select.tooltip}
        />
        <SimpleIconButton
          icon={iconMappings.drawWall.icon}
          isActive={activeTool === 'draw'}
          onClick={handleDrawToolClick}
          aria-label={iconMappings.drawWall.tooltip}
        />
        <SimpleIconButton
          icon={iconMappings.delete.icon}
          isActive={activeTool === 'delete'}
          onClick={handleDeleteToolClick}
          aria-label={iconMappings.delete.tooltip}
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
          onToggleLock={handleToggleLockClick}
          onToggleVisibility={handleToggleVisibilityClick}
        />
      </ButtonGroup>

      {/* Zoom Controls */}
      {(onZoomIn || onZoomOut || onResetZoom) && (
        <ButtonGroup>
          <CompactZoomControls
            zoomPercentage={zoomPercentage}
            canZoomIn={canZoomIn}
            canZoomOut={canZoomOut}
            onZoomIn={handleZoomInClick}
            onZoomOut={handleZoomOutClick}
            onResetZoom={handleResetZoomClick}
            onFitToScreen={noopHandler}
            className="ml-2"
          />
        </ButtonGroup>
      )}
    </div>
  )
}