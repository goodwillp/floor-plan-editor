import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { WallPropertiesPanel } from './WallPropertiesPanel'
import { ProximityMergingPanel } from './ProximityMergingPanel'
import { ReferenceImagePanel } from './ReferenceImagePanel'
import { ErrorPanel } from './ErrorPanel'
import { 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Settings, 
  Image,
  Eye,
  EyeOff,
  Merge,
  Shield
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
  // Error handling props
  errorLog = [],
  memoryInfo = null,
  isRecovering = false,
  errorStats = {},
  onClearErrors,
  onSetMemoryThresholds
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activePanel, setActivePanel] = useState<SidebarPanel>(null)

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
    <div className={cn(
      'flex h-full border-l bg-background transition-all duration-200',
      isCollapsed ? 'w-12' : 'w-64',
      className
    )}>
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
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">Walls</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">Grid</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <EyeOff className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">Reference</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Eye className="h-3 w-3" />
                  </Button>
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
              onSetMemoryThresholds={onSetMemoryThresholds || (() => {})}
            />
          )}
        </div>
      )}
    </div>
  )
}