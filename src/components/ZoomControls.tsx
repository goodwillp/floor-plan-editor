import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
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
    <TooltipProvider>
      <div className={containerClasses}>
        {/* Zoom In Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onZoomIn}
              disabled={!canZoomIn}
              className="h-8 w-8 p-0"
              aria-label="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={vertical ? 'left' : 'top'}>
            <p>Zoom In (Ctrl + Plus)</p>
          </TooltipContent>
        </Tooltip>

        {/* Zoom Percentage Display */}
        {showPercentage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="secondary" 
                className="min-w-[50px] justify-center text-xs cursor-pointer hover:bg-secondary/80"
                onClick={onResetZoom}
              >
                {zoomPercentage}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent side={vertical ? 'left' : 'top'}>
              <p>Current zoom level (click to reset)</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Zoom Out Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onZoomOut}
              disabled={!canZoomOut}
              className="h-8 w-8 p-0"
              aria-label="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={vertical ? 'left' : 'top'}>
            <p>Zoom Out (Ctrl + Minus)</p>
          </TooltipContent>
        </Tooltip>

        {vertical && <Separator className="my-1" />}
        {!vertical && <Separator orientation="vertical" className="mx-1 h-6" />}

        {/* Reset Zoom Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onResetZoom}
              className="h-8 w-8 p-0"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={vertical ? 'left' : 'top'}>
            <p>Reset Zoom (Ctrl + 0)</p>
          </TooltipContent>
        </Tooltip>

        {/* Fit to Content Button */}
        {onFitToContent && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onFitToContent}
                className="h-8 w-8 p-0"
                aria-label="Fit to Content"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={vertical ? 'left' : 'top'}>
              <p>Fit to Content (Ctrl + F)</p>
            </TooltipContent>
          </Tooltip>
        )}

        {vertical && <Separator className="my-1" />}
        {!vertical && <Separator orientation="vertical" className="mx-1 h-6" />}

        {/* Reset Viewport Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onResetViewport}
              className="h-8 w-8 p-0"
              aria-label="Reset Viewport"
            >
              <div className="flex items-center justify-center">
                <span className="text-xs font-bold">⌂</span>
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent side={vertical ? 'left' : 'top'}>
            <p>Reset View (Ctrl + Home)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
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
    <TooltipProvider>
      <div className={cn("flex items-center gap-1", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onZoomIn}
              disabled={!canZoomIn}
              className="h-6 w-6 p-0"
              aria-label="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Zoom In (Ctrl + Plus)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="secondary" 
              className="min-w-[50px] justify-center text-xs cursor-pointer hover:bg-secondary/80"
              onClick={onResetZoom}
            >
              {zoomPercentage}%
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Current zoom level (click to reset)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onZoomOut}
              disabled={!canZoomOut}
              className="h-6 w-6 p-0"
              aria-label="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Zoom Out (Ctrl + Minus)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onResetZoom}
              className="h-6 w-6 p-0"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reset Zoom (Ctrl + 0)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onFitToScreen}
              className="h-6 w-6 p-0"
              aria-label="Fit to Content"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Fit to Content (Ctrl + F)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
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
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        <ZoomOut className="h-4 w-4 text-muted-foreground" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.1}
              value={zoom}
              onChange={handleSliderChange}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Zoom: {percentage}%</p>
          </TooltipContent>
        </Tooltip>
        
        <ZoomIn className="h-4 w-4 text-muted-foreground" />
        
        <Badge variant="outline" className="min-w-[50px] justify-center text-xs">
          {percentage}%
        </Badge>
      </div>
    </TooltipProvider>
  )
}