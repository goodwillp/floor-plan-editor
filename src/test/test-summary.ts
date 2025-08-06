/**
 * Test Summary Generator
 * 
 * This utility generates comprehensive test reports and validates
 * that all requirements are covered by tests.
 */

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import path from 'path'

interface TestSuite {
  name: string
  file: string
  testCount: number
  requirements: string[]
  categories: string[]
}

interface RequirementCoverage {
  requirement: string
  testFiles: string[]
  covered: boolean
}

interface TestSummary {
  totalTests: number
  totalSuites: number
  requirementsCovered: number
  totalRequirements: number
  coverage: RequirementCoverage[]
  suites: TestSuite[]
  categories: {
    unit: number
    integration: number
    visual: number
    e2e: number
  }
}

class TestSummaryGenerator {
  private testFiles: string[] = []
  private requirements: string[] = []

  async generateSummary(): Promise<TestSummary> {
    await this.loadTestFiles()
    await this.loadRequirements()
    
    const suites = await this.analyzeTestSuites()
    const coverage = this.analyzeRequirementCoverage(suites)
    
    const summary: TestSummary = {
      totalTests: suites.reduce((sum, suite) => sum + suite.testCount, 0),
      totalSuites: suites.length,
      requirementsCovered: coverage.filter(c => c.covered).length,
      totalRequirements: this.requirements.length,
      coverage,
      suites,
      categories: {
        unit: suites.filter(s => s.categories.includes('unit')).length,
        integration: suites.filter(s => s.categories.includes('integration')).length,
        visual: suites.filter(s => s.categories.includes('visual')).length,
        e2e: suites.filter(s => s.categories.includes('e2e')).length,
      }
    }

    return summary
  }

  private async loadTestFiles(): Promise<void> {
    const patterns = [
      'src/test/**/*.test.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
      'cypress/e2e/**/*.cy.{ts,tsx}',
      'cypress/component/**/*.cy.{ts,tsx}'
    ]

    for (const pattern of patterns) {
      const files = await glob(pattern)
      this.testFiles.push(...files)
    }
  }

  private async loadRequirements(): Promise<void> {
    try {
      const requirementsPath = '.kiro/specs/floor-plan-editor/requirements.md'
      const content = readFileSync(requirementsPath, 'utf-8')
      
      // Extract requirement numbers (e.g., "1.1", "2.3", etc.)
      const matches = content.match(/\d+\.\d+/g) || []
      this.requirements = [...new Set(matches)]
    } catch (error) {
      console.warn('Could not load requirements file:', error)
      this.requirements = []
    }
  }

  private async analyzeTestSuites(): Promise<TestSuite[]> {
    const suites: TestSuite[] = []

    for (const file of this.testFiles) {
      try {
        const content = readFileSync(file, 'utf-8')
        const suite = this.analyzeTestFile(file, content)
        suites.push(suite)
      } catch (error) {
        console.warn(`Could not analyze test file ${file}:`, error)
      }
    }

    return suites
  }

