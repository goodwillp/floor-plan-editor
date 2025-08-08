import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { WallPropertiesPanel } from './WallPropertiesPanel'
import { ProximityMergingPanel } from './ProximityMergingPanel'
import { ReferenceImagePanel } from './ReferenceImagePanel'
import { ErrorPanel } from './ErrorPanel'
import { 
  ChevronLeft, 
  ChevronDown,
  Layers, 
  Settings, 
  Image,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Merge,
  Shield,
  Crosshair,
  Shapes
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WallTypeString } from '@/lib/types'

type SidebarPanel = 'layers' | 'properties' | 'reference' | 'proximity' | 'error' | null

interface SidebarProps {
  className?: string
  selectedWallIds?: string[]
  wallProperties?: Array<{
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
  onWallTypeChange?: (wallIds: string[], newType: WallTypeString) => void
  onWallVisibilityChange?: (wallIds: string[], visible: boolean) => void
  onWallDelete?: (wallIds: string[]) => void
  onSelectionClear?: () => void
  // Proximity merging props
  proximityMergingEnabled?: boolean
  proximityThreshold?: number
  activeMerges?: any[]
  mergeStats?: any
  onProximityMergingEnabledChange?: (enabled: boolean) => void
  onProximityThresholdChange?: (threshold: number) => void
  onProximityMergingRefresh?: () => void
  onProximityMergingClearAll?: () => void
  // Reference image props
  hasReferenceImage?: boolean
  // Visibility states for layer toggles
  wallsVisible?: boolean
    wallLayerVisibility?: { layout: boolean; zone: boolean; area: boolean }
    wallLayerDebug?: {
      layout: { guides: boolean; shell: boolean }
      zone: { guides: boolean; shell: boolean }
      area: { guides: boolean; shell: boolean }
    }
  gridVisible?: boolean
  referenceImageVisible?: boolean
  referenceImageLocked?: boolean
  referenceImageInfo?: {
    name: string
    size: number
    dimensions: { width: number; height: number }
    type: string
  } | null
  referenceImageConfig?: any
  referenceImageLoading?: boolean
  referenceImageError?: string | null
  // Reference image handlers
  onReferenceImageLoad?: (file: File) => Promise<void>
  onReferenceImageRemove?: () => void
  onReferenceImageConfigUpdate?: (config: any) => void
  onReferenceImageReset?: () => void
  onReferenceImageToggleLock?: () => void
  onReferenceImageToggleVisibility?: () => void
  onReferenceImageFitToCanvas?: (mode: any) => void
  // Layer toggle handlers
  onGridToggle?: () => void
    onWallsToggle?: () => void
    onWallLayerVisibilityChange?: (layer: 'layout' | 'zone' | 'area', visible: boolean) => void
    onToggleGuides?: (scope: 'all' | 'layout' | 'zone' | 'area') => void
    onToggleShell?: (scope: 'all' | 'layout' | 'zone' | 'area') => void
  // Error handling props
  errorLog?: any[]
  memoryInfo?: any
  isRecovering?: boolean
  errorStats?: any
  onClearErrors?: () => void
  onSetMemoryThresholds?: (warning: number, critical: number) => void
}

export function Sidebar({ 
  className,
  selectedWallIds = [],
  wallProperties = null,
  onWallTypeChange,
  onWallVisibilityChange,
  onWallDelete,
  onSelectionClear,
  proximityMergingEnabled = false,
  proximityThreshold = 15,
  activeMerges = [],
  mergeStats = { totalMerges: 0, averageDistance: 0, mergesByType: {} },
  onProximityMergingEnabledChange,
  onProximityThresholdChange,
  onProximityMergingRefresh,
  onProximityMergingClearAll,
  // Reference image props
  hasReferenceImage = false,
  // Layer visibility states
  wallsVisible = true,
    wallLayerVisibility = { layout: true, zone: true, area: true },
    wallLayerDebug,
  gridVisible = false,
  referenceImageVisible = true,
  referenceImageLocked = true,
  referenceImageInfo = null,
  referenceImageConfig = null,
  referenceImageLoading = false,
  referenceImageError = null,
  onReferenceImageLoad,
  onReferenceImageRemove,
  onReferenceImageConfigUpdate,
  onReferenceImageReset,
  onReferenceImageToggleLock,
  onReferenceImageToggleVisibility,
  onReferenceImageFitToCanvas,
  onGridToggle,
  onWallsToggle,
    onWallLayerVisibilityChange,
    onToggleGuides,
    onToggleShell,
  // Error handling props
  errorLog = [],
  memoryInfo = null,
  isRecovering = false,
  errorStats = {},
  onClearErrors
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  // Default to Layers panel on load
  const [activePanel, setActivePanel] = useState<SidebarPanel>('layers')
  // Collapsible children under Walls
  const [showWallChildren, setShowWallChildren] = useState(true)

  // Resizable sidebar state
  const MIN_WIDTH = 220
  const MAX_WIDTH = 560
  const [sidebarWidth, setSidebarWidth] = useState<number>(256)
  const isResizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(256)

  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only start resize when not collapsed
    if (isCollapsed) return
    isResizingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = sidebarWidth
    // Add listeners on window to capture drag outside handle
    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return
      const delta = startXRef.current - ev.clientX
      const proposed = startWidthRef.current + delta
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, proposed))
      setSidebarWidth(next)
    }
    const handleMouseUp = () => {
      isResizingRef.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.classList.remove('select-none', 'cursor-col-resize')
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    document.body.classList.add('select-none', 'cursor-col-resize')
  }, [isCollapsed, sidebarWidth])

  const togglePanel = (panel: SidebarPanel) => {
    if (activePanel === panel) {
      setActivePanel(null)
    } else {
      setActivePanel(panel)
      if (isCollapsed) {
        setIsCollapsed(false)
      }
    }
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
    if (!isCollapsed) {
      setActivePanel(null)
    }
  }

  return (
    <div
      className={cn(
        'relative flex h-full border-l bg-background transition-all duration-200',
        isCollapsed ? 'w-12' : '',
        className
      )}
      style={!isCollapsed ? { width: `${sidebarWidth}px` } : undefined}
    >
      {/* Resize handle (left edge) */}
      {!isCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={handleResizeStart}
          className={cn(
            'absolute left-0 top-0 h-full w-1 cursor-col-resize',
            'bg-transparent hover:bg-border'
          )}
          title="Resize sidebar"
        />
      )}
      {/* Icon Bar */}
      <div className="flex flex-col w-12 border-r bg-muted/30">
        <div className="flex flex-col gap-1 p-2">
          <Button
            variant={activePanel === 'layers' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => togglePanel('layers')}
            className="aspect-square"
            title="Layers"
          >
            <Layers className="h-4 w-4" />
          </Button>

          <Button
            variant={activePanel === 'properties' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => togglePanel('properties')}
            className="aspect-square"
            title="Properties"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button
            variant={activePanel === 'reference' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => togglePanel('reference')}
            className="aspect-square"
            title="Reference Images"
          >
            <Image className="h-4 w-4" />
          </Button>

          <Button
            variant={activePanel === 'proximity' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => togglePanel('proximity')}
            className="aspect-square"
            title="Proximity Merging"
          >
            <Merge className="h-4 w-4" />
          </Button>

          <Button
            variant={activePanel === 'error' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => togglePanel('error')}
            className="aspect-square"
            title="Error Monitoring"
          >
            <Shield className="h-4 w-4" />
          </Button>
        </div>

        {/* Collapse Toggle */}
        <div className="mt-auto p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="aspect-square"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', {
              'rotate-180': isCollapsed
            })} />
          </Button>
        </div>
      </div>

      {/* Panel Content */}
      {!isCollapsed && activePanel && (
        <div className="flex-1 p-4">
          {activePanel === 'layers' && (
            <div>
              <h3 className="font-semibold mb-3">Layers</h3>
              <div className="space-y-2">
                <div className="p-2 rounded border">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setShowWallChildren(prev => !prev)}
                      className="flex items-center gap-1 text-sm font-medium hover:opacity-80"
                      aria-expanded={showWallChildren}
                      aria-controls="walls-children"
                    >
                      <ChevronDown className={cn('h-4 w-4 transition-transform', { 'rotate-[-90deg]': !showWallChildren })} />
                      <span>Walls</span>
                    </button>
                    <div className="ml-auto flex items-center gap-1">
                      {/* Parent guides toggle (applies to all wall types) */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onToggleGuides?.('all')}
                        title="Toggle guides for all wall types"
                        aria-label="Toggle guides for all wall types"
                        disabled={!wallsVisible}
                      >
                        <Crosshair className={cn('h-3 w-3', {
                          'opacity-100': (wallLayerDebug?.layout.guides || wallLayerDebug?.zone.guides || wallLayerDebug?.area.guides) && wallsVisible,
                          'opacity-40': !(wallLayerDebug?.layout.guides || wallLayerDebug?.zone.guides || wallLayerDebug?.area.guides)
                        })} />
                      </Button>
                      {/* Parent shell toggle (applies to all wall types) */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onToggleShell?.('all')}
                        title="Toggle shell outline for all wall types"
                        aria-label="Toggle shell outline for all wall types"
                        disabled={!wallsVisible}
                      >
                        <Shapes className={cn('h-3 w-3', {
                          'opacity-100': (wallLayerDebug?.layout.shell || wallLayerDebug?.zone.shell || wallLayerDebug?.area.shell) && wallsVisible,
                          'opacity-40': !(wallLayerDebug?.layout.shell || wallLayerDebug?.zone.shell || wallLayerDebug?.area.shell)
                        })} />
                      </Button>
                      {/* Parent visibility toggle */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={onWallsToggle}
                        title={wallsVisible ? 'Hide all walls' : 'Show all walls'}
                        aria-label={wallsVisible ? 'Hide all walls' : 'Show all walls'}
                      >
                        {wallsVisible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {showWallChildren && (
                  <div id="walls-children" className="mt-2 space-y-2">
                    {/* Layout row */}
                    <div className="rounded px-2 py-1 border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Layout</span>
                        <div className="ml-auto flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onToggleGuides?.('layout')}
                            disabled={!wallsVisible}
                            title={wallLayerDebug?.layout.guides ? 'Hide guides' : 'Show guides'}
                            aria-label={wallLayerDebug?.layout.guides ? 'Hide guides' : 'Show guides'}
                          >
                            <Crosshair className={cn('h-3 w-3', wallLayerDebug?.layout.guides ? 'opacity-100' : 'opacity-40')} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onToggleShell?.('layout')}
                            disabled={!wallsVisible}
                            title={wallLayerDebug?.layout.shell ? 'Hide shell outline' : 'Show shell outline'}
                            aria-label={wallLayerDebug?.layout.shell ? 'Hide shell outline' : 'Show shell outline'}
                          >
                            <Shapes className={cn('h-3 w-3', wallLayerDebug?.layout.shell ? 'opacity-100' : 'opacity-40')} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onWallLayerVisibilityChange?.('layout', !(wallLayerVisibility?.layout ?? true))}
                            title={(wallLayerVisibility?.layout ?? true) ? 'Hide layout walls' : 'Show layout walls'}
                            aria-label={(wallLayerVisibility?.layout ?? true) ? 'Hide layout walls' : 'Show layout walls'}
                            disabled={!wallsVisible}
                          >
                            {(wallLayerVisibility?.layout ?? true) ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    {/* Zone row */}
                    <div className="rounded px-2 py-1 border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Zone</span>
                        <div className="ml-auto flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onToggleGuides?.('zone')}
                            disabled={!wallsVisible}
                            title={wallLayerDebug?.zone.guides ? 'Hide guides' : 'Show guides'}
                            aria-label={wallLayerDebug?.zone.guides ? 'Hide guides' : 'Show guides'}
                          >
                            <Crosshair className={cn('h-3 w-3', wallLayerDebug?.zone.guides ? 'opacity-100' : 'opacity-40')} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onToggleShell?.('zone')}
                            disabled={!wallsVisible}
                            title={wallLayerDebug?.zone.shell ? 'Hide shell outline' : 'Show shell outline'}
                            aria-label={wallLayerDebug?.zone.shell ? 'Hide shell outline' : 'Show shell outline'}
                          >
                            <Shapes className={cn('h-3 w-3', wallLayerDebug?.zone.shell ? 'opacity-100' : 'opacity-40')} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onWallLayerVisibilityChange?.('zone', !(wallLayerVisibility?.zone ?? true))}
                            title={(wallLayerVisibility?.zone ?? true) ? 'Hide zone walls' : 'Show zone walls'}
                            aria-label={(wallLayerVisibility?.zone ?? true) ? 'Hide zone walls' : 'Show zone walls'}
                            disabled={!wallsVisible}
                          >
                            {(wallLayerVisibility?.zone ?? true) ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    {/* Area row */}
                    <div className="rounded px-2 py-1 border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Area</span>
                        <div className="ml-auto flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onToggleGuides?.('area')}
                            disabled={!wallsVisible}
                            title={wallLayerDebug?.area.guides ? 'Hide guides' : 'Show guides'}
                            aria-label={wallLayerDebug?.area.guides ? 'Hide guides' : 'Show guides'}
                          >
                            <Crosshair className={cn('h-3 w-3', wallLayerDebug?.area.guides ? 'opacity-100' : 'opacity-40')} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onToggleShell?.('area')}
                            disabled={!wallsVisible}
                            title={wallLayerDebug?.area.shell ? 'Hide shell outline' : 'Show shell outline'}
                            aria-label={wallLayerDebug?.area.shell ? 'Hide shell outline' : 'Show shell outline'}
                          >
                            <Shapes className={cn('h-3 w-3', wallLayerDebug?.area.shell ? 'opacity-100' : 'opacity-40')} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onWallLayerVisibilityChange?.('area', !(wallLayerVisibility?.area ?? true))}
                            title={(wallLayerVisibility?.area ?? true) ? 'Hide area walls' : 'Show area walls'}
                            aria-label={(wallLayerVisibility?.area ?? true) ? 'Hide area walls' : 'Show area walls'}
                            disabled={!wallsVisible}
                          >
                            {(wallLayerVisibility?.area ?? true) ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">Grid</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={onGridToggle}
                    title={gridVisible ? 'Hide grid' : 'Show grid'}
                    aria-label={gridVisible ? 'Hide grid' : 'Show grid'}
                  >
                    {gridVisible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <div className={cn("flex items-center justify-between p-2 rounded border", !hasReferenceImage && 'opacity-50') }>
                  <span className="text-sm">Reference</span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant={referenceImageLocked ? 'default' : 'outline'}
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={onReferenceImageToggleLock}
                      title={hasReferenceImage ? (referenceImageLocked ? 'Unlock image movement' : 'Lock image position') : 'No reference image loaded'}
                      aria-label={hasReferenceImage ? (referenceImageLocked ? 'Unlock Reference Image' : 'Lock Reference Image') : 'Reference image unavailable'}
                      disabled={!hasReferenceImage}
                    >
                      {referenceImageLocked ? (
                        <Lock className="h-3 w-3" />
                      ) : (
                        <Unlock className="h-3 w-3" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={onReferenceImageToggleVisibility}
                      title={hasReferenceImage ? (referenceImageVisible ? 'Hide reference image' : 'Show reference image') : 'No reference image loaded'}
                      aria-label={hasReferenceImage ? (referenceImageVisible ? 'Hide reference image' : 'Show reference image') : 'Reference image unavailable'}
                      disabled={!hasReferenceImage}
                    >
                      {referenceImageVisible ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'properties' && (
            <WallPropertiesPanel
              selectedWallIds={selectedWallIds}
              wallProperties={wallProperties}
              onWallTypeChange={onWallTypeChange || (() => {})}
              onWallVisibilityChange={onWallVisibilityChange || (() => {})}
              onWallDelete={onWallDelete || (() => {})}
              onSelectionClear={onSelectionClear || (() => {})}
            />
          )}

          {activePanel === 'reference' && (
            <div>
              <h3 className="font-semibold mb-3">Reference Images</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full">
                  Load Image
                </Button>
                <div className="text-sm text-muted-foreground">
                  No reference images loaded
                </div>
              </div>
            </div>
          )}

          {activePanel === 'proximity' && (
            <ProximityMergingPanel
              isEnabled={proximityMergingEnabled}
              proximityThreshold={proximityThreshold}
              activeMerges={activeMerges}
              mergeStats={mergeStats}
              onEnabledChange={onProximityMergingEnabledChange || (() => {})}
              onThresholdChange={onProximityThresholdChange || (() => {})}
              onRefresh={onProximityMergingRefresh || (() => {})}
              onClearAll={onProximityMergingClearAll || (() => {})}
            />
          )}

          {activePanel === 'reference' && (
            <ReferenceImagePanel
              hasImage={hasReferenceImage}
              imageInfo={referenceImageInfo}
              config={referenceImageConfig || { opacity: 0.7, scale: 1, x: 0, y: 0, locked: true, visible: true, rotation: 0, fitMode: 'none' }}
              isLoading={referenceImageLoading}
              error={referenceImageError}
              onImageLoad={onReferenceImageLoad || (async () => {})}
              onImageRemove={onReferenceImageRemove || (() => {})}
              onConfigUpdate={onReferenceImageConfigUpdate || (() => {})}
              onReset={onReferenceImageReset || (() => {})}
              onToggleLock={onReferenceImageToggleLock || (() => {})}
              onToggleVisibility={onReferenceImageToggleVisibility || (() => {})}
              onFitToCanvas={onReferenceImageFitToCanvas || (() => {})}
            />
          )}

          {activePanel === 'error' && (
            <ErrorPanel
              errorLog={errorLog}
              memoryInfo={memoryInfo}
              isRecovering={isRecovering}
              errorStats={errorStats}
              onClearErrors={onClearErrors || (() => {})}
            />
          )}
        </div>
      )}
    </div>
  )
}