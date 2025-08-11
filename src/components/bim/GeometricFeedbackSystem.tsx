/**
 * Geometric Feedback System Component
 * 
 * Provides real-time quality indicators, interactive visualization of geometric issues,
 * and visual feedback for BIM wall operations
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Info, 
  MapPin,
  Zap,
  Target,
  AlertCircle,
  XCircle,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QualityMetrics, QualityIssue } from '@/lib/bim/types/QualityMetrics';
import { QualityIssueType } from '@/lib/bim/types/QualityMetrics';
import type { UnifiedWallData } from '@/lib/bim/data/UnifiedWallData';
import type { BIMPoint } from '@/lib/bim/geometry/BIMPoint';

/**
 * Props for the Geometric Feedback System
 */
export interface GeometricFeedbackSystemProps {
  wallData: UnifiedWallData[];
  selectedWallIds?: string[];
  showQualityIndicators?: boolean;
  showIssueHighlights?: boolean;
  onIssueClick?: (issue: QualityIssue, wallId: string) => void;
  onQualityIndicatorToggle?: (show: boolean) => void;
  onIssueHighlightToggle?: (show: boolean) => void;
  className?: string;
}

/**
 * Quality indicator levels
 */
export enum QualityLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  CRITICAL = 'critical'
}

/**
 * Visual feedback configuration
 */
interface FeedbackConfig {
  showQualityColors: boolean;
  showIssueMarkers: boolean;
  showTooltips: boolean;
  highlightCriticalIssues: boolean;
  animateUpdates: boolean;
}

/**
 * Issue marker component
 */
interface IssueMarkerProps {
  issue: QualityIssue;
  wallId: string;
  onClick?: (issue: QualityIssue, wallId: string) => void;
}