  private analyzeTestFile(file: string, content: string): TestSuite {
    // Count test cases
    const testMatches = content.match(/\b(it|test)\s*\(/g) || []
    const testCount = testMatches.length

    // Extract requirement references
    const requirementMatches = content.match(/Requirements?:\s*([\d\.,\s]+)/gi) || []
    const requirements: string[] = []
    
    for (const match of requirementMatches) {
      const nums = match.match(/\d+\.\d+/g) || []
      requirements.push(...nums)
    }

    // Determine categories based on file path
    const categories: string[] = []
    if (file.includes('/test/lib/') || file.includes('/__tests__/')) {
      categories.push('unit')
    }
    if (file.includes('/test/integration/')) {
      categories.push('integration')
    }
    if (file.includes('/test/visual/')) {
      categories.push('visual')
    }
    if (file.includes('/e2e/') || file.includes('.cy.')) {
      categories.push('e2e')
    }

    return {
      name: path.basename(file, path.extname(file)),
      file,
      testCount,
      requirements: [...new Set(requirements)],
      categories
    }
  }

  private analyzeRequirementCoverage(suites: TestSuite[]): RequirementCoverage[] {
    const coverage: RequirementCoverage[] = []

    for (const requirement of this.requirements) {
      const testFiles = suites
        .filter(suite => suite.requirements.includes(requirement))
        .map(suite => suite.file)

      coverage.push({
        requirement,
        testFiles,
        covered: testFiles.length > 0
      })
    }

    return coverage
  }

  async generateReport(): Promise<void> {
    const summary = await this.generateSummary()
    
    const report = this.formatReport(summary)
    const jsonReport = JSON.stringify(summary, null, 2)
    
    // Write reports
    writeFileSync('test-summary.md', report)
    writeFileSync('test-summary.json', jsonReport)
    
    console.log('Test summary reports generated:')
    console.log('- test-summary.md (human-readable)')
    console.log('- test-summary.json (machine-readable)')
    
    // Print summary to console
    console.log('\n=== TEST SUMMARY ===')
    console.log(`Total Test Suites: ${summary.totalSuites}`)
    console.log(`Total Tests: ${summary.totalTests}`)
    console.log(`Requirements Coverage: ${summary.requirementsCovered}/${summary.totalRequirements} (${Math.round(summary.requirementsCovered / summary.totalRequirements * 100)}%)`)
    console.log('\nTest Categories:')
    console.log(`- Unit Tests: ${summary.categories.unit} suites`)
    console.log(`- Integration Tests: ${summary.categories.integration} suites`)
    console.log(`- Visual Tests: ${summary.categories.visual} suites`)
    console.log(`- E2E Tests: ${summary.categories.e2e} suites`)
  }

  private formatReport(summary: TestSummary): string {
    const uncoveredRequirements = summary.coverage.filter(c => !c.covered)
    
    return `# Floor Plan Editor - Test Summary Report

Generated: ${new Date().toISOString()}

## Overview

- **Total Test Suites**: ${summary.totalSuites}
- **Total Tests**: ${summary.totalTests}
- **Requirements Coverage**: ${summary.requirementsCovered}/${summary.totalRequirements} (${Math.round(summary.requirementsCovered / summary.totalRequirements * 100)}%)

## Test Categories

| Category | Suites | Description |
|----------|--------|-------------|
| Unit Tests | ${summary.categories.unit} | Individual component/service tests |
| Integration Tests | ${summary.categories.integration} | Component interaction tests |
| Visual Tests | ${summary.categories.visual} | Visual regression tests |
| E2E Tests | ${summary.categories.e2e} | End-to-end workflow tests |

## Requirements Coverage

### Covered Requirements (${summary.requirementsCovered})

${summary.coverage
  .filter(c => c.covered)
  .map(c => `- **${c.requirement}**: Tested in ${c.testFiles.length} file(s)`)
  .join('\n')}

### Uncovered Requirements (${uncoveredRequirements.length})

${uncoveredRequirements.length > 0 
  ? uncoveredRequirements.map(c => `- **${c.requirement}**: ⚠️ No tests found`).join('\n')
  : '_All requirements are covered by tests!_ ✅'
}

## Test Suites Detail

${summary.suites.map(suite => `
### ${suite.name}
- **File**: \`${suite.file}\`
- **Tests**: ${suite.testCount}
- **Categories**: ${suite.categories.join(', ')}
- **Requirements**: ${suite.requirements.length > 0 ? suite.requirements.join(', ') : 'None specified'}
`).join('\n')}

## Recommendations

${uncoveredRequirements.length > 0 ? `
### Missing Test Coverage
The following requirements need test coverage:
${uncoveredRequirements.map(c => `- ${c.requirement}`).join('\n')}
` : ''}

### Test Quality Improvements
1. Ensure all test suites reference specific requirements
2. Add more integration tests for complex workflows
3. Expand visual regression test coverage
4. Consider adding performance tests for large floor plans

## Next Steps

1. **Address Coverage Gaps**: Add tests for uncovered requirements
2. **Enhance Integration Tests**: Test more component interactions
3. **Visual Testing**: Expand visual regression coverage
4. **Performance Testing**: Add tests for large datasets
5. **Accessibility Testing**: Add automated a11y tests

---

*This report was generated automatically from test files and requirement specifications.*
`
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new TestSummaryGenerator()
  generator.generateReport().catch(console.error)
}

export { TestSummaryGenerator }