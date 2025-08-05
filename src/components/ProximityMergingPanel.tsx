import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Merge, 
  Settings, 
  RefreshCw, 
  X, 
  Info,
  Zap,
  Activity
} from 'lucide-react'
import type { ProximityMerge } from '@/lib/ProximityMergingService'

interface ProximityMergingPanelProps {
  isEnabled: boolean
  proximityThreshold: number
  activeMerges: ProximityMerge[]
  mergeStats: {
    totalMerges: number
    averageDistance: number
    mergesByType: Record<string, number>
  }
  onEnabledChange: (enabled: boolean) => void
  onThresholdChange: (threshold: number) => void
  onRefresh: () => void
  onClearAll: () => void
  className?: string
}

/**
 * Panel for controlling proximity-based wall merging
 * Requirements: 5.1, 5.3, 5.4
 */
export function ProximityMergingPanel({
  isEnabled,
  proximityThreshold,
  activeMerges,
  mergeStats,
  onEnabledChange,
  onThresholdChange,
  onRefresh,
  onClearAll,
  className
}: ProximityMergingPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleThresholdChange = (values: number[]) => {
    onThresholdChange(values[0])
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Merge className="h-4 w-4" />
          Proximity Merging
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="h-6 px-2 text-xs"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>

      {/* Main Controls */}
      <div className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Enable Merging
          </Label>
          <Switch
            checked={isEnabled}
            onCheckedChange={onEnabledChange}
          />
        </div>

        {/* Proximity Threshold */}
        {isEnabled && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Proximity Threshold: {proximityThreshold}px
            </Label>
            <Slider
              value={[proximityThreshold]}
              onValueChange={handleThresholdChange}
              min={5}
              max={50}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5px</span>
              <span>50px</span>
            </div>
          </div>
        )}

        <Separator />

        {/* Statistics */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <Label className="text-sm font-medium">Active Merges</Label>
            <Badge variant="secondary">
              {mergeStats.totalMerges}
            </Badge>
          </div>

          {mergeStats.totalMerges > 0 && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Distance:</span>
                <span>{Math.round(mergeStats.averageDistance * 100) / 100}px</span>
              </div>
              
              {Object.entries(mergeStats.mergesByType).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{type}:</span>
                  <Badge variant="outline" className="text-xs">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {isEnabled && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              {mergeStats.totalMerges > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearAll}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </>
        )}

        {/* Advanced Settings */}
        {showAdvanced && (
          <>
            <Separator />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <div>
                      Proximity merging creates visual connections between nearby walls 
                      without modifying the underlying geometry. This preserves individual 
                      wall properties while showing spatial relationships.
                    </div>
                  </div>
                </div>

                {/* Merge Type Legend */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Merge Types:</Label>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Same wall types</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Different wall types</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Active Merges List */}
        {activeMerges.length > 0 && showAdvanced && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm font-medium">Active Merges</Label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {activeMerges.map((merge) => (
                  <div
                    key={merge.id}
                    className="text-xs p-2 bg-muted rounded border"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono">
                        {merge.wall1Id.substring(0, 8)}...
                        {' ↔ '}
                        {merge.wall2Id.substring(0, 8)}...
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(merge.distance)}px
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {merge.segments.length} segment pair(s)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Help Text */}
        {!isEnabled && (
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <div className="flex items-start gap-2">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div>
                Enable proximity merging to automatically detect and visualize 
                connections between nearby walls. This helps identify potential 
                wall relationships without modifying your floor plan geometry.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}