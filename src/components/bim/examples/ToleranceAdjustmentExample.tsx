import React, { useState } from 'react';
import { ToleranceAdjustmentUI } from '../ToleranceAdjustmentUI';
import { UnifiedWallData } from '../../../lib/bim/data/UnifiedWallData';
import type { WallTypeString } from '../../../lib/types';

/**
 * Example component demonstrating ToleranceAdjustmentUI usage
 * This shows how to integrate the tolerance adjustment component
 * into a larger BIM wall editing interface.
 */
export const ToleranceAdjustmentExample: React.FC = () => {
  const [currentTolerance, setCurrentTolerance] = useState(0.05);
  const [showDialog, setShowDialog] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Mock wall data for demonstration
  const mockWallData: any = {
    id: 'example-wall-1',
    type: 'Layout' as WallTypeString,
    thickness: 15.0,
    visible: true,
    baseline: {
      id: 'baseline-1',
      points: [
        { x: 0, y: 0, id: 'p1', tolerance: 1e-6, creationMethod: 'example', accuracy: 1, validated: true } as any,
        { x: 200, y: 0, id: 'p2', tolerance: 1e-6, creationMethod: 'example', accuracy: 1, validated: true } as any,
        { x: 200, y: 100, id: 'p3', tolerance: 1e-6, creationMethod: 'example', accuracy: 1, validated: true } as any
      ],
      type: 'polyline' as any,
      isClosed: false,
      length: 300,
      boundingBox: { minX: 0, minY: 0, maxX: 200, maxY: 100 },
      curvature: [0, 0, 0],
      tangents: [] as any
    },
    basicGeometry: {
      segments: [],
      nodes: [],
      polygons: []
    },
    isBasicModeValid: true,
    isBIMModeValid: true,
    lastModifiedMode: 'basic' as const,
    requiresSync: false
  };

  const handleToleranceChange = (newTolerance: number) => {
    console.log('Preview tolerance change:', newTolerance);
    // In a real application, this would update the preview
  };

  const handleApply = async (tolerance: number) => {
    setIsApplying(true);
    try {
      // Simulate API call or processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCurrentTolerance(tolerance);
      setShowDialog(false);
      
      console.log('Applied new tolerance:', tolerance);
      alert(`Tolerance successfully updated to ${tolerance.toFixed(4)}`);
    } catch (error) {
      console.error('Failed to apply tolerance:', error);
      alert('Failed to apply tolerance changes');
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    console.log('Tolerance adjustment cancelled');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Tolerance Adjustment Example</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Current Wall Settings</h3>
        <p><strong>Wall ID:</strong> {mockWallData.id}</p>
        <p><strong>Thickness:</strong> {mockWallData.thickness} units</p>
        <p><strong>Current Tolerance:</strong> {currentTolerance.toFixed(4)}</p>
      </div>

      <button
        onClick={() => setShowDialog(true)}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Adjust Tolerance
      </button>

      {showDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <ToleranceAdjustmentUI
              wallData={mockWallData}
              currentTolerance={currentTolerance}
              onToleranceChange={handleToleranceChange}
              onApply={handleApply}
              onCancel={handleCancel}
              showPreview={true}
            />
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Integration Notes:</h4>
        <ul>
          <li>The component provides real-time preview when enabled</li>
          <li>Tolerance recommendations are based on wall thickness and geometry</li>
          <li>Validation prevents invalid tolerance values</li>
          <li>Impact analysis shows quality and performance effects</li>
          <li>All interactions are fully accessible via keyboard</li>
        </ul>
      </div>
    </div>
  );
};

export default ToleranceAdjustmentExample;