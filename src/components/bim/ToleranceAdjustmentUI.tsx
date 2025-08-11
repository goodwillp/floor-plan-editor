import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdaptiveToleranceManager } from '../../lib/bim/engines/AdaptiveToleranceManager';
import { ToleranceContext } from '../../lib/bim/types/ToleranceTypes';
import { UnifiedWallData } from '../../lib/bim/data/UnifiedWallData';
import './ToleranceAdjustmentUI.css';

interface ToleranceImpact {
  qualityChange: number;
  performanceImpact: number;
  affectedOperations: string[];
  warnings: string[];
}

interface ToleranceRecommendation {
  value: number;
  reason: string;
  confidence: number;
  context: ToleranceContext;
}

interface ToleranceValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  bounds: {
    min: number;
    max: number;
  };
}

interface ToleranceAdjustmentUIProps {
  wallData?: UnifiedWallData;
  currentTolerance: number;
  onToleranceChange: (tolerance: number) => void;
  onApply: (tolerance: number) => void;
  onCancel: () => void;
  className?: string;
  showPreview?: boolean;
}

export const ToleranceAdjustmentUI: React.FC<ToleranceAdjustmentUIProps> = ({
  wallData,
  currentTolerance,
  onToleranceChange,
  onApply,
  onCancel,
  className = '',
  showPreview = true
}) => {
  const [tolerance, setTolerance] = useState(currentTolerance);
  const [previewEnabled, setPreviewEnabled] = useState(showPreview);
  const [isApplying, setIsApplying] = useState(false);
  
  const toleranceManager = useMemo(() => new AdaptiveToleranceManager(), []);

  // Calculate tolerance bounds based on wall data
  const toleranceBounds = useMemo(() => {
    if (!wallData) {
      return { min: 0.001, max: 10.0 };
    }

    const thickness = wallData.thickness;
    const minTolerance = thickness * 0.0001; // 0.01% of thickness
    const maxTolerance = thickness * 0.1;    // 10% of thickness

    return {
      min: Math.max(0.001, minTolerance),
      max: Math.min(10.0, maxTolerance)
    };
  }, [wallData]);

  // Generate tolerance recommendations
  const recommendations = useMemo((): ToleranceRecommendation[] => {
    if (!wallData) return [];

    const thickness = wallData.thickness;
    const recs: ToleranceRecommendation[] = [];

    // Conservative recommendation
    const conservative = toleranceManager.calculateTolerance(
      thickness,
      0.001, // High precision
      90,    // Right angle
      ToleranceContext.VERTEX_MERGE
    );
    recs.push({
      value: conservative,
      reason: 'Conservative - High precision, slower performance',
      confidence: 0.9,
      context: ToleranceContext.VERTEX_MERGE
    });

    // Balanced recommendation
    const balanced = toleranceManager.calculateTolerance(
      thickness,
      0.01,  // Medium precision
      45,    // Moderate angle
      ToleranceContext.OFFSET_OPERATION
    );
    recs.push({
      value: balanced,
      reason: 'Balanced - Good precision and performance',
      confidence: 0.95,
      context: ToleranceContext.OFFSET_OPERATION
    });

    // Performance recommendation
    const performance = toleranceManager.calculateTolerance(
      thickness,
      0.1,   // Lower precision
      30,    // Shallow angle
      ToleranceContext.BOOLEAN_OPERATION
    );
    recs.push({
      value: performance,
      reason: 'Performance - Faster operations, lower precision',
      confidence: 0.8,
      context: ToleranceContext.BOOLEAN_OPERATION
    });

    return recs.sort((a, b) => b.confidence - a.confidence);
  }, [wallData, toleranceManager]);

  // Validate current tolerance
  const validation = useMemo((): ToleranceValidation => {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (tolerance < toleranceBounds.min) {
      errors.push(`Tolerance too small (minimum: ${toleranceBounds.min.toFixed(4)})`);
    }
    if (tolerance > toleranceBounds.max) {
      errors.push(`Tolerance too large (maximum: ${toleranceBounds.max.toFixed(4)})`);
    }

    if (wallData) {
      const thickness = wallData.thickness;
      
      if (tolerance > thickness * 0.05) {
        warnings.push('Large tolerance may affect geometric accuracy');
      }
      if (tolerance < thickness * 0.0005) {
        warnings.push('Very small tolerance may cause performance issues');
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      bounds: toleranceBounds
    };
  }, [tolerance, toleranceBounds, wallData]);

  // Calculate tolerance impact
  const impact = useMemo((): ToleranceImpact => {
    if (!wallData) {
      return {
        qualityChange: 0,
        performanceImpact: 0,
        affectedOperations: [],
        warnings: []
      };
    }

    const currentQuality = 1.0; // Baseline quality
    const newQuality = Math.max(0, Math.min(1, 1 - (tolerance - currentTolerance) * 10));
    const qualityChange = newQuality - currentQuality;

    // Performance impact (inverse relationship with tolerance)
    const performanceImpact = (currentTolerance - tolerance) * 5;

    const affectedOperations = [
      'Vertex merging',
      'Offset operations',
      'Boolean operations',
      'Shape healing'
    ];

    const warnings: string[] = [];
    if (Math.abs(qualityChange) > 0.1) {
      warnings.push('Significant quality impact expected');
    }
    if (Math.abs(performanceImpact) > 0.2) {
      warnings.push('Notable performance change expected');
    }

    return {
      qualityChange,
      performanceImpact,
      affectedOperations,
      warnings
    };
  }, [tolerance, currentTolerance, wallData]);

  // Handle tolerance slider change
  const handleToleranceChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newTolerance = parseFloat(event.target.value);
    setTolerance(newTolerance);
    
    if (previewEnabled) {
      onToleranceChange(newTolerance);
    }
  }, [previewEnabled, onToleranceChange]);

  // Handle direct input change
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      setTolerance(value);
      if (previewEnabled) {
        onToleranceChange(value);
      }
    }
  }, [previewEnabled, onToleranceChange]);

  // Apply tolerance
  const handleApply = useCallback(async () => {
    if (!validation.isValid) return;

    setIsApplying(true);
    try {
      await onApply(tolerance);
    } finally {
      setIsApplying(false);
    }
  }, [tolerance, validation.isValid, onApply]);

  // Apply recommendation
  const handleApplyRecommendation = useCallback((recommendation: ToleranceRecommendation) => {
    setTolerance(recommendation.value);
    if (previewEnabled) {
      onToleranceChange(recommendation.value);
    }
  }, [previewEnabled, onToleranceChange]);

  // Reset to current tolerance
  const handleReset = useCallback(() => {
    setTolerance(currentTolerance);
    if (previewEnabled) {
      onToleranceChange(currentTolerance);
    }
  }, [currentTolerance, previewEnabled, onToleranceChange]);

  // Update tolerance when prop changes
  useEffect(() => {
    setTolerance(currentTolerance);
  }, [currentTolerance]);

  return (
    <div className={`tolerance-adjustment-ui ${className}`}>
      <div className="tolerance-header">
        <h3>Tolerance Adjustment</h3>
        <div className="tolerance-controls">
          <label className="preview-toggle">
            <input
              type="checkbox"
              checked={previewEnabled}
              onChange={(e) => setPreviewEnabled(e.target.checked)}
            />
            Real-time Preview
          </label>
        </div>
      </div>

      {/* Current Values */}
      <div className="tolerance-current">
        <div className="current-value">
          <label>Current Tolerance:</label>
          <span className="value">{currentTolerance.toFixed(4)}</span>
        </div>
        {wallData && (
          <div className="wall-info">
            <label>Wall Thickness:</label>
            <span className="value">{wallData.thickness.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Tolerance Slider */}
      <div className="tolerance-slider-section">
        <label htmlFor="tolerance-slider">Tolerance Value:</label>
        <div className="slider-container">
          <input
            id="tolerance-slider"
            type="range"
            min={toleranceBounds.min}
            max={toleranceBounds.max}
            step={(toleranceBounds.max - toleranceBounds.min) / 1000}
            value={tolerance}
            onChange={handleToleranceChange}
            className={`tolerance-slider ${!validation.isValid ? 'invalid' : ''}`}
          />
          <div className="slider-labels">
            <span className="min-label">{toleranceBounds.min.toFixed(4)}</span>
            <span className="max-label">{toleranceBounds.max.toFixed(4)}</span>
          </div>
        </div>
        
        <div className="tolerance-input">
          <input
            type="number"
            value={tolerance.toFixed(4)}
            onChange={handleInputChange}
            min={toleranceBounds.min}
            max={toleranceBounds.max}
            step="0.0001"
            className={!validation.isValid ? 'invalid' : ''}
          />
        </div>
      </div>

      {/* Validation Messages */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="tolerance-validation">
          {validation.errors.map((error, index) => (
            <div key={index} className="validation-error">
              ⚠️ {error}
            </div>
          ))}
          {validation.warnings.map((warning, index) => (
            <div key={index} className="validation-warning">
              ⚡ {warning}
            </div>
          ))}
        </div>
      )}

      {/* Impact Visualization */}
      <div className="tolerance-impact">
        <h4>Impact Analysis</h4>
        
        <div className="impact-metrics">
          <div className="impact-metric">
            <label>Quality Change:</label>
            <div className="impact-bar">
              <div 
                className={`impact-fill ${impact.qualityChange >= 0 ? 'positive' : 'negative'}`}
                style={{ width: `${Math.abs(impact.qualityChange) * 100}%` }}
              />
            </div>
            <span className="impact-value">
              {impact.qualityChange >= 0 ? '+' : ''}{(impact.qualityChange * 100).toFixed(1)}%
            </span>
          </div>
          
          <div className="impact-metric">
            <label>Performance Impact:</label>
            <div className="impact-bar">
              <div 
                className={`impact-fill ${impact.performanceImpact >= 0 ? 'positive' : 'negative'}`}
                style={{ width: `${Math.abs(impact.performanceImpact) * 100}%` }}
              />
            </div>
            <span className="impact-value">
              {impact.performanceImpact >= 0 ? '+' : ''}{(impact.performanceImpact * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {impact.affectedOperations.length > 0 && (
          <div className="affected-operations">
            <label>Affected Operations:</label>
            <ul>
              {impact.affectedOperations.map((operation, index) => (
                <li key={index}>{operation}</li>
              ))}
            </ul>
          </div>
        )}

        {impact.warnings.length > 0 && (
          <div className="impact-warnings">
            {impact.warnings.map((warning, index) => (
              <div key={index} className="impact-warning">
                ⚠️ {warning}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="tolerance-recommendations">
          <h4>Recommendations</h4>
          {recommendations.map((rec, index) => (
            <div key={index} className="recommendation">
              <div className="recommendation-header">
                <span className="recommendation-value">{rec.value.toFixed(4)}</span>
                <span className="recommendation-confidence">
                  {(rec.confidence * 100).toFixed(0)}% confidence
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyRecommendation(rec)}
                  className="apply-recommendation"
                  disabled={isApplying}
                >
                  Apply
                </button>
              </div>
              <div className="recommendation-reason">{rec.reason}</div>
              <div className="recommendation-context">Context: {rec.context}</div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="tolerance-actions">
        <button
          type="button"
          onClick={handleReset}
          className="reset-button"
          disabled={isApplying || tolerance === currentTolerance}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cancel-button"
          disabled={isApplying}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="apply-button"
          disabled={!validation.isValid || isApplying || tolerance === currentTolerance}
        >
          {isApplying ? 'Applying...' : 'Apply'}
        </button>
      </div>
    </div>
  );
};

export default ToleranceAdjustmentUI;