/**
 * Simple JavaScript test to verify basic BIM concepts work
 */

console.log('🔧 Testing Basic BIM Concepts...');

// Test basic geometric calculations
function testBasicGeometry() {
  console.log('Testing basic geometry...');
  
  // Simple point class
  class Point {
    constructor(x, y, id) {
      this.x = x;
      this.y = y;
      this.id = id;
    }
    
    distanceTo(other) {
      return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
    }
  }
  
  // Simple curve class
  class Curve {
    constructor(points) {
      this.points = points;
    }
    
    getLength() {
      let length = 0;
      for (let i = 1; i < this.points.length; i++) {
        length += this.points[i-1].distanceTo(this.points[i]);
      }
      return length;
    }
  }
  
  // Test points
  const p1 = new Point(0, 0, 'p1');
  const p2 = new Point(100, 0, 'p2');
  const p3 = new Point(100, 100, 'p3');
  const p4 = new Point(0, 100, 'p4');
  
  console.log('✅ Created points:', p1.id, p2.id, p3.id, p4.id);
  
  // Test curve
  const curve = new Curve([p1, p2, p3, p4]);
  const length = curve.getLength();
  
  console.log('✅ Curve length:', length);
  console.log('✅ Expected length: ~300 (100 + 100 + 100)');
  
  return Math.abs(length - 300) < 1; // Allow small floating point errors
}

// Test basic wall concept
function testBasicWall() {
  console.log('Testing basic wall concept...');
  
  class Wall {
    constructor(id, baseline, thickness) {
      this.id = id;
      this.baseline = baseline;
      this.thickness = thickness;
    }
    
    getArea() {
      return this.baseline.getLength() * this.thickness;
    }
  }
  
  // Create a simple rectangular baseline
  const points = [
    { x: 0, y: 0, id: 'p1', distanceTo: function(other) { 
      return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2)); 
    }},
    { x: 200, y: 0, id: 'p2', distanceTo: function(other) { 
      return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2)); 
    }}
  ];
  
  const baseline = {
    points: points,
    getLength: function() {
      return points[0].distanceTo(points[1]);
    }
  };
  
  const wall = new Wall('wall1', baseline, 10);
  const area = wall.getArea();
  
  console.log('✅ Wall created:', wall.id);
  console.log('✅ Wall area:', area);
  console.log('✅ Expected area: 2000 (200 * 10)');
  
  return Math.abs(area - 2000) < 1;
}

// Run tests
try {
  const geometryTest = testBasicGeometry();
  const wallTest = testBasicWall();
  
  if (geometryTest && wallTest) {
    console.log('🎉 All basic BIM concept tests passed!');
    console.log('✅ Basic geometry calculations work');
    console.log('✅ Basic wall concepts work');
    console.log('✅ Ready to proceed with TypeScript compilation fixes');
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
}