import { cn } from '@/lib/utils'

interface StatusBarProps {
  message?: string
  coordinates?: { x: number; y: number }
  zoom?: number
  selectedCount?: number
  className?: string
}

export function StatusBar({ 
  message = 'Ready', 
  coordinates, 
  zoom, 
  selectedCount = 0,
  className 
}: StatusBarProps) {
  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-1 border-t bg-muted/30 text-sm text-muted-foreground',
      className
    )}>
      <div className="flex items-center gap-4">
        <span>{message}</span>
        {selectedCount > 0 && (
          <span>{selectedCount} item{selectedCount !== 1 ? 's' : ''} selected</span>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {coordinates && (
          <span>
            X: {coordinates.x.toFixed(0)}, Y: {coordinates.y.toFixed(0)}
          </span>
        )}
        {zoom && (
          <span>
            Zoom: {(zoom * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  )
}