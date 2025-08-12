/**
 * Simple test to verify BIM processing functionality
 */

import { BIMWallSystem } from './BIMWallSystem';
import { BIMPointImpl } from './geometry/BIMPoint';
import { CurveImpl } from './geometry/Curve';
import { CurveType } from './types/BIMTypes';

export async function testBIMProcessing(): Promise<void> {
  console.log('🔧 Testing BIM Processing...');

  try {
    // Create a simple BIM wall system
    const bimSystem = new BIMWallSystem();

    // Create a simple wall with basic geometry
    const points = [
      new BIMPointImpl(0, 0, 'point1'),
      new BIMPointImpl(100, 0, 'point2'),
      new BIMPointImpl(100, 100, 'point3'),
      new BIMPointImpl(0, 100, 'point4')
    ];

    const baseline = new CurveImpl('baseline1', CurveType.POLYLINE, points);
    
    // Create a wall with the baseline
    const wallData = {
      id: 'test-wall-1',
      baseline: baseline,
      thickness: 10,
      wallType: 'interior'
    };

    console.log('✅ Created basic wall geometry');
    console.log('Wall ID:', wallData.id);
    console.log('Baseline points:', wallData.baseline.points.length);
    console.log('Wall thickness:', wallData.thickness);

    // Test basic geometric operations
    const length = baseline.getLength();
    console.log('✅ Calculated baseline length:', length);

    // Test point creation
    const testPoint = new BIMPointImpl(50, 50, 'test-point');
    console.log('✅ Created test point:', testPoint.id, 'at', testPoint.x, testPoint.y);

    console.log('🎉 BIM Processing test completed successfully!');
    
  } catch (error) {
    console.error('❌ BIM Processing test failed:', error);
    throw error;
  }
}

// Export for use in other modules
export { testBIMProcessing as default };