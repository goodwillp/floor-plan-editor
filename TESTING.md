# Floor Plan Editor - Testing Documentation

## Overview

This document describes the comprehensive testing strategy for the Floor Plan Editor application, covering unit tests, integration tests, visual regression tests, and end-to-end tests.

## Test Structure

```
src/test/
├── components/          # Component unit tests
├── hooks/              # React hooks tests
├── lib/                # Core library/service tests
├── integration/        # Integration tests
├── visual/             # Visual regression tests
├── setup.ts            # Test setup and mocking
└── visual-setup.ts     # Visual test utilities

cypress/
├── e2e/                # End-to-end tests
├── component/          # Component tests in isolation
└── support/            # Cypress support files
```

## Test Categories

### 1. Unit Tests

**Location**: `src/test/lib/`, `src/test/components/`, `src/test/hooks/`

**Purpose**: Test individual components, services, and utilities in isolation.

**Coverage Areas**:
- Data model operations (FloorPlanModel)
- Geometric calculations (GeometryService)
- Wall rendering logic (WallRenderer)
- UI components (ToolPalette, StatusBar, etc.)
- React hooks (useDrawing, useWallSelection, etc.)
- Error handling (ErrorHandler)

**Key Test Files**:
- `FloorPlanModel.comprehensive.test.ts` - Complete data model testing
- `GeometryService.test.ts` - Mathematical operations
- `WallRenderer.test.ts` - Visual rendering logic
- `ErrorHandler.test.ts` - Error handling scenarios

### 2. Integration Tests

**Location**: `src/test/integration/`

**Purpose**: Test interactions between different parts of the system.

**Coverage Areas**:
- React-PixiJS integration
- Canvas drawing workflows
- Complete application workflows
- Data flow between components

**Key Test Files**:
- `canvas-integration.test.tsx` - PixiJS and React integration
- `app-workflow.test.tsx` - Complete user workflows
- `DrawingIntegration.test.tsx` - Drawing system integration

### 3. Visual Regression Tests

**Location**: `src/test/visual/`

**Purpose**: Ensure visual consistency of rendered elements.

**Coverage Areas**:
- Wall rendering accuracy
- Grid display consistency
- UI component appearance
- Canvas layer rendering

**Key Test Files**:
- `wall-rendering.test.tsx` - Wall visual accuracy
- `grid-rendering.test.tsx` - Grid display testing

### 4. End-to-End Tests

**Location**: `cypress/e2e/`

**Purpose**: Test complete user workflows in a real browser environment.

**Coverage Areas**:
- Floor plan creation workflows
- UI interactions and tool usage
- Error handling and recovery
- Reference image management

**Key Test Files**:
- `floor-plan-creation.cy.ts` - Complete floor plan workflows
- `ui-interactions.cy.ts` - Tool and UI testing
- `error-handling.cy.ts` - Error scenarios

## Running Tests

### All Tests
```bash
npm test                    # Run all tests in watch mode
npm test -- --run          # Run all tests once
npm run test:coverage      # Run tests with coverage report
```

### Specific Test Types
```bash
# Unit and integration tests
npm test -- --run src/test/

# Visual regression tests
npm run test:visual

# End-to-end tests
npm run test:e2e           # Headless mode
npm run test:e2e:open      # Interactive mode
```

### Coverage Reports
```bash
npm run test:coverage      # Generate coverage report
# Reports available in coverage/ directory
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- **Environment**: jsdom for DOM simulation
- **Setup Files**: Automatic mocking and test utilities
- **Coverage**: v8 provider with 80% thresholds
- **Timeout**: 10 seconds for complex tests

### Coverage Thresholds
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Excluded from Coverage
- Test files
- Configuration files
- Type definitions
- Main entry point
- Development utilities

## Mocking Strategy

### PixiJS Mocking
- Complete PixiJS Application mock
- Canvas context simulation
- Graphics object mocking
- Event handling simulation

### File API Mocking
- FileReader simulation
- Image loading mocking
- URL.createObjectURL mocking

### Browser API Mocking
- ResizeObserver
- IntersectionObserver
- Canvas 2D context

## Test Data and Fixtures

### Geometric Test Data
```typescript
// Standard test nodes
const testNodes = {
  origin: { x: 0, y: 0 },
  horizontal: { x: 100, y: 0 },
  vertical: { x: 0, y: 100 },
  diagonal: { x: 100, y: 100 }
}

