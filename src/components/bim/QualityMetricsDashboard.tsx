/**
 * Quality Metrics Dashboard Component
 * 
 * Displays comprehensive quality metrics for BIM walls with progress bars,
 * issue breakdown, interactive visualization, and quality report generation
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  Eye, 
  EyeOff, 
  Info, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Zap,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  AlertCircle,
  Clock,
  Cpu,
  HardDrive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QualityMetrics, QualityIssue } from '@/lib/bim/types/QualityMetrics';
import { QualityIssueType } from '@/lib/bim/types/QualityMetrics';
import type { UnifiedWallData } from '@/lib/bim/data/UnifiedWallData';

/**
 * Props for the Quality Metrics Dashboard
 */
export interface QualityMetricsDashboardProps {
  wallData: UnifiedWallData[];
  selectedWallIds?: string[];
  onIssueClick?: (issue: QualityIssue, wallId: string) => void;
  onGenerateReport?: () => void;
  onRefreshMetrics?: () => void;
  className?: string;
}

/**
 * Aggregated quality metrics for multiple walls
 */
interface AggregatedQualityMetrics {
  overallScore: number;
  geometricAccuracy: number;
  topologicalConsistency: number;
  manufacturability: number;
  architecturalCompliance: number;
  totalIssues: number;
  issueBreakdown: Record<QualityIssueType, number>;
  performanceMetrics: {
    averageComplexity: number;
    averageProcessingTime: number;
    totalMemoryUsage: number;
    processingEfficiency: number;
  };
  recommendations: string[];
  wallCount: number;
  lastUpdated: Date;
}

/**
 * Quality issue severity colors
 */
const SEVERITY_COLORS = {
  low: 'text-blue-600',
  medium: 'text-amber-600',
  high: 'text-orange-600',
  critical: 'text-red-600'
} as const;

const SEVERITY_VARIANTS = {
  low: 'secondary',
  medium: 'outline',
  high: 'destructive',
  critical: 'destructive'
} as const;

/**
 * Issue type display names
 */
const ISSUE_TYPE_NAMES: Record<QualityIssueType, string> = {
  [QualityIssueType.SLIVER_FACE]: 'Sliver Faces',
  [QualityIssueType.MICRO_GAP]: 'Micro Gaps',
  [QualityIssueType.SELF_INTERSECTION]: 'Self Intersections',
  [QualityIssueType.DEGENERATE_ELEMENT]: 'Degenerate Elements',
  [QualityIssueType.TOLERANCE_VIOLATION]: 'Tolerance Violations',
  [QualityIssueType.TOPOLOGICAL_ERROR]: 'Topological Errors',
  [QualityIssueType.GEOMETRIC_INCONSISTENCY]: 'Geometric Inconsistencies'
};

/**
 * Quality score component with visual indicator
 */
interface QualityScoreProps {
  score: number;
  label: string;
  showTrend?: boolean;
  previousScore?: number;
  className?: string;
}

