import { Lock, Unlock, Eye, EyeOff, RotateCw, Move, Maximize2, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ImageUpload, ImageInfo } from '@/components/ImageUpload'
import { cn } from '@/lib/utils'
import type { ReferenceImageConfig } from '@/lib/ReferenceImageService'

interface ReferenceImagePanelProps {
  // Image state
  hasImage: boolean
  imageInfo: {
    name: string
    size: number
    dimensions: { width: number; height: number }
    type: string
  } | null
  config: ReferenceImageConfig
  isLoading: boolean
  error: string | null
  
  // Image loading
  onImageLoad: (file: File) => Promise<void>
  onImageRemove: () => void
  
  // Configuration
  onConfigUpdate: (config: Partial<ReferenceImageConfig>) => void
  onReset: () => void
  
  // Lock/visibility controls
  onToggleLock: () => void
  onToggleVisibility: () => void
  
  // Transform controls
  onFitToCanvas: (mode: ReferenceImageConfig['fitMode']) => void
  
  className?: string
}

/**
 * ReferenceImagePanel provides comprehensive controls for reference image management
 * Requirements: 13.3, 13.4, 13.5
 */
export function ReferenceImagePanel({
  hasImage,
  imageInfo,
  config,
  isLoading,
  error,
  onImageLoad,
  onImageRemove,
  onConfigUpdate,
  onReset,
  onToggleLock,
  onToggleVisibility,
  onFitToCanvas,
  className = ''
}: ReferenceImagePanelProps) {
  const handleOpacityChange = (value: number[]) => {
    onConfigUpdate({ opacity: value[0] })
  }

  const handleScaleChange = (value: number[]) => {
    onConfigUpdate({ scale: value[0] })
  }

  const handlePositionChange = (axis: 'x' | 'y', value: number[]) => {
    onConfigUpdate({ [axis]: value[0] })
  }

  const handleRotationChange = (value: number[]) => {
    // Convert from degrees to radians
    onConfigUpdate({ rotation: (value[0] * Math.PI) / 180 })
  }

  const rotationDegrees = Math.round((config.rotation * 180) / Math.PI)

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          Reference Image
          {hasImage && (
            <div className="flex items-center gap-1">
              <Badge variant={config.locked ? 'secondary' : 'outline'} className="text-xs">
                {config.locked ? 'Locked' : 'Unlocked'}
              </Badge>
              <Badge variant={config.visible ? 'default' : 'secondary'} className="text-xs">
                {config.visible ? 'Visible' : 'Hidden'}
              </Badge>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Image Upload */}
        <ImageUpload
          onImageLoad={onImageLoad}
          onImageRemove={onImageRemove}
          hasImage={hasImage}
          isLoading={isLoading}
          error={error}
        />

        {/* Image Info */}
        {imageInfo && (
          <ImageInfo imageInfo={imageInfo} />
        )}

        {hasImage && (
          <>
            <Separator />

            {/* Lock and Visibility Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="image-lock" className="text-sm font-medium">
                  Lock Position
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleLock}
                    className="h-8 w-8 p-0"
                    title={config.locked ? 'Unlock image movement' : 'Lock image position'}
                  >
                    {config.locked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Unlock className="h-4 w-4" />
                    )}
                  </Button>
                  <Switch
                    id="image-lock"
                    checked={config.locked}
                    onCheckedChange={() => onToggleLock()}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="image-visibility" className="text-sm font-medium">
                  Visibility
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleVisibility}
                    className="h-8 w-8 p-0"
                    title={config.visible ? 'Hide image' : 'Show image'}
                  >
                    {config.visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Switch
                    id="image-visibility"
                    checked={config.visible}
                    onCheckedChange={() => onToggleVisibility()}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Transform Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Transform</Label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReset}
                    className="h-8 w-8 p-0"
                    title="Reset to default"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onFitToCanvas('contain')}>
                        Fit to Canvas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onFitToCanvas('cover')}>
                        Fill Canvas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onFitToCanvas('none')}>
                        Center Image
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Opacity Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Opacity</Label>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(config.opacity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[config.opacity]}
                  onValueChange={handleOpacityChange}
                  max={1}
                  min={0}
                  step={0.01}
                  className="w-full"
                />
              </div>

              {/* Scale Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Scale</Label>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(config.scale * 100)}%
                  </span>
                </div>
                <Slider
                  value={[config.scale]}
                  onValueChange={handleScaleChange}
                  max={5}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                  disabled={config.locked}
                />
              </div>

              {/* Position Controls */}
              <div className="space-y-2">
                <Label className="text-xs">Position</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">X</span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(config.x)}
                      </span>
                    </div>
                    <Slider
                      value={[config.x]}
                      onValueChange={(value) => handlePositionChange('x', value)}
                      max={1000}
                      min={-1000}
                      step={1}
                      className="w-full"
                      disabled={config.locked}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Y</span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(config.y)}
                      </span>
                    </div>
                    <Slider
                      value={[config.y]}
                      onValueChange={(value) => handlePositionChange('y', value)}
                      max={1000}
                      min={-1000}
                      step={1}
                      className="w-full"
                      disabled={config.locked}
                    />
                  </div>
                </div>
              </div>

              {/* Rotation Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Rotation</Label>
                  <span className="text-xs text-muted-foreground">
                    {rotationDegrees}°
                  </span>
                </div>
                <Slider
                  value={[rotationDegrees]}
                  onValueChange={handleRotationChange}
                  max={360}
                  min={-360}
                  step={1}
                  className="w-full"
                  disabled={config.locked}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Compact reference image controls for toolbar
 */
interface CompactReferenceImageControlsProps {
  hasImage: boolean
  isLocked: boolean
  isVisible: boolean
  onToggleLock: () => void
  onToggleVisibility: () => void
  className?: string
}

export function CompactReferenceImageControls({
  hasImage,
  isLocked,
  isVisible,
  onToggleLock,
  onToggleVisibility,
  className = ''
}: CompactReferenceImageControlsProps) {
  if (!hasImage) return null

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button
        variant={isLocked ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleLock}
        className="h-8 w-8 p-0"
        aria-label={isLocked ? 'Unlock Reference Image' : 'Lock Reference Image'}
        title={isLocked ? 'Unlock image movement' : 'Lock image position'}
      >
        {isLocked ? (
          <Lock className="h-4 w-4" />
        ) : (
          <Unlock className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant={isVisible ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleVisibility}
        className="h-8 w-8 p-0"
        aria-label={isVisible ? 'Hide Reference Image' : 'Show Reference Image'}
        title={isVisible ? 'Hide reference image' : 'Show reference image'}
      >
        {isVisible ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}