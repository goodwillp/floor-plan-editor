import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ZoomControlsProps {
  zoomPercentage: number
  canZoomIn: boolean
  canZoomOut: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onResetViewport: () => void
  onFitToContent?: () => void
  className?: string
  showPercentage?: boolean
  vertical?: boolean
}

/**
 * ZoomControls component provides UI controls for zoom and pan functionality
 * Requirements: 12.5
 */
export function ZoomControls({
  zoomPercentage,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onResetViewport,
  onFitToContent,
  className = '',
  showPercentage = true,
  vertical = true
}: ZoomControlsProps) {
  const containerClasses = vertical 
    ? `flex flex-col gap-1 ${className}`
    : `flex flex-row items-center gap-1 ${className}`

  return (
    <div className={containerClasses}>
      {/* Zoom In Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        className="h-8 w-8 p-0"
        aria-label="Zoom In"
        title="Zoom In (Ctrl + Plus)"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      {/* Zoom Percentage Display */}
      {showPercentage && (
        <Badge 
          variant="secondary" 
          className="min-w-[50px] justify-center text-xs cursor-pointer hover:bg-secondary/80"
          onClick={onResetZoom}
          title="Current zoom level (click to reset)"
        >
          {zoomPercentage}%
        </Badge>
      )}

      {/* Zoom Out Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        className="h-8 w-8 p-0"
        aria-label="Zoom Out"
        title="Zoom Out (Ctrl + Minus)"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      {vertical && <Separator className="my-1" />}
      {!vertical && <Separator orientation="vertical" className="mx-1 h-6" />}

      {/* Reset Zoom Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onResetZoom}
        className="h-8 w-8 p-0"
        aria-label="Reset Zoom"
        title="Reset Zoom (Ctrl + 0)"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      {/* Fit to Content Button */}
      {onFitToContent && (
        <Button
          variant="outline"
          size="sm"
          onClick={onFitToContent}
          className="h-8 w-8 p-0"
          aria-label="Fit to Content"
          title="Fit to Content"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      )}

      {/* Reset Viewport Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onResetViewport}
        className="h-8 w-8 p-0"
        aria-label="Reset Viewport"
        title="Reset Viewport"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  )
}

/**
 * Compact zoom controls for limited space
 */
export function CompactZoomControls({
  zoomPercentage = 100,
  canZoomIn = true,
  canZoomOut = true,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
  className = ''
}: {
  zoomPercentage?: number
  canZoomIn?: boolean
  canZoomOut?: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onFitToScreen: () => void
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        className="h-6 w-6 p-0"
        aria-label="Zoom Out"
        title="Zoom Out"
      >
        <Minus className="h-3 w-3" />
      </Button>

      <Badge variant="secondary" className="min-w-[40px] justify-center text-xs">
        {zoomPercentage}%
      </Badge>

      <Button
        variant="outline"
        size="sm"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        className="h-6 w-6 p-0"
        aria-label="Zoom In"
        title="Zoom In"
      >
        <Plus className="h-3 w-3" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-4" />

      <Button
        variant="outline"
        size="sm"
        onClick={onResetZoom}
        className="h-6 w-6 p-0"
        aria-label="Reset Zoom"
        title="Reset Zoom"
      >
        <RotateCcw className="h-3 w-3" />
      </Button>

      {onFitToScreen && (
        <Button
          variant="outline"
          size="sm"
          onClick={onFitToScreen}
          className="h-6 w-6 p-0"
          aria-label="Fit to Screen"
          title="Fit to Screen"
        >
          <Maximize2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

/**
 * Zoom slider control (alternative to buttons)
 */
interface ZoomSliderProps {
  zoom: number
  minZoom: number
  maxZoom: number
  onZoomChange: (zoom: number) => void
  className?: string
}

export function ZoomSlider({
  zoom,
  minZoom,
  maxZoom,
  onZoomChange,
  className = ''
}: ZoomSliderProps) {
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(event.target.value)
    onZoomChange(newZoom)
  }

  const percentage = Math.round(zoom * 100)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onZoomChange(Math.max(minZoom, zoom - 0.1))}
        disabled={zoom <= minZoom}
        className="h-8 w-8 p-0"
        aria-label="Zoom Out"
        title="Zoom Out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      <div className="flex-1">
        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          step={0.1}
          value={zoom}
          onChange={handleSliderChange}
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, hsl(var(--secondary)) 0%, hsl(var(--secondary)) ${((zoom - minZoom) / (maxZoom - minZoom)) * 100}%, hsl(var(--muted)) ${((zoom - minZoom) / (maxZoom - minZoom)) * 100}%, hsl(var(--muted)) 100%)`
          }}
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onZoomChange(Math.min(maxZoom, zoom + 0.1))}
        disabled={zoom >= maxZoom}
        className="h-8 w-8 p-0"
        aria-label="Zoom In"
        title="Zoom In"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      <Badge variant="secondary" className="min-w-[50px] justify-center text-xs">
        {Math.round(zoom * 100)}%
      </Badge>
    </div>
  )
}