const IssueMarker: React.FC<IssueMarkerProps> = ({ issue, wallId, onClick }) => {
  const getIssueIcon = (type: QualityIssueType) => {
    switch (type) {
      case QualityIssueType.SELF_INTERSECTION:
        return <XCircle className="h-4 w-4" />;
      case QualityIssueType.SLIVER_FACE:
        return <AlertTriangle className="h-4 w-4" />;
      case QualityIssueType.MICRO_GAP:
        return <Target className="h-4 w-4" />;
      case QualityIssueType.DEGENERATE_ELEMENT:
        return <AlertCircle className="h-4 w-4" />;
      case QualityIssueType.TOLERANCE_VIOLATION:
        return <Info className="h-4 w-4" />;
      case QualityIssueType.TOPOLOGICAL_ERROR:
        return <XCircle className="h-4 w-4" />;
      case QualityIssueType.GEOMETRIC_INCONSISTENCY:
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-300';
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-300';
      case 'medium':
        return 'text-amber-600 bg-amber-100 border-amber-300';
      case 'low':
        return 'text-blue-600 bg-blue-100 border-blue-300';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onClick?.(issue, wallId)}
          className={cn(
            'inline-flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all hover:scale-110',
            getSeverityColor(issue.severity),
            issue.severity === 'critical' && 'animate-pulse'
          )}
          style={{
            position: 'absolute',
            left: issue.location?.x || 0,
            top: issue.location?.y || 0,
            transform: 'translate(-50%, -50%)',
            zIndex: 1000
          }}
        >
          {getIssueIcon(issue.type)}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-2 max-w-xs">
          <div className="flex items-center gap-2">
            <Badge variant={issue.severity === 'critical' ? 'destructive' : 'outline'}>
              {issue.severity.toUpperCase()}
            </Badge>
            <span className="text-xs font-medium">{issue.type.replace('_', ' ')}</span>
          </div>
          <p className="text-xs">{issue.description}</p>
          {issue.suggestedFix && (
            <div className="pt-1 border-t">
              <p className="text-xs font-medium">Suggested Fix:</p>
              <p className="text-xs text-muted-foreground">{issue.suggestedFix}</p>
            </div>
          )}
          {issue.autoFixable && (
            <Badge variant="secondary" className="text-xs">
              Auto-fixable
            </Badge>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

/**
 * Quality indicator component
 */
interface QualityIndicatorProps {
  wall: UnifiedWallData;
  level: QualityLevel;
  showLabel?: boolean;
}

const QualityIndicator: React.FC<QualityIndicatorProps> = ({ wall, level, showLabel = true }) => {
  const getLevelConfig = (level: QualityLevel) => {
    switch (level) {
      case QualityLevel.EXCELLENT:
        return {
          color: 'bg-green-500',
          textColor: 'text-green-700',
          label: 'Excellent',
          icon: <CheckCircle className="h-3 w-3" />
        };
      case QualityLevel.GOOD:
        return {
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          label: 'Good',
          icon: <CheckCircle className="h-3 w-3" />
        };
      case QualityLevel.FAIR:
        return {
          color: 'bg-amber-500',
          textColor: 'text-amber-700',
          label: 'Fair',
          icon: <AlertTriangle className="h-3 w-3" />
        };
      case QualityLevel.POOR:
        return {
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          label: 'Poor',
          icon: <AlertTriangle className="h-3 w-3" />
        };
      case QualityLevel.CRITICAL:
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          label: 'Critical',
          icon: <XCircle className="h-3 w-3" />
        };
    }
  };

  const config = getLevelConfig(level);
  const metrics = wall.bimGeometry?.qualityMetrics;
  const overallScore = metrics ? 
    (metrics.geometricAccuracy + metrics.topologicalConsistency + 
     metrics.manufacturability + metrics.architecturalCompliance) / 4 : 0.8;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2">
          <div className={cn('w-3 h-3 rounded-full', config.color)} />
          {showLabel && (
            <span className={cn('text-xs font-medium', config.textColor)}>
              {config.label}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {config.icon}
            <span className="font-medium">{config.label} Quality</span>
          </div>
          <div className="text-xs space-y-1">
            <div>Overall Score: {Math.round(overallScore * 100)}%</div>
            {metrics && (
              <>
                <div>Geometric: {Math.round(metrics.geometricAccuracy * 100)}%</div>
                <div>Topology: {Math.round(metrics.topologicalConsistency * 100)}%</div>
                <div>Issues: {metrics.sliverFaceCount + metrics.microGapCount + metrics.selfIntersectionCount}</div>
              </>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

/**
 * Real-time feedback overlay component
 */
interface FeedbackOverlayProps {
  walls: UnifiedWallData[];
  config: FeedbackConfig;
  onIssueClick?: (issue: QualityIssue, wallId: string) => void;
}

const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({ walls, config, onIssueClick }) => {
  const [visibleIssues, setVisibleIssues] = useState<Array<{
    issue: QualityIssue;
    wallId: string;
    id: string;
  }>>([]);

  useEffect(() => {
    if (!config.showIssueMarkers) {
      setVisibleIssues([]);
      return;
    }

    const issues: Array<{ issue: QualityIssue; wallId: string; id: string }> = [];
    
    walls.forEach(wall => {
      const metrics = wall.bimGeometry?.qualityMetrics;
      if (!metrics) return;

      metrics.issues.forEach((issue, index) => {
        if (issue.location && (config.highlightCriticalIssues || issue.severity !== 'critical')) {
          issues.push({
            issue,
            wallId: wall.id,
            id: `${wall.id}-${index}`
          });
        }
      });
    });

    setVisibleIssues(issues);
  }, [walls, config.showIssueMarkers, config.highlightCriticalIssues]);

  if (!config.showIssueMarkers) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {visibleIssues.map(({ issue, wallId, id }) => (
        <div key={id} className="pointer-events-auto">
          <IssueMarker
            issue={issue}
            wallId={wallId}
            onClick={onIssueClick}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * Quality summary component
 */
interface QualitySummaryProps {
  walls: UnifiedWallData[];
  selectedWallIds: string[];
}

const QualitySummary: React.FC<QualitySummaryProps> = ({ walls, selectedWallIds }) => {
  const relevantWalls = selectedWallIds.length > 0 
    ? walls.filter(wall => selectedWallIds.includes(wall.id))
    : walls;

  const summary = useMemo(() => {
    const levels = {
      [QualityLevel.EXCELLENT]: 0,
      [QualityLevel.GOOD]: 0,
      [QualityLevel.FAIR]: 0,
      [QualityLevel.POOR]: 0,
      [QualityLevel.CRITICAL]: 0
    };

    let totalIssues = 0;
    let criticalIssues = 0;

    relevantWalls.forEach(wall => {
      const metrics = wall.bimGeometry?.qualityMetrics;
      if (!metrics) {
        levels[QualityLevel.GOOD]++;
        return;
      }

      const overallScore = (
        metrics.geometricAccuracy + 
        metrics.topologicalConsistency + 
        metrics.manufacturability + 
        metrics.architecturalCompliance
      ) / 4;

      const issues = metrics.sliverFaceCount + metrics.microGapCount + metrics.selfIntersectionCount;
      totalIssues += issues;
      
      const hasCriticalIssues = metrics.issues.some(issue => issue.severity === 'critical');
      if (hasCriticalIssues) criticalIssues++;

      if (hasCriticalIssues || overallScore < 0.5) {
        levels[QualityLevel.CRITICAL]++;
      } else if (overallScore < 0.7) {
        levels[QualityLevel.POOR]++;
      } else if (overallScore < 0.8) {
        levels[QualityLevel.FAIR]++;
      } else if (overallScore < 0.9) {
        levels[QualityLevel.GOOD]++;
      } else {
        levels[QualityLevel.EXCELLENT]++;
      }
    });

    return { levels, totalIssues, criticalIssues };
  }, [relevantWalls]);

  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-blue-600" />
        <span className="font-medium">{relevantWalls.length} walls</span>
      </div>
      
      {summary.totalIssues > 0 && (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span>{summary.totalIssues} issues</span>
        </div>
      )}
      
      {summary.criticalIssues > 0 && (
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-red-600 font-medium">{summary.criticalIssues} critical</span>
        </div>
      )}
      
      <div className="flex items-center gap-1">
        {Object.entries(summary.levels).map(([level, count]) => {
          if (count === 0) return null;
          
          const config = {
            [QualityLevel.EXCELLENT]: { color: 'bg-green-500', label: 'E' },
            [QualityLevel.GOOD]: { color: 'bg-blue-500', label: 'G' },
            [QualityLevel.FAIR]: { color: 'bg-amber-500', label: 'F' },
            [QualityLevel.POOR]: { color: 'bg-orange-500', label: 'P' },
            [QualityLevel.CRITICAL]: { color: 'bg-red-500', label: 'C' }
          }[level as QualityLevel];
          
          return (
            <Tooltip key={level}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <div className={cn('w-2 h-2 rounded-full', config.color)} />
                  <span>{count}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span>{level}: {count} walls</span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Helper function to determine quality level
 */
function getQualityLevel(wall: UnifiedWallData): QualityLevel {
  const metrics = wall.bimGeometry?.qualityMetrics;
  if (!metrics) return QualityLevel.GOOD;

  const overallScore = (
    metrics.geometricAccuracy + 
    metrics.topologicalConsistency + 
    metrics.manufacturability + 
    metrics.architecturalCompliance
  ) / 4;

  const hasCriticalIssues = metrics.issues.some(issue => issue.severity === 'critical');
  
  if (hasCriticalIssues || overallScore < 0.5) return QualityLevel.CRITICAL;
  if (overallScore < 0.7) return QualityLevel.POOR;
  if (overallScore < 0.8) return QualityLevel.FAIR;
  if (overallScore < 0.9) return QualityLevel.GOOD;
  return QualityLevel.EXCELLENT;
}

/**
 * Main Geometric Feedback System Component
 */
export const GeometricFeedbackSystem: React.FC<GeometricFeedbackSystemProps> = ({
  wallData,
  selectedWallIds = [],
  showQualityIndicators = true,
  showIssueHighlights = true,
  onIssueClick,
  onQualityIndicatorToggle,
  onIssueHighlightToggle,
  className
}) => {
  const [feedbackConfig, setFeedbackConfig] = useState<FeedbackConfig>({
    showQualityColors: showQualityIndicators,
    showIssueMarkers: showIssueHighlights,
    showTooltips: true,
    highlightCriticalIssues: true,
    animateUpdates: true
  });

  // Update config when props change
  useEffect(() => {
    setFeedbackConfig(prev => ({
      ...prev,
      showQualityColors: showQualityIndicators,
      showIssueMarkers: showIssueHighlights
    }));
  }, [showQualityIndicators, showIssueHighlights]);

  const handleConfigChange = useCallback((key: keyof FeedbackConfig, value: boolean) => {
    setFeedbackConfig(prev => ({ ...prev, [key]: value }));
    
    if (key === 'showQualityColors') {
      onQualityIndicatorToggle?.(value);
    } else if (key === 'showIssueMarkers') {
      onIssueHighlightToggle?.(value);
    }
  }, [onQualityIndicatorToggle, onIssueHighlightToggle]);

  const relevantWalls = selectedWallIds.length > 0 
    ? wallData.filter(wall => selectedWallIds.includes(wall.id))
    : wallData;

  return (
    <TooltipProvider>
      <div className={cn('relative', className)}>
        {/* Control Panel */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg border">
          <QualitySummary walls={wallData} selectedWallIds={selectedWallIds} />
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleConfigChange('showQualityColors', !feedbackConfig.showQualityColors)}
              className={cn(
                'h-8 px-3 text-xs',
                feedbackConfig.showQualityColors && 'bg-blue-100 text-blue-700'
              )}
            >
              {feedbackConfig.showQualityColors ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Quality
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleConfigChange('showIssueMarkers', !feedbackConfig.showIssueMarkers)}
              className={cn(
                'h-8 px-3 text-xs',
                feedbackConfig.showIssueMarkers && 'bg-red-100 text-red-700'
              )}
            >
              {feedbackConfig.showIssueMarkers ? <MapPin className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Issues
            </Button>
          </div>
        </div>

        {/* Quality Indicators */}
        {feedbackConfig.showQualityColors && (
          <div className="space-y-2 mb-4">
            {relevantWalls.map(wall => {
              const level = getQualityLevel(wall);
              return (
                <div key={wall.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Wall {wall.id.substring(0, 8)}</span>
                    <QualityIndicator wall={wall} level={level} />
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{wall.type}</span>
                    <span>{wall.thickness}mm</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Issue Overlay */}
        <FeedbackOverlay
          walls={relevantWalls}
          config={feedbackConfig}
          onIssueClick={onIssueClick}
        />
      </div>
    </TooltipProvider>
  );
};

export default GeometricFeedbackSystem;