import { OptimizedIconButton, IconButtonGroup } from '@/components/ui/optimized-icon-button'
import { iconMappings } from '@/lib/icon-mappings'
import { useCallback } from 'react'

interface MenuBarProps {
  onSave?: () => void
  onLoad?: () => void
  onExport?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onReset?: () => void
}

export function MenuBar({
  onSave,
  onLoad,
  onExport,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onReset
}: MenuBarProps) {
  // Create stable handlers using useCallback with proper dependencies
  const saveHandler = useCallback(() => {
    onSave?.()
  }, [onSave])
  
  const loadHandler = useCallback(() => {
    onLoad?.()
  }, [onLoad])
  
  const exportHandler = useCallback(() => {
    onExport?.()
  }, [onExport])
  
  const undoHandler = useCallback(() => {
    onUndo?.()
  }, [onUndo])
  
  const redoHandler = useCallback(() => {
    onRedo?.()
  }, [onRedo])
  
  const zoomInHandler = useCallback(() => {
    onZoomIn?.()
  }, [onZoomIn])
  
  const zoomOutHandler = useCallback(() => {
    onZoomOut?.()
  }, [onZoomOut])
  
  const resetHandler = useCallback(() => {
    onReset?.()
  }, [onReset])
  return (
    <div className="flex items-center p-2 border-b bg-background" role="toolbar" aria-label="Main menu">
      {/* File Actions */}
      <IconButtonGroup spacing="sm" aria-label="File operations">
        <OptimizedIconButton
          icon={iconMappings.save.icon}
          tooltip={iconMappings.save.tooltip}
          onClick={saveHandler}
          size="sm"
          aria-label="Save floor plan (Ctrl+S)"
        />
        <OptimizedIconButton
          icon={iconMappings.load.icon}
          tooltip={iconMappings.load.tooltip}
          onClick={loadHandler}
          size="sm"
          aria-label="Load floor plan (Ctrl+O)"
        />
        <OptimizedIconButton
          icon={iconMappings.export.icon}
          tooltip={iconMappings.export.tooltip}
          onClick={exportHandler}
          size="sm"
          aria-label="Export floor plan (Ctrl+E)"
        />
      </IconButtonGroup>

      <div className="mx-2 h-6 w-px bg-border" role="separator" />

      {/* Edit Actions */}
      <IconButtonGroup spacing="sm" aria-label="Edit operations">
        <OptimizedIconButton
          icon={iconMappings.undo.icon}
          tooltip={iconMappings.undo.tooltip}
          onClick={undoHandler}
          size="sm"
          aria-label="Undo (Ctrl+Z)"
        />
        <OptimizedIconButton
          icon={iconMappings.redo.icon}
          tooltip={iconMappings.redo.tooltip}
          onClick={redoHandler}
          size="sm"
          aria-label="Redo (Ctrl+Y)"
        />
      </IconButtonGroup>

      <div className="mx-2 h-6 w-px bg-border" role="separator" />

      {/* View Actions */}
      <IconButtonGroup spacing="sm" aria-label="View controls">
        <OptimizedIconButton
          icon={iconMappings.zoomIn.icon}
          tooltip={iconMappings.zoomIn.tooltip}
          onClick={zoomInHandler}
          size="sm"
          aria-label="Zoom in (Ctrl++)"
        />
        <OptimizedIconButton
          icon={iconMappings.zoomOut.icon}
          tooltip={iconMappings.zoomOut.tooltip}
          onClick={zoomOutHandler}
          size="sm"
          aria-label="Zoom out (Ctrl+-)"
        />
        <OptimizedIconButton
          icon={iconMappings.zoomActual.icon}
          tooltip="Reset View"
          onClick={resetHandler}
          size="sm"
          aria-label="Reset view (Home)"
        />
      </IconButtonGroup>
    </div>
  )
}