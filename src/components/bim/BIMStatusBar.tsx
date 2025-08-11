/**
 * BIMStatusBar Component
 * 
 * Status bar showing geometric quality and performance metrics for BIM mode
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Layers, 
  MemoryStick,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Quality metrics interface
 */
export interface QualityMetrics {
  geometricAccuracy: number;
  topologicalConsistency: number;
  manufacturability: number;
  architecturalCompliance: number;
  sliverFaceCount: number;
  microGapCount: number;
  selfIntersectionCount: number;
  degenerateElementCount: number;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  lastOperationTime: number;
  averageOperationTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  operationsPerSecond: number;
}

/**
 * BIM status bar props
 */
export interface BIMStatusBarProps {
  bimModeActive: boolean;
  overallQuality: number;
  wallCount: number;
  intersectionCount: number;
  issueCount: number;
  qualityMetrics: QualityMetrics;
  performanceMetrics: PerformanceMetrics;
  currentOperation?: string;
  className?: string;
}

/**
 * Quality indicator component
 */
interface QualityIndicatorProps {
  label: string;
  value: number;
  threshold?: { warning: number; critical: number };
  format?: 'percentage' | 'count' | 'time';
  trend?: 'up' | 'down' | 'stable';
}

const QualityIndicator: React.FC<QualityIndicatorProps> = ({
  label,
  value,
  threshold = { warning: 0.8, critical: 0.6 },
  format = 'percentage',
  trend
}) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return `${Math.round(val * 100)}%`;
      case 'count':
        return val.toString();
      case 'time':
        return `${val}ms`;
      default:
        return val.toString();
    }
  };

  const getStatusColor = () => {
    if (format === 'count') {
      // For counts, lower is better
      if (value === 0) return 'text-green-600';
      if (value <= 5) return 'text-amber-600';
      return 'text-red-600';
    } else {
      // For percentages and times, higher is better (except for time)
      if (format === 'time') {
        if (value <= 100) return 'text-green-600';
        if (value <= 500) return 'text-amber-600';
        return 'text-red-600';
      } else {
        if (value >= threshold.warning) return 'text-green-600';
        if (value >= threshold.critical) return 'text-amber-600';
        return 'text-red-600';
      }
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      case 'stable':
        return <Minus className="h-3 w-3 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{label}:</span>
          <span className={cn('text-xs font-medium', getStatusColor())}>
            {formatValue(value)}
          </span>
          {getTrendIcon()}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}: {formatValue(value)}</p>
        {format === 'percentage' && (
          <p className="text-xs text-muted-foreground">
            Warning: &lt;{Math.round(threshold.warning * 100)}%, 
            Critical: &lt;{Math.round(threshold.critical * 100)}%
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

/**
 * Overall quality badge component
 */
interface QualityBadgeProps {
  quality: number;
  issueCount: number;
}

const QualityBadge: React.FC<QualityBadgeProps> = ({ quality, issueCount }) => {
  const getQualityLevel = () => {
    if (quality >= 0.9 && issueCount === 0) return 'excellent';
    if (quality >= 0.8 && issueCount <= 2) return 'good';
    if (quality >= 0.7 && issueCount <= 5) return 'fair';
    return 'poor';
  };

  const qualityLevel = getQualityLevel();
  
  const getBadgeProps = () => {
    switch (qualityLevel) {
      case 'excellent':
        return { 
          variant: 'default' as const, 
          className: 'bg-green-600 hover:bg-green-700',
          icon: <CheckCircle className="h-3 w-3" />
        };
      case 'good':
        return { 
          variant: 'default' as const, 
          className: 'bg-blue-600 hover:bg-blue-700',
          icon: <CheckCircle className="h-3 w-3" />
        };
      case 'fair':
        return { 
          variant: 'secondary' as const, 
          className: 'bg-amber-600 hover:bg-amber-700 text-white',
          icon: <AlertTriangle className="h-3 w-3" />
        };
      case 'poor':
        return { 
          variant: 'destructive' as const, 
          className: '',
          icon: <AlertTriangle className="h-3 w-3" />
        };
      default:
        return { 
          variant: 'secondary' as const, 
          className: '',
          icon: <Activity className="h-3 w-3" />
        };
    }
  };

  const badgeProps = getBadgeProps();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={badgeProps.variant}
          className={cn('flex items-center gap-1 text-xs', badgeProps.className)}
        >
          {badgeProps.icon}
          {Math.round(quality * 100)}%
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p>Overall Quality: {Math.round(quality * 100)}%</p>
          <p>Issues: {issueCount}</p>
          <p className="text-xs text-muted-foreground">
            Level: {qualityLevel.charAt(0).toUpperCase() + qualityLevel.slice(1)}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

/**
 * BIM Status Bar Component
 */
export const BIMStatusBar: React.FC<BIMStatusBarProps> = ({
  bimModeActive,
  overallQuality,
  wallCount,
  intersectionCount,
  issueCount,
  qualityMetrics,
  performanceMetrics,
  currentOperation,
  className
}) => {
  if (!bimModeActive) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn(
        'flex items-center justify-between px-3 py-1 border-t bg-blue-50/50 text-xs',
        className
      )}>
        {/* Left Section - BIM Status and Quality */}
        <div className="flex items-center gap-4">
          {/* BIM Mode Indicator */}
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3 text-blue-600" />
            <span className="font-medium text-blue-700">BIM</span>
          </div>

          {/* Overall Quality */}
          <QualityBadge quality={overallQuality} issueCount={issueCount} />

          {/* Wall Count */}
          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{wallCount} walls</span>
          </div>

          {/* Intersection Count */}
          {intersectionCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">{intersectionCount} intersections</span>
            </div>
          )}

          {/* Current Operation */}
          {currentOperation && (
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 animate-pulse text-blue-500" />
              <span className="text-blue-600">{currentOperation}</span>
            </div>
          )}
        </div>

        {/* Center Section - Quality Metrics */}
        <div className="flex items-center gap-3">
          <QualityIndicator
            label="Accuracy"
            value={qualityMetrics.geometricAccuracy}
            format="percentage"
          />
          
          <QualityIndicator
            label="Topology"
            value={qualityMetrics.topologicalConsistency}
            format="percentage"
          />

          {qualityMetrics.sliverFaceCount > 0 && (
            <QualityIndicator
              label="Slivers"
              value={qualityMetrics.sliverFaceCount}
              format="count"
            />
          )}

          {qualityMetrics.selfIntersectionCount > 0 && (
            <QualityIndicator
              label="Self-Int"
              value={qualityMetrics.selfIntersectionCount}
              format="count"
            />
          )}
        </div>

        {/* Right Section - Performance Metrics */}
        <div className="flex items-center gap-3">
          <QualityIndicator
            label="Last Op"
            value={performanceMetrics.lastOperationTime}
            format="time"
            threshold={{ warning: 200, critical: 500 }}
          />

          <div className="flex items-center gap-1">
            <MemoryStick className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {Math.round(performanceMetrics.memoryUsage / 1024)}KB
            </span>
          </div>

          {performanceMetrics.cacheHitRate > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-green-500" />
                  <span className="text-green-600">
                    {Math.round(performanceMetrics.cacheHitRate * 100)}%
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cache Hit Rate: {Math.round(performanceMetrics.cacheHitRate * 100)}%</p>
              </TooltipContent>
            </Tooltip>
          )}

          {performanceMetrics.operationsPerSecond > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-500" />
                  <span className="text-blue-600">
                    {Math.round(performanceMetrics.operationsPerSecond)} ops/s
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Operations per second: {Math.round(performanceMetrics.operationsPerSecond)}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default BIMStatusBar;