// Wall type configurations
const wallTypes = {
  layout: { thickness: 350, type: WallType.LAYOUT },
  zone: { thickness: 250, type: WallType.ZONE },
  area: { thickness: 150, type: WallType.AREA }
}
```

### Visual Test Fixtures
- Reference images for comparison
- Canvas snapshots for regression testing
- Grid pattern references

## Continuous Integration

### GitHub Actions Workflow (`.github/workflows/test.yml`)
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
```

## Test Best Practices

### Unit Tests
1. **Isolation**: Each test should be independent
2. **Descriptive Names**: Clear test descriptions
3. **Arrange-Act-Assert**: Consistent test structure
4. **Edge Cases**: Test boundary conditions
5. **Error Scenarios**: Test failure paths

### Integration Tests
1. **Real Interactions**: Test actual component interactions
2. **User Perspective**: Test from user's point of view
3. **Data Flow**: Verify data flows correctly
4. **State Management**: Test state changes

### Visual Tests
1. **Consistent Environment**: Same rendering conditions
2. **Meaningful Comparisons**: Test visual differences that matter
3. **Tolerance Levels**: Account for minor rendering differences
4. **Baseline Management**: Keep visual baselines updated

### E2E Tests
1. **User Workflows**: Test complete user journeys
2. **Real Browser**: Test in actual browser environment
3. **Error Recovery**: Test error handling
4. **Performance**: Consider test execution time

## Debugging Tests

### Common Issues
1. **Async Operations**: Use proper async/await patterns
2. **Mock Timing**: Ensure mocks are set up before tests
3. **DOM Cleanup**: Clean up DOM between tests
4. **Memory Leaks**: Properly destroy test objects

### Debug Commands
```bash
# Run specific test with debug output
npm test -- --run --reporter=verbose src/test/specific.test.ts

# Run tests in UI mode
npm run test:ui

# Debug Cypress tests
npm run test:e2e:open
```

## Performance Testing

### Metrics Tracked
- Test execution time
- Memory usage during tests
- Canvas rendering performance
- Large dataset handling

### Performance Thresholds
- Unit tests: < 100ms each
- Integration tests: < 5s each
- E2E tests: < 30s each
- Memory usage: < 100MB per test suite

## Maintenance

### Regular Tasks
1. **Update Dependencies**: Keep testing libraries current
2. **Review Coverage**: Maintain coverage thresholds
3. **Update Baselines**: Refresh visual test baselines
4. **Performance Review**: Monitor test execution times

### Test Review Process
1. **New Features**: Require comprehensive tests
2. **Bug Fixes**: Add regression tests
3. **Refactoring**: Update affected tests
4. **Performance**: Add performance tests for critical paths

## Troubleshooting

### Common Test Failures
1. **PixiJS Initialization**: Check mocking setup
2. **Canvas Operations**: Verify canvas context mocking
3. **Async Operations**: Ensure proper waiting
4. **File Operations**: Check file API mocking

### Getting Help
1. Check test logs for specific error messages
2. Review mocking setup in `setup.ts`
3. Verify test environment configuration
4. Check for dependency conflicts

## Future Enhancements

### Planned Improvements
1. **Snapshot Testing**: Add component snapshot tests
2. **Performance Benchmarks**: Automated performance testing
3. **Cross-Browser Testing**: Multi-browser E2E tests
4. **Accessibility Testing**: Automated a11y testing
5. **Load Testing**: Test with large floor plans