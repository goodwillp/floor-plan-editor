/**
 * IntelligentBIMModeToggle Component
 * 
 * React component with compatibility checking for BIM mode switching
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database,
  Zap,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Mode switch result interface
 */
export interface ModeSwitchResult {
  success: boolean;
  convertedWalls: string[];
  failedWalls: string[];
  warnings: string[];
  preservedData: boolean;
  processingTime: number;
  qualityImpact: number;
  approximationsUsed: string[];
}

/**
 * Compatibility status interface
 */
export interface CompatibilityStatus {
  isCompatible: boolean;
  canSwitchToBIM: boolean;
  canSwitchToBasic: boolean;
  potentialDataLoss: string[];
  recommendedActions: string[];
  estimatedProcessingTime: number;
  qualityImpact: number;
}

/**
 * BIM mode toggle props
 */
export interface IntelligentBIMModeToggleProps {
  isActive: boolean;
  canSwitch: boolean;
  switchInProgress: boolean;
  compatibilityStatus: CompatibilityStatus;
  dataPreservationGuarantee: boolean;
  onToggleRequest: (targetMode: 'basic' | 'bim') => Promise<ModeSwitchResult>;
  className?: string;
}

/**
 * Confirmation dialog props
 */
interface ConfirmationDialogProps {
  isOpen: boolean;
  targetMode: 'basic' | 'bim';
  compatibilityStatus: CompatibilityStatus;
  dataPreservationGuarantee: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Progress dialog props
 */
interface ProgressDialogProps {
  isOpen: boolean;
  progress: number;
  currentOperation: string;
  estimatedTimeRemaining: number;
}

/**
 * Confirmation dialog component
 */
const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  targetMode,
  compatibilityStatus,
  dataPreservationGuarantee,
  onConfirm,
  onCancel
}) => {
  const isSwitchingToBIM = targetMode === 'bim';
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Switch to {isSwitchingToBIM ? 'BIM' : 'Basic'} Mode
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Compatibility Status */}
          <div className="flex items-center gap-2">
            {compatibilityStatus.isCompatible ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">
              {compatibilityStatus.isCompatible ? 'Compatible' : 'Compatibility Issues'}
            </span>
          </div>

          {/* Data Preservation Status */}
          <div className="flex items-center gap-2">
            {dataPreservationGuarantee ? (
              <Shield className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            <span className="text-sm font-medium">
              {dataPreservationGuarantee ? 'Data Preserved' : 'Potential Data Loss'}
            </span>
          </div>

          {/* Processing Time Estimate */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-sm">
              Estimated time: {Math.round(compatibilityStatus.estimatedProcessingTime / 1000)}s
            </span>
          </div>

          {/* Quality Impact */}
          {compatibilityStatus.qualityImpact > 0 && (
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-orange-500" />
              <span className="text-sm">
                Quality impact: {Math.round(compatibilityStatus.qualityImpact * 100)}%
              </span>
            </div>
          )}

          {/* Warnings */}
          {compatibilityStatus.potentialDataLoss.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="text-sm font-medium mb-1">Potential Data Loss:</div>
                <ul className="text-xs space-y-1">
                  {compatibilityStatus.potentialDataLoss.map((loss, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-amber-500">•</span>
                      {loss}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Recommendations */}
          {compatibilityStatus.recommendedActions.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Recommendations:</div>
              <ul className="text-xs space-y-1">
                {compatibilityStatus.recommendedActions.map((action, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-blue-500">•</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={!compatibilityStatus.isCompatible}
            className={cn(
              compatibilityStatus.isCompatible 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-400'
            )}
          >
            Switch to {isSwitchingToBIM ? 'BIM' : 'Basic'} Mode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Progress dialog component
 */
const ProgressDialog: React.FC<ProgressDialogProps> = ({
  isOpen,
  progress,
  currentOperation,
  estimatedTimeRemaining
}) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 animate-pulse" />
            Switching Mode...
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Progress value={progress} className="w-full" />
          
          <div className="text-sm text-muted-foreground">
            {currentOperation}
          </div>
          
          {estimatedTimeRemaining > 0 && (
            <div className="text-xs text-muted-foreground">
              Estimated time remaining: {Math.round(estimatedTimeRemaining / 1000)}s
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Intelligent BIM Mode Toggle Component
 */
export const IntelligentBIMModeToggle: React.FC<IntelligentBIMModeToggleProps> = ({
  isActive,
  canSwitch,
  switchInProgress,
  compatibilityStatus,
  dataPreservationGuarantee,
  onToggleRequest,
  className
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [targetMode, setTargetMode] = useState<'basic' | 'bim'>('basic');
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);

  const handleConfirmedSwitch = useCallback(async () => {
    setShowConfirmation(false);
    setShowProgress(true);
    setProgress(0);
    setCurrentOperation('Initializing mode switch...');
    setEstimatedTimeRemaining(compatibilityStatus.estimatedProcessingTime);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + 10, 90);
          setEstimatedTimeRemaining(prev => Math.max(0, prev - 100));
          
          if (newProgress < 30) {
            setCurrentOperation('Validating wall geometry...');
          } else if (newProgress < 60) {
            setCurrentOperation('Converting wall representations...');
          } else if (newProgress < 90) {
            setCurrentOperation('Updating visual display...');
          }
          
          return newProgress;
        });
      }, 200);

      const result = await onToggleRequest(targetMode);
      
      clearInterval(progressInterval);
      setProgress(100);
      setCurrentOperation('Mode switch completed');
      
      // Show completion for a moment
      setTimeout(() => {
        setShowProgress(false);
      }, 1000);

      if (!result.success) {
        console.error('Mode switch failed:', result);
        // Could show error dialog here
      }
    } catch (error) {
      console.error('Mode switch error:', error);
      setShowProgress(false);
      // Could show error dialog here
    }
  }, [targetMode, compatibilityStatus.estimatedProcessingTime, onToggleRequest]);

  const handleToggleClick = useCallback((checked: boolean) => {
    if (switchInProgress) return;
    
    const newTargetMode = checked ? 'bim' : 'basic';
    setTargetMode(newTargetMode);
    
    // Show confirmation dialog if there are compatibility issues or potential data loss
    if (!compatibilityStatus.isCompatible || !dataPreservationGuarantee) {
      setShowConfirmation(true);
    } else {
      handleConfirmedSwitch();
    }
  }, [switchInProgress, compatibilityStatus, dataPreservationGuarantee, handleConfirmedSwitch]);

  const handleCancelConfirmation = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  // Determine the status indicator
  const getStatusIndicator = () => {
    if (switchInProgress) {
      return <Zap className="h-3 w-3 animate-pulse text-blue-500" />;
    }
    
    if (!compatibilityStatus.isCompatible) {
      return <XCircle className="h-3 w-3 text-red-500" />;
    }
    
    if (!dataPreservationGuarantee) {
      return <AlertTriangle className="h-3 w-3 text-amber-500" />;
    }
    
    return <CheckCircle className="h-3 w-3 text-green-500" />;
  };

  const getTooltipContent = () => {
    if (switchInProgress) {
      return 'Mode switch in progress...';
    }
    
    if (!compatibilityStatus.isCompatible) {
      return 'Compatibility issues prevent mode switching';
    }
    
    if (!dataPreservationGuarantee) {
      return 'Mode switch may result in data approximations';
    }
    
    return isActive ? 'Switch to Basic mode' : 'Switch to BIM mode';
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        {/* Mode Label */}
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">BIM Mode</span>
          <Badge 
            variant={isActive ? 'default' : 'secondary'}
            className={cn(
              'text-xs',
              isActive ? 'bg-blue-600' : 'bg-gray-500'
            )}
          >
            {isActive ? 'ON' : 'OFF'}
          </Badge>
        </div>

        {/* Toggle Switch */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Switch
                checked={isActive}
                onCheckedChange={handleToggleClick}
                disabled={!canSwitch || switchInProgress}
                className={cn(
                  'data-[state=checked]:bg-blue-600',
                  (!canSwitch || switchInProgress) && 'opacity-50 cursor-not-allowed'
                )}
              />
              {getStatusIndicator()}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipContent()}</p>
          </TooltipContent>
        </Tooltip>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showConfirmation}
          targetMode={targetMode}
          compatibilityStatus={compatibilityStatus}
          dataPreservationGuarantee={dataPreservationGuarantee}
          onConfirm={handleConfirmedSwitch}
          onCancel={handleCancelConfirmation}
        />

        {/* Progress Dialog */}
        <ProgressDialog
          isOpen={showProgress}
          progress={progress}
          currentOperation={currentOperation}
          estimatedTimeRemaining={estimatedTimeRemaining}
        />
      </div>
    </TooltipProvider>
  );
};

export default IntelligentBIMModeToggle;