const QualityScore: React.FC<QualityScoreProps> = ({ 
  score, 
  label, 
  showTrend = false, 
  previousScore, 
  className 
}) => {
  const percentage = Math.round(score * 100);
  const trend = previousScore ? score - previousScore : 0;
  
  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 0.9) return 'bg-green-500';
    if (score >= 0.7) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-bold', getScoreColor(score))}>
            {percentage}%
          </span>
          {showTrend && previousScore !== undefined && (
            <div className="flex items-center gap-1">
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : trend < 0 ? (
                <TrendingDown className="h-3 w-3 text-red-600" />
              ) : null}
              {trend !== 0 && (
                <span className={cn(
                  'text-xs',
                  trend > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {trend > 0 ? '+' : ''}{Math.round(trend * 100)}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <Progress 
        value={percentage} 
        className="h-2"
        // Note: Custom progress color would need to be implemented in the Progress component
      />
    </div>
  );
};

/**
 * Issue breakdown component
 */
interface IssueBreakdownProps {
  issueBreakdown: Record<QualityIssueType, number>;
  totalIssues: number;
  onIssueTypeClick?: (issueType: QualityIssueType) => void;
}

const IssueBreakdown: React.FC<IssueBreakdownProps> = ({ 
  issueBreakdown, 
  totalIssues, 
  onIssueTypeClick 
}) => {
  const sortedIssues = Object.entries(issueBreakdown)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  if (totalIssues === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-center">
        <div className="space-y-2">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
          <p className="text-sm font-medium text-green-600">No Issues Found</p>
          <p className="text-xs text-muted-foreground">All walls meet quality standards</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Issue Breakdown</Label>
        <Badge variant="outline" className="text-xs">
          {totalIssues} total
        </Badge>
      </div>
      
      <div className="space-y-2">
        {sortedIssues.map(([issueType, count]) => {
          const percentage = (count / totalIssues) * 100;
          const severity = getSeverityForIssueType(issueType as QualityIssueType);
          
          return (
            <Tooltip key={issueType}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onIssueTypeClick?.(issueType as QualityIssueType)}
                  className="w-full text-left p-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">
                      {ISSUE_TYPE_NAMES[issueType as QualityIssueType]}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={SEVERITY_VARIANTS[severity]} 
                        className="text-xs"
                      >
                        {count}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-1" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{ISSUE_TYPE_NAMES[issueType as QualityIssueType]}</p>
                  <p className="text-xs">Severity: {severity}</p>
                  <p className="text-xs">{count} occurrences ({percentage.toFixed(1)}%)</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Performance metrics component
 */
interface PerformanceMetricsProps {
  metrics: AggregatedQualityMetrics['performanceMetrics'];
  wallCount: number;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ metrics, wallCount }) => {
  const formatMemory = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-blue-600" />
          <Label className="text-xs font-medium">Processing</Label>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Avg Time:</span>
            <span className="font-medium">{formatTime(metrics.averageProcessingTime)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Efficiency:</span>
            <span className="font-medium">{Math.round(metrics.processingEfficiency * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-green-600" />
          <Label className="text-xs font-medium">Resources</Label>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Memory:</span>
            <span className="font-medium">{formatMemory(metrics.totalMemoryUsage)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Complexity:</span>
            <span className="font-medium">{metrics.averageComplexity.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Recommendations component
 */
interface RecommendationsProps {
  recommendations: string[];
  onApplyRecommendation?: (recommendation: string) => void;
}

const Recommendations: React.FC<RecommendationsProps> = ({ 
  recommendations, 
  onApplyRecommendation 
}) => {
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">No recommendations at this time</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recommendations.slice(0, 5).map((recommendation, index) => (
        <div 
          key={index}
          className="flex items-start gap-3 p-2 rounded-md bg-blue-50 border border-blue-200"
        >
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-900">{recommendation}</p>
          </div>
          {onApplyRecommendation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onApplyRecommendation(recommendation)}
              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
            >
              Apply
            </Button>
          )}
        </div>
      ))}
      
      {recommendations.length > 5 && (
        <p className="text-xs text-muted-foreground text-center">
          +{recommendations.length - 5} more recommendations
        </p>
      )}
    </div>
  );
};

/**
 * Helper function to determine severity for issue types
 */
function getSeverityForIssueType(issueType: QualityIssueType): 'low' | 'medium' | 'high' | 'critical' {
  switch (issueType) {
    case QualityIssueType.SLIVER_FACE:
    case QualityIssueType.MICRO_GAP:
      return 'medium';
    case QualityIssueType.SELF_INTERSECTION:
    case QualityIssueType.TOPOLOGICAL_ERROR:
      return 'critical';
    case QualityIssueType.DEGENERATE_ELEMENT:
    case QualityIssueType.GEOMETRIC_INCONSISTENCY:
      return 'high';
    case QualityIssueType.TOLERANCE_VIOLATION:
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * Main Quality Metrics Dashboard Component
 */
export const QualityMetricsDashboard: React.FC<QualityMetricsDashboardProps> = ({
  wallData,
  selectedWallIds = [],
  onIssueClick,
  onGenerateReport,
  onRefreshMetrics,
  className
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter walls based on selection
  const relevantWalls = useMemo(() => {
    if (selectedWallIds.length === 0) {
      return wallData;
    }
    return wallData.filter(wall => selectedWallIds.includes(wall.id));
  }, [wallData, selectedWallIds]);

  // Aggregate quality metrics
  const aggregatedMetrics = useMemo((): AggregatedQualityMetrics => {
    if (relevantWalls.length === 0) {
      return {
        overallScore: 0,
        geometricAccuracy: 0,
        topologicalConsistency: 0,
        manufacturability: 0,
        architecturalCompliance: 0,
        totalIssues: 0,
        issueBreakdown: {} as Record<QualityIssueType, number>,
        performanceMetrics: {
          averageComplexity: 0,
          averageProcessingTime: 0,
          totalMemoryUsage: 0,
          processingEfficiency: 0
        },
        recommendations: [],
        wallCount: 0,
        lastUpdated: new Date()
      };
    }

    const wallsWithMetrics = relevantWalls.filter(wall => wall.bimGeometry?.qualityMetrics);
    
    if (wallsWithMetrics.length === 0) {
      return {
        overallScore: 0.8, // Default score for walls without BIM metrics
        geometricAccuracy: 0.8,
        topologicalConsistency: 0.8,
        manufacturability: 0.8,
        architecturalCompliance: 0.8,
        totalIssues: 0,
        issueBreakdown: {} as Record<QualityIssueType, number>,
        performanceMetrics: {
          averageComplexity: 0.5,
          averageProcessingTime: 100,
          totalMemoryUsage: relevantWalls.length * 1024,
          processingEfficiency: 0.8
        },
        recommendations: ['Generate BIM geometry to get detailed quality metrics'],
        wallCount: relevantWalls.length,
        lastUpdated: new Date()
      };
    }

    // Calculate averages
    const totalMetrics = wallsWithMetrics.reduce((acc, wall) => {
      const metrics = wall.bimGeometry!.qualityMetrics;
      return {
        geometricAccuracy: acc.geometricAccuracy + metrics.geometricAccuracy,
        topologicalConsistency: acc.topologicalConsistency + metrics.topologicalConsistency,
        manufacturability: acc.manufacturability + metrics.manufacturability,
        architecturalCompliance: acc.architecturalCompliance + metrics.architecturalCompliance,
        complexity: acc.complexity + metrics.complexity,
        processingEfficiency: acc.processingEfficiency + metrics.processingEfficiency,
        memoryUsage: acc.memoryUsage + metrics.memoryUsage
      };
    }, {
      geometricAccuracy: 0,
      topologicalConsistency: 0,
      manufacturability: 0,
      architecturalCompliance: 0,
      complexity: 0,
      processingEfficiency: 0,
      memoryUsage: 0
    });

    const count = wallsWithMetrics.length;
    const avgGeometric = totalMetrics.geometricAccuracy / count;
    const avgTopological = totalMetrics.topologicalConsistency / count;
    const avgManufacturability = totalMetrics.manufacturability / count;
    const avgArchitectural = totalMetrics.architecturalCompliance / count;

    // Calculate issue breakdown
    const issueBreakdown: Record<QualityIssueType, number> = {} as Record<QualityIssueType, number>;
    let totalIssues = 0;

    wallsWithMetrics.forEach(wall => {
      const metrics = wall.bimGeometry!.qualityMetrics;
      totalIssues += metrics.sliverFaceCount + metrics.microGapCount + 
                    metrics.selfIntersectionCount + metrics.degenerateElementCount;
      
      // Map specific counts to issue types
      issueBreakdown[QualityIssueType.SLIVER_FACE] = 
        (issueBreakdown[QualityIssueType.SLIVER_FACE] || 0) + metrics.sliverFaceCount;
      issueBreakdown[QualityIssueType.MICRO_GAP] = 
        (issueBreakdown[QualityIssueType.MICRO_GAP] || 0) + metrics.microGapCount;
      issueBreakdown[QualityIssueType.SELF_INTERSECTION] = 
        (issueBreakdown[QualityIssueType.SELF_INTERSECTION] || 0) + metrics.selfIntersectionCount;
      issueBreakdown[QualityIssueType.DEGENERATE_ELEMENT] = 
        (issueBreakdown[QualityIssueType.DEGENERATE_ELEMENT] || 0) + metrics.degenerateElementCount;

      // Add issues from the issues array
      metrics.issues.forEach(issue => {
        issueBreakdown[issue.type] = (issueBreakdown[issue.type] || 0) + 1;
      });
    });

    // Generate recommendations
    const recommendations: string[] = [];
    if (avgGeometric < 0.8) {
      recommendations.push('Consider adjusting tolerance settings to improve geometric accuracy');
    }
    if (totalIssues > wallsWithMetrics.length * 2) {
      recommendations.push('Run shape healing operations to reduce geometric issues');
    }
    if (totalMetrics.processingEfficiency / count < 0.7) {
      recommendations.push('Optimize wall complexity to improve processing performance');
    }
    if (issueBreakdown[QualityIssueType.SELF_INTERSECTION] > 0) {
      recommendations.push('Critical: Resolve self-intersections immediately');
    }

    return {
      overallScore: (avgGeometric + avgTopological + avgManufacturability + avgArchitectural) / 4,
      geometricAccuracy: avgGeometric,
      topologicalConsistency: avgTopological,
      manufacturability: avgManufacturability,
      architecturalCompliance: avgArchitectural,
      totalIssues,
      issueBreakdown,
      performanceMetrics: {
        averageComplexity: totalMetrics.complexity / count,
        averageProcessingTime: wallsWithMetrics.reduce((sum, wall) => 
          sum + (wall.bimGeometry?.wallSolid.processingTime || 0), 0) / count,
        totalMemoryUsage: totalMetrics.memoryUsage,
        processingEfficiency: totalMetrics.processingEfficiency / count
      },
      recommendations,
      wallCount: relevantWalls.length,
      lastUpdated: new Date()
    };
  }, [relevantWalls]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefreshMetrics?.();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshMetrics]);

  const handleIssueTypeClick = useCallback((issueType: QualityIssueType) => {
    // Find first wall with this issue type and trigger click
    const wallWithIssue = relevantWalls.find(wall => {
      const metrics = wall.bimGeometry?.qualityMetrics;
      if (!metrics) return false;
      
      return metrics.issues.some(issue => issue.type === issueType) ||
             (issueType === QualityIssueType.SLIVER_FACE && metrics.sliverFaceCount > 0) ||
             (issueType === QualityIssueType.MICRO_GAP && metrics.microGapCount > 0) ||
             (issueType === QualityIssueType.SELF_INTERSECTION && metrics.selfIntersectionCount > 0) ||
             (issueType === QualityIssueType.DEGENERATE_ELEMENT && metrics.degenerateElementCount > 0);
    });

    if (wallWithIssue && onIssueClick) {
      const issue = wallWithIssue.bimGeometry?.qualityMetrics.issues.find(i => i.type === issueType);
      if (issue) {
        onIssueClick(issue, wallWithIssue.id);
      }
    }
  }, [relevantWalls, onIssueClick]);

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Quality Dashboard</h3>
            <Badge variant="outline" className="text-xs">
              {aggregatedMetrics.wallCount} walls
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="h-8 px-3 text-xs"
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDetails ? 'Less' : 'More'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 px-3 text-xs"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
            
            {onGenerateReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateReport}
                className="h-8 px-3 text-xs"
              >
                <Download className="h-4 w-4 mr-1" />
                Report
              </Button>
            )}
          </div>
        </div>

        {/* Overall Quality Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overall Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QualityScore
              score={aggregatedMetrics.overallScore}
              label="Quality Score"
              showTrend={false}
            />
            
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Last updated: {aggregatedMetrics.lastUpdated.toLocaleTimeString()}</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Real-time</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Metrics */}
        {showDetails && (
          <>
            {/* Individual Quality Metrics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quality Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <QualityScore
                  score={aggregatedMetrics.geometricAccuracy}
                  label="Geometric Accuracy"
                />
                <QualityScore
                  score={aggregatedMetrics.topologicalConsistency}
                  label="Topological Consistency"
                />
                <QualityScore
                  score={aggregatedMetrics.manufacturability}
                  label="Manufacturability"
                />
                <QualityScore
                  score={aggregatedMetrics.architecturalCompliance}
                  label="Architectural Compliance"
                />
              </CardContent>
            </Card>

            {/* Issue Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Issues Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <IssueBreakdown
                  issueBreakdown={aggregatedMetrics.issueBreakdown}
                  totalIssues={aggregatedMetrics.totalIssues}
                  onIssueTypeClick={handleIssueTypeClick}
                />
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceMetrics
                  metrics={aggregatedMetrics.performanceMetrics}
                  wallCount={aggregatedMetrics.wallCount}
                />
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Recommendations
                  recommendations={aggregatedMetrics.recommendations}
                  onApplyRecommendation={(recommendation) => {
                    console.log('Apply recommendation:', recommendation);
                    // Implementation would depend on the specific recommendation
                  }}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

export default QualityMetricsDashboard;