/**
 * Simple test runner to verify the FloorPlanModel implementation
 * This can be run directly with Node.js to test the core functionality
 */

import { FloorPlanModel } from './FloorPlanModel';
// import type { WallType } from './types';

function runTests() {
  console.log('🧪 Running FloorPlanModel tests...\n');
  
  const model = new FloorPlanModel();
  let testsPassed = 0;
  let testsTotal = 0;

  function test(name: string, testFn: () => boolean) {
    testsTotal++;
    try {
      const result = testFn();
      if (result) {
        console.log(`✅ ${name}`);
        testsPassed++;
      } else {
        console.log(`❌ ${name}`);
      }
    } catch (error) {
      console.log(`❌ ${name} - Error: ${error}`);
    }
  }

  // Test Node operations
  test('Create node', () => {
    const node = model.createNode(100, 200, 'endpoint');
    return node.x === 100 && node.y === 200 && node.type === 'endpoint';
  });

  test('Get node by ID', () => {
    const node = model.createNode(50, 75);
    const retrieved = model.getNode(node.id);
    return retrieved !== undefined && retrieved.id === node.id;
  });

  test('Update node position', () => {
    const node = model.createNode(10, 20);
    const success = model.updateNode(node.id, 30, 40);
    const updated = model.getNode(node.id);
    return success && updated !== undefined && updated.x === 30 && updated.y === 40;
  });

  // Test Segment operations
  test('Create segment', () => {
    const node1 = model.createNode(0, 0);
    const node2 = model.createNode(10, 0);
    const segment = model.createSegment(node1.id, node2.id);
    return segment !== null && segment.length === 10 && segment.angle === 0;
  });

  test('Segment updates node connections', () => {
    const node1 = model.createNode(0, 0);
    const node2 = model.createNode(10, 0);
    const segment = model.createSegment(node1.id, node2.id);
    const updatedNode1 = model.getNode(node1.id);
    return segment !== null && 
           updatedNode1 !== undefined && 
           updatedNode1.connectedSegments.includes(segment.id);
  });

  // Test Wall operations
  test('Create wall with correct thickness', () => {
    const layoutWall = model.createWall('layout');
    const zoneWall = model.createWall('zone');
    const areaWall = model.createWall('area');
    return layoutWall.thickness === 350 && 
           zoneWall.thickness === 250 && 
           areaWall.thickness === 150;
  });

  test('Create wall with segments', () => {
    const node1 = model.createNode(0, 0);
    const node2 = model.createNode(10, 0);
    const segment = model.createSegment(node1.id, node2.id);
    const wall = model.createWall('zone', segment ? [segment.id] : []);
    const updatedSegment = segment ? model.getSegment(segment.id) : null;
    return wall.segmentIds.length === 1 && 
           updatedSegment !== null && 
           updatedSegment !== undefined &&
           updatedSegment.wallId === wall.id;
  });

  // Test complex operations
  test('Delete node removes connected segments', () => {
    const node1 = model.createNode(0, 0);
    const node2 = model.createNode(10, 0);
    const segment = model.createSegment(node1.id, node2.id);
    const segmentId = segment?.id;
    
    model.deleteNode(node1.id);
    
    return segmentId !== undefined && model.getSegment(segmentId) === undefined;
  });

  test('Data summary works correctly', () => {
    model.clear();
    // const node1 = model.createNode(0, 0);
    // const node2 = model.createNode(10, 0);
    // const segment = model.createSegment(node1.id, node2.id);
    // const wall = model.createWall('layout', segment ? [segment.id] : []);
    
    const summary = model.getDataSummary();
    return summary.nodeCount === 0 && 
           summary.segmentCount === 0 && 
           summary.wallCount === 0;
  });

  // Test integration scenario
  test('Create rectangular room', () => {
    model.clear();
    
    // Create corners of a rectangle
    const corner1 = model.createNode(0, 0);
    // const corner2 = model.createNode(100, 0);
    // const corner3 = model.createNode(100, 100);
    // const corner4 = model.createNode(0, 100);
    
    // Create segments for walls
    // const seg1 = model.createSegment(corner1.id, corner2.id);
    // const seg2 = model.createSegment(corner2.id, corner3.id);
    // const seg3 = model.createSegment(corner3.id, corner4.id);
    // const seg4 = model.createSegment(corner4.id, corner1.id);
    
    // Create walls
    // const wall1 = model.createWall('layout', seg1 ? [seg1.id] : []);
    // const wall2 = model.createWall('layout', seg2 ? [seg2.id] : []);
    // const wall3 = model.createWall('layout', seg3 ? [seg3.id] : []);
    // const wall4 = model.createWall('layout', seg4 ? [seg4.id] : []);
    
    const summary = model.getDataSummary();
    const connectedSegs1 = model.getConnectedSegments(corner1.id);
    
    return summary.nodeCount === 4 && 
           summary.segmentCount === 4 && 
           summary.wallCount === 4 &&
           connectedSegs1.length === 2; // Corner connects to 2 segments
  });

  console.log(`\n📊 Test Results: ${testsPassed}/${testsTotal} tests passed`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed! FloorPlanModel implementation is working correctly.');
    return true;
  } else {
    console.log('❌ Some tests failed. Please check the implementation.');
    return false;
  }
}

// Run the tests
runTests();