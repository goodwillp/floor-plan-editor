import { IconButton } from '@/components/ui/icon-button'
import { ButtonGroup } from '@/components/ui/button-group'
import { iconMappings } from '@/lib/icon-mappings'

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
  return (
    <div className="flex items-center p-2 border-b bg-background">
      {/* File Actions */}
      <ButtonGroup separator>
        <IconButton
          icon={iconMappings.save.icon}
          tooltip={iconMappings.save.tooltip}
          onClick={onSave}
        />
        <IconButton
          icon={iconMappings.load.icon}
          tooltip={iconMappings.load.tooltip}
          onClick={onLoad}
        />
        <IconButton
          icon={iconMappings.export.icon}
          tooltip={iconMappings.export.tooltip}
          onClick={onExport}
        />
      </ButtonGroup>

      {/* Edit Actions */}
      <ButtonGroup separator>
        <IconButton
          icon={iconMappings.undo.icon}
          tooltip={iconMappings.undo.tooltip}
          onClick={onUndo}
        />
        <IconButton
          icon={iconMappings.redo.icon}
          tooltip={iconMappings.redo.tooltip}
          onClick={onRedo}
        />
      </ButtonGroup>

      {/* View Actions */}
      <ButtonGroup>
        <IconButton
          icon={iconMappings.zoomIn.icon}
          tooltip={iconMappings.zoomIn.tooltip}
          onClick={onZoomIn}
        />
        <IconButton
          icon={iconMappings.zoomOut.icon}
          tooltip={iconMappings.zoomOut.tooltip}
          onClick={onZoomOut}
        />
        <IconButton
          icon={iconMappings.zoomActual.icon}
          tooltip="Reset View"
          onClick={onReset}
        />
      </ButtonGroup>
    </div>
  )
}