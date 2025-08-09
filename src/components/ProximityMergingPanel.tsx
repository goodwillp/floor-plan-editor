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
  const [projectionMin, setProjectionMin] = useState(40)
  const [projectionMul, setProjectionMul] = useState(1.2)
  const [nodeReuseMin, setNodeReuseMin] = useState(30)
  const [nodeReuseMul, setNodeReuseMul] = useState(0.5)
  const [mergeMin, setMergeMin] = useState(10)
  const [mergeMul, setMergeMul] = useState(0.5)

  const handleThresholdChange = (values: number[]) => {
    const val = values[0]
    onThresholdChange(val)
    try { window.dispatchEvent(new CustomEvent('proximity-threshold-changed', { detail: val })) } catch {}
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

      {/* Main Controls (scrollable to keep content in view when expanded) */}
      <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: '65vh' }}>
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Enable Merging
          </Label>
          <Switch
            checked={isEnabled}
            onCheckedChange={(v) => {
              onEnabledChange(v)
              try { window.dispatchEvent(new CustomEvent('proximity-enabled-changed', { detail: v })) } catch {}
            }}
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
              min={10}
              max={200}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10px</span>
              <span>200px</span>
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
                onClick={() => { onRefresh(); try { window.dispatchEvent(new Event('proximity-refresh')) } catch {} }}
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

                {/* Dynamic Tolerances for Layout snapping/merging */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <Label className="text-xs">Projection Min (px): {projectionMin}</Label>
                    <Slider value={[projectionMin]} min={10} max={200} step={5} onValueChange={(v)=>setProjectionMin(v[0])} />
                  </div>
                  <div>
                    <Label className="text-xs">Projection × Thickness: {projectionMul.toFixed(2)}</Label>
                    <Slider value={[projectionMul]} min={0.2} max={3} step={0.1} onValueChange={(v)=>setProjectionMul(v[0])} />
                  </div>
                  <div>
                    <Label className="text-xs">Node Reuse Min (px): {nodeReuseMin}</Label>
                    <Slider value={[nodeReuseMin]} min={10} max={200} step={5} onValueChange={(v)=>setNodeReuseMin(v[0])} />
                  </div>
                  <div>
                    <Label className="text-xs">Node Reuse × Thickness: {nodeReuseMul.toFixed(2)}</Label>
                    <Slider value={[nodeReuseMul]} min={0.2} max={3} step={0.1} onValueChange={(v)=>setNodeReuseMul(v[0])} />
                  </div>
                  <div>
                    <Label className="text-xs">Merge Nearby Min (px): {mergeMin}</Label>
                    <Slider value={[mergeMin]} min={5} max={150} step={5} onValueChange={(v)=>setMergeMin(v[0])} />
                  </div>
                  <div>
                    <Label className="text-xs">Merge Nearby × Thickness: {mergeMul.toFixed(2)}</Label>
                    <Slider value={[mergeMul]} min={0.2} max={2} step={0.1} onValueChange={(v)=>setMergeMul(v[0])} />
                  </div>
                  <div className="col-span-2">
                    <Button size="sm" className="w-full" onClick={()=>{
                      try {
                        const evt = new CustomEvent('tolerance-config-request-update', { detail: {
                          projectionMinPx: projectionMin,
                          projectionMultiplier: projectionMul,
                          nodeReuseMinPx: nodeReuseMin,
                          nodeReuseMultiplier: nodeReuseMul,
                          mergeNearbyMinPx: mergeMin,
                          mergeNearbyMultiplier: mergeMul,
                        }})
                        window.dispatchEvent(evt)
                        console.log('⚙️ Tolerances applied', { projectionMin, projectionMul, nodeReuseMin, nodeReuseMul, mergeMin, mergeMul })
                        // Ask for immediate recompute
                        window.dispatchEvent(new Event('proximity-refresh'))
                      } catch {}
                    }}>Apply Tolerances</Button>
                  </div>
                  <div className="col-span-2">
                    <Button size="sm" variant="outline" className="w-full" onClick={()=>{
                      try {
                        console.log('🧩 Apply geometric merges requested')
                        window.dispatchEvent(new Event('proximity-apply-geometric'))
                      } catch {}
                    }}>Apply Geometric Merges</Button>
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