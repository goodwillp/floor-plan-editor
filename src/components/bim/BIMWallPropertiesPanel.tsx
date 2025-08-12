/**
 * BIM Wall Properties Panel Component
 * 
 * Advanced geometric controls for BIM walls with join type selection,
 * quality metrics display, and tolerance adjustment
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Info, 
  RefreshCw, 
  Settings, 
  Trash2,
  Zap,
  Target,
  Activity,
  TrendingUp,
  TrendingDown,
  Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WallTypeString } from '@/lib/types';
import { WALL_THICKNESS } from '@/lib/types';
import { OffsetJoinType, OFFSET_JOIN_TYPE_DEFINITIONS } from '@/lib/bim/types/OffsetTypes';
import type { QualityMetrics } from '@/lib/bim/types/QualityMetrics';
import type { UnifiedWallData } from '@/lib/bim/data/UnifiedWallData';

/**
 * Props for the BIM Wall Properties Panel
 */
export interface BIMWallPropertiesPanelProps {
  selectedWallIds: string[];
  wallData: UnifiedWallData[] | null;
  onWallTypeChange: (wallIds: string[], newType: WallTypeString) => void;
  onWallVisibilityChange: (wallIds: string[], visible: boolean) => void;
  onWallDelete: (wallIds: string[]) => void;
  onJoinTypeChange: (wallIds: string[], joinType: OffsetJoinType) => void;
  onToleranceChange: (wallIds: string[], tolerance: number) => void;
  onValidateGeometry: (wallIds: string[]) => void;
  onHealGeometry: (wallIds: string[]) => void;
  onSelectionClear: () => void;
  className?: string;
}

/**
 * Join type preview component
 */
interface JoinTypePreviewProps {
  joinType: OffsetJoinType;
  isSelected: boolean;
  onClick: () => void;
}

const JoinTypePreview: React.FC<JoinTypePreviewProps> = ({ joinType, isSelected, onClick }) => {
  const definition = OFFSET_JOIN_TYPE_DEFINITIONS[joinType];
  
  const getPreviewPath = () => {
    switch (joinType) {
      case OffsetJoinType.MITER:
        return "M10,10 L30,10 L30,30 L10,30 Z M15,15 L25,15 L25,25 L15,25 Z";
      case OffsetJoinType.BEVEL:
        return "M10,10 L30,10 L25,15 L15,15 Z M15,15 L25,15 L25,25 L15,25 Z";
      case OffsetJoinType.ROUND:
        return "M10,10 L30,10 Q30,15 25,15 Q15,15 15,25 L15,30 L10,30 Z";
      default:
        return "";
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
            isSelected 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          )}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" className="text-gray-700">
            <path d={getPreviewPath()} fill="currentColor" stroke="currentColor" strokeWidth="1" />
          </svg>
          <span className="text-xs font-medium capitalize">{joinType}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-medium">{definition.description}</p>
          <p className="text-xs text-muted-foreground">
            Best for: {definition.angleRange.min}° - {definition.angleRange.max}°
          </p>
          <p className="text-xs text-muted-foreground">
            Complexity: {definition.complexity}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

/**
 * Quality metrics display component
 */
interface QualityMetricsDisplayProps {
  metrics: QualityMetrics;
  showDetails?: boolean;
}

const QualityMetricsDisplay: React.FC<QualityMetricsDisplayProps> = ({ 
  metrics, 
  showDetails = false 
}) => {
  const overallScore = (
    metrics.geometricAccuracy + 
    metrics.topologicalConsistency + 
    metrics.manufacturability + 
    metrics.architecturalCompliance
  ) / 4;

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 0.9) return 'default';
    if (score >= 0.7) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-3">
      {/* Overall Quality Score */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Overall Quality</Label>
        <Badge variant={getScoreBadgeVariant(overallScore)} className="flex items-center gap-1">
          {overallScore >= 0.9 ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          {Math.round(overallScore * 100)}%
        </Badge>
      </div>

      {showDetails && (
        <>
          {/* Individual Metrics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Geometric Accuracy</span>
              <span className={cn('text-xs font-medium', getScoreColor(metrics.geometricAccuracy))}>
                {Math.round(metrics.geometricAccuracy * 100)}%
              </span>
            </div>
            <Progress value={metrics.geometricAccuracy * 100} className="h-1" />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Topology</span>
              <span className={cn('text-xs font-medium', getScoreColor(metrics.topologicalConsistency))}>
                {Math.round(metrics.topologicalConsistency * 100)}%
              </span>
            </div>
            <Progress value={metrics.topologicalConsistency * 100} className="h-1" />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Manufacturability</span>
              <span className={cn('text-xs font-medium', getScoreColor(metrics.manufacturability))}>
                {Math.round(metrics.manufacturability * 100)}%
              </span>
            </div>
            <Progress value={metrics.manufacturability * 100} className="h-1" />
          </div>

          {/* Issue Counts */}
          {(metrics.sliverFaceCount > 0 || metrics.microGapCount > 0 || metrics.selfIntersectionCount > 0) && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Issues</Label>
              <div className="flex flex-wrap gap-1">
                {metrics.sliverFaceCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {metrics.sliverFaceCount} slivers
                  </Badge>
                )}
                {metrics.microGapCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {metrics.microGapCount} gaps
                  </Badge>
                )}
                {metrics.selfIntersectionCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {metrics.selfIntersectionCount} self-intersections
                  </Badge>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Tolerance adjustment component
 */
interface ToleranceAdjustmentProps {
  currentTolerance: number;
  wallThickness: number;
  onToleranceChange: (tolerance: number) => void;
  showImpactPreview?: boolean;
}

const ToleranceAdjustment: React.FC<ToleranceAdjustmentProps> = ({
  currentTolerance,
  wallThickness,
  onToleranceChange,
  showImpactPreview = true
}) => {
  const [tempTolerance, setTempTolerance] = useState(currentTolerance);
  
  // Calculate recommended tolerance based on wall thickness
  const recommendedTolerance = wallThickness * 0.001; // 0.1% of thickness
  const minTolerance = wallThickness * 0.0001; // 0.01% of thickness
  const maxTolerance = wallThickness * 0.01; // 1% of thickness

  const handleSliderChange = (values: number[]) => {
    const newTolerance = values[0];
    setTempTolerance(newTolerance);
  };

  const handleSliderCommit = () => {
    onToleranceChange(tempTolerance);
  };

  const getToleranceImpact = (tolerance: number) => {
    const ratio = tolerance / recommendedTolerance;
    if (ratio < 0.5) return { quality: 'high', performance: 'slow', color: 'text-red-600' };
    if (ratio < 1.5) return { quality: 'optimal', performance: 'good', color: 'text-green-600' };
    if (ratio < 3) return { quality: 'good', performance: 'fast', color: 'text-amber-600' };
    return { quality: 'low', performance: 'very fast', color: 'text-red-600' };
  };

  const impact = getToleranceImpact(tempTolerance);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Tolerance</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {tempTolerance.toFixed(4)}mm
          </span>
          {Math.abs(tempTolerance - recommendedTolerance) < 0.0001 && (
            <Badge variant="outline" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              Optimal
            </Badge>
          )}
        </div>
      </div>

      <Slider
        value={[tempTolerance]}
        onValueChange={handleSliderChange}
        onValueCommit={handleSliderCommit}
        min={minTolerance}
        max={maxTolerance}
        step={minTolerance}
        className="w-full"
      />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Precise</span>
        <span>Recommended: {recommendedTolerance.toFixed(4)}mm</span>
        <span>Fast</span>
      </div>

      {showImpactPreview && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Impact:</span>
          <div className="flex items-center gap-2">
            <span className={cn('font-medium', impact.color)}>
              Quality: {impact.quality}
            </span>
            <span className={cn('font-medium', impact.color)}>
              Speed: {impact.performance}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main BIM Wall Properties Panel Component
 */
export const BIMWallPropertiesPanel: React.FC<BIMWallPropertiesPanelProps> = ({
  selectedWallIds,
  wallData,
  onWallTypeChange,
  onWallVisibilityChange,
  onWallDelete,
  onJoinTypeChange,
  onToleranceChange,
  onValidateGeometry,
  onHealGeometry,
  onSelectionClear,
  className
}) => {
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [pendingType, setPendingType] = useState<WallTypeString | null>(null);
  const [pendingVisibility, setPendingVisibility] = useState<boolean | null>(null);
  const [pendingJoinType, setPendingJoinType] = useState<OffsetJoinType | null>(null);

  // Reset pending changes when selection changes
  useEffect(() => {
    setPendingType(null);
    setPendingVisibility(null);
    setPendingJoinType(null);
  }, [selectedWallIds]);

  // Computed properties
  const { 
    isMultiSelection, 
    firstWall, 
    allSameType, 
    allSameVisibility, 
    allSameJoinType,
    averageQuality,
    totalIssues,
    averageTolerance
  } = useMemo(() => {
    if (!wallData || wallData.length === 0) {
      return {
        isMultiSelection: false,
        firstWall: null,
        allSameType: true,
        allSameVisibility: true,
        allSameJoinType: true,
        averageQuality: 0,
        totalIssues: 0,
        averageTolerance: 0.001
      };
    }

    const isMulti = selectedWallIds.length > 1;
    const first = wallData[0];
    
    const sameType = wallData.every(w => w.type === first.type);
    const sameVisibility = wallData.every(w => w.visible === first.visible);
    
    // Get join type from BIM geometry if available
    const getJoinType = (wall: UnifiedWallData): OffsetJoinType => {
      const jt = wall.bimGeometry?.wallSolid?.joinTypes;
      if (jt && jt.size > 0) {
        return Array.from(jt.values())[0];
      }
      return OffsetJoinType.MITER; // default
    };
    
    const firstJoinType = getJoinType(first);
    const sameJoinType = wallData.every(w => getJoinType(w) === firstJoinType);
    
    // Calculate average quality
    const avgQuality = wallData.reduce((sum, wall) => {
      if (wall.bimGeometry?.qualityMetrics) {
        const metrics = wall.bimGeometry.qualityMetrics;
        return sum + (metrics.geometricAccuracy + metrics.topologicalConsistency + 
                     metrics.manufacturability + metrics.architecturalCompliance) / 4;
      }
      return sum + 0.8; // default quality for walls without BIM geometry
    }, 0) / wallData.length;
    
    // Calculate total issues
    const issues = wallData.reduce((sum, wall) => {
      if (wall.bimGeometry?.qualityMetrics) {
        const metrics = wall.bimGeometry.qualityMetrics;
        return sum + metrics.sliverFaceCount + metrics.microGapCount + metrics.selfIntersectionCount;
      }
      return sum;
    }, 0);
    
    // Calculate average tolerance (simplified)
    const avgTolerance = wallData.reduce((sum, wall) => sum + wall.thickness * 0.001, 0) / wallData.length;

    return {
      isMultiSelection: isMulti,
      firstWall: first,
      allSameType: sameType,
      allSameVisibility: sameVisibility,
      allSameJoinType: sameJoinType,
      averageQuality: avgQuality,
      totalIssues: issues,
      averageTolerance: avgTolerance
    };
  }, [wallData, selectedWallIds]);

  if (selectedWallIds.length === 0) {
    return (
      <div className={className}>
        <h3 className="font-semibold mb-3">BIM Properties</h3>
        <div className="text-sm text-muted-foreground">
          No wall selected. Click on a wall to edit its BIM properties.
        </div>
      </div>
    );
  }

  if (!wallData || wallData.length === 0) {
    return (
      <div className={className}>
        <h3 className="font-semibold mb-3">BIM Properties</h3>
        <div className="text-sm text-muted-foreground">
          Loading BIM wall data...
        </div>
      </div>
    );
  }

  const handleTypeChange = (newType: WallTypeString) => {
    setPendingType(newType);
    onWallTypeChange(selectedWallIds, newType);
  };

  const handleVisibilityChange = (visible: boolean) => {
    setPendingVisibility(visible);
    onWallVisibilityChange(selectedWallIds, visible);
  };

  const handleJoinTypeChange = (joinType: OffsetJoinType) => {
    setPendingJoinType(joinType);
    onJoinTypeChange(selectedWallIds, joinType);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedWallIds.length} wall(s)?`)) {
      onWallDelete(selectedWallIds);
    }
  };

  const currentType = pendingType || (allSameType ? firstWall?.type : null);
  const currentVisibility = pendingVisibility !== null ? pendingVisibility : (allSameVisibility ? firstWall?.visible : null);
  const currentJoinType = pendingJoinType || (allSameJoinType ? OffsetJoinType.MITER : null); // simplified

  return (
    <TooltipProvider>
      <div className={className}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">BIM Properties</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectionClear}
            className="h-6 px-2 text-xs"
          >
            Clear
          </Button>
        </div>

        {/* Selection Info */}
        <div className="mb-4 p-2 bg-blue-50 rounded-md border border-blue-200">
          <div className="text-sm font-medium text-blue-900">
            {isMultiSelection ? `${selectedWallIds.length} walls selected` : '1 wall selected'}
          </div>
          <div className="text-xs text-blue-700 mt-1 flex items-center gap-2">
            {isMultiSelection ? 'Editing multiple BIM walls' : `ID: ${firstWall?.id.substring(0, 8)}...`}
            <Badge variant="outline" className="text-xs bg-white">
              Quality: {Math.round(averageQuality * 100)}%
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          {/* Basic Properties */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Basic Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Wall Type */}
              <div>
                <Label className="text-sm font-medium">Wall Type</Label>
                <Select
                  value={currentType || ''}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue 
                      placeholder={allSameType ? undefined : "Mixed types"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="layout">
                      Layout Wall (350mm)
                    </SelectItem>
                    <SelectItem value="zone">
                      Zone Wall (250mm)
                    </SelectItem>
                    <SelectItem value="area">
                      Area Wall (150mm)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {!allSameType && (
                  <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Mixed wall types
                  </div>
                )}
              </div>

              {/* Thickness */}
              <div>
                <Label className="text-sm font-medium">Thickness</Label>
                <div className="mt-1 text-sm">
                  {currentType ? (
                    <Badge variant="secondary">
                      {WALL_THICKNESS[currentType]}mm
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Mixed</span>
                  )}
                </div>
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Visible</Label>
                <div className="flex items-center gap-2">
                  {currentVisibility !== null ? (
                    <>
                      {currentVisibility ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      <Switch
                        checked={currentVisibility}
                        onCheckedChange={handleVisibilityChange}
                      />
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Mixed</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BIM Geometric Properties */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Geometric Properties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Join Type Selection */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Join Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(OffsetJoinType).map((joinType) => (
                    <JoinTypePreview
                      key={joinType}
                      joinType={joinType}
                      isSelected={currentJoinType === joinType}
                      onClick={() => handleJoinTypeChange(joinType)}
                    />
                  ))}
                </div>
                {!allSameJoinType && (
                  <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Mixed join types
                  </div>
                )}
              </div>

              {/* Tolerance Adjustment */}
              <ToleranceAdjustment
                currentTolerance={averageTolerance}
                wallThickness={firstWall?.thickness || 250}
                onToleranceChange={(tolerance) => onToleranceChange(selectedWallIds, tolerance)}
                showImpactPreview={true}
              />
            </CardContent>
          </Card>

          {/* Quality Metrics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Quality Metrics
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
                  className="h-6 px-2 text-xs"
                >
                  {showAdvancedMetrics ? 'Less' : 'More'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {firstWall?.bimGeometry?.qualityMetrics ? (
                <QualityMetricsDisplay
                  metrics={firstWall.bimGeometry.qualityMetrics}
                  showDetails={showAdvancedMetrics}
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  No BIM geometry available. Generate BIM representation to see quality metrics.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onValidateGeometry(selectedWallIds)}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Validate
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onHealGeometry(selectedWallIds)}
                  className="flex items-center gap-2"
                  disabled={totalIssues === 0}
                >
                  <RefreshCw className="h-4 w-4" />
                  Heal ({totalIssues})
                </Button>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="w-full flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete {isMultiSelection ? 'Walls' : 'Wall'}
              </Button>
            </CardContent>
          </Card>

          {/* Metadata (single selection only) */}
          {!isMultiSelection && firstWall && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <div>Created: {firstWall.createdAt.toLocaleString()}</div>
                <div>Updated: {firstWall.updatedAt.toLocaleString()}</div>
                <div>Version: {firstWall.version}</div>
                <div>Mode: {firstWall.lastModifiedMode.toUpperCase()}</div>
                {firstWall.bimGeometry && (
                  <div>BIM Quality: {Math.round(averageQuality * 100)}%</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default BIMWallPropertiesPanel;