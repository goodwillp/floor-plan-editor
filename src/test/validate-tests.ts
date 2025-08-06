/**
 * Test Validation Script
 * 
 * Validates that the comprehensive testing suite meets all requirements
 * from task 18 of the implementation plan.
 */

import { readFileSync, existsSync } from 'fs'
import { glob } from 'glob'
import path from 'path'

interface ValidationResult {
  category: string
  requirement: string
  status: 'PASS' | 'FAIL' | 'PARTIAL'
  details: string
  files?: string[]
}

class TestValidator {
  private results: ValidationResult[] = []

  async validateComprehensiveTestSuite(): Promise<ValidationResult[]> {
    console.log('🔍 Validating comprehensive testing suite...\n')

    // Task 18 requirements validation
    await this.validateUnitTests()
    await this.validateIntegrationTests()
    await this.validateVisualTests()
    await this.validateE2ETests()
    await this.validateCoverageSetup()
    await this.validateCIIntegration()

    return this.results
  }

  private async validateUnitTests(): Promise<void> {
    console.log('📋 Validating unit tests for data model operations...')
    
    const unitTestFiles = await glob('src/test/lib/**/*.test.{ts,tsx}')
    const componentTestFiles = await glob('src/test/components/**/*.test.{ts,tsx}')
    const hookTestFiles = await glob('src/test/hooks/**/*.test.{ts,tsx}')
    
    // Check for core data model tests
    const requiredDataModelTests = [
      'FloorPlanModel',
      'GeometryService',
      'WallRenderer',
      'DrawingService',
      'ErrorHandler'
    ]

    const foundDataModelTests = requiredDataModelTests.filter(testName =>
      unitTestFiles.some(file => file.includes(testName))
    )

    this.results.push({
      category: 'Unit Tests',
      requirement: 'Write unit tests for all data model operations',
      status: foundDataModelTests.length === requiredDataModelTests.length ? 'PASS' : 'PARTIAL',
      details: `Found ${foundDataModelTests.length}/${requiredDataModelTests.length} required data model tests`,
      files: unitTestFiles
    })

    // Check for component tests
    this.results.push({
      category: 'Unit Tests',
      requirement: 'Test React components',
      status: componentTestFiles.length > 0 ? 'PASS' : 'FAIL',
      details: `Found ${componentTestFiles.length} component test files`,
      files: componentTestFiles
    })

    // Check for hook tests
    this.results.push({
      category: 'Unit Tests',
      requirement: 'Test React hooks',
      status: hookTestFiles.length > 0 ? 'PASS' : 'FAIL',
      details: `Found ${hookTestFiles.length} hook test files`,
      files: hookTestFiles
    })
  }

  private async validateIntegrationTests(): Promise<void> {
    console.log('🔗 Validating React-PixiJS integration tests...')
    
    const integrationTestFiles = await glob('src/test/integration/**/*.test.{ts,tsx}')
    
    // Check for specific integration test files
    const requiredIntegrationTests = [
      'canvas-integration',
      'app-workflow',
      'DrawingIntegration'
    ]

    const foundIntegrationTests = requiredIntegrationTests.filter(testName =>
      integrationTestFiles.some(file => file.includes(testName))
    )

    this.results.push({
      category: 'Integration Tests',
      requirement: 'Create integration tests for React-PixiJS interaction',
      status: foundIntegrationTests.length >= 2 ? 'PASS' : 'PARTIAL',
      details: `Found ${foundIntegrationTests.length}/${requiredIntegrationTests.length} required integration tests`,
      files: integrationTestFiles
    })
  }

  private async validateVisualTests(): Promise<void> {
    console.log('👁️ Validating visual regression tests...')
    
    const visualTestFiles = await glob('src/test/visual/**/*.test.{ts,tsx}')
    
    // Check for visual test configuration
    const visualConfigExists = existsSync('vitest.visual.config.ts')
    const visualSetupExists = existsSync('src/test/visual-setup.ts')

    this.results.push({
      category: 'Visual Tests',
      requirement: 'Add visual regression tests for rendering accuracy',
      status: visualTestFiles.length > 0 && visualConfigExists ? 'PASS' : 'PARTIAL',
      details: `Found ${visualTestFiles.length} visual test files, config: ${visualConfigExists}, setup: ${visualSetupExists}`,
      files: visualTestFiles
    })
  }

  private async validateE2ETests(): Promise<void> {
    console.log('🌐 Validating end-to-end tests...')
    
    const e2eTestFiles = await glob('cypress/e2e/**/*.cy.{ts,tsx}')
    const cypressConfigExists = existsSync('cypress.config.ts')
    
    // Check for required E2E test categories
    const requiredE2ETests = [
      'floor-plan-creation',
      'ui-interactions',
      'error-handling'
    ]

    const foundE2ETests = requiredE2ETests.filter(testName =>
      e2eTestFiles.some(file => file.includes(testName))
    )

    this.results.push({
      category: 'E2E Tests',
      requirement: 'Implement end-to-end tests for complete workflows',
      status: foundE2ETests.length >= 2 && cypressConfigExists ? 'PASS' : 'PARTIAL',
      details: `Found ${foundE2ETests.length}/${requiredE2ETests.length} required E2E test categories, Cypress config: ${cypressConfigExists}`,
      files: e2eTestFiles
    })
  }

  private async validateCoverageSetup(): Promise<void> {
    console.log('📊 Validating test coverage setup...')
    
    // Check vitest configuration
    const vitestConfigExists = existsSync('vitest.config.ts')
    let coverageConfigured = false
    
    if (vitestConfigExists) {
      try {
        const vitestConfig = readFileSync('vitest.config.ts', 'utf-8')
        coverageConfigured = vitestConfig.includes('coverage') && vitestConfig.includes('thresholds')
      } catch (error) {
        console.warn('Could not read vitest config:', error)
      }
    }

    // Check package.json scripts
    const packageJsonExists = existsSync('package.json')
    let coverageScriptExists = false
    
    if (packageJsonExists) {
      try {
        const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))
        coverageScriptExists = packageJson.scripts && packageJson.scripts['test:coverage']
      } catch (error) {
        console.warn('Could not read package.json:', error)
      }
    }

    this.results.push({
      category: 'Coverage',
      requirement: 'Set up test coverage reporting and CI integration',
      status: vitestConfigExists && coverageConfigured && coverageScriptExists ? 'PASS' : 'PARTIAL',
      details: `Vitest config: ${vitestConfigExists}, Coverage configured: ${coverageConfigured}, Coverage script: ${coverageScriptExists}`
    })
  }

  private async validateCIIntegration(): Promise<void> {
    console.log('⚙️ Validating CI integration...')
    
    const githubWorkflowExists = existsSync('.github/workflows/test.yml')
    let workflowHasTests = false
    
    if (githubWorkflowExists) {
      try {
        const workflow = readFileSync('.github/workflows/test.yml', 'utf-8')
        workflowHasTests = workflow.includes('test:coverage') || workflow.includes('npm test')
      } catch (error) {
        console.warn('Could not read GitHub workflow:', error)
      }
    }

    this.results.push({
      category: 'CI Integration',
      requirement: 'Set up CI integration for automated testing',
      status: githubWorkflowExists && workflowHasTests ? 'PASS' : 'PARTIAL',
      details: `GitHub workflow exists: ${githubWorkflowExists}, Contains test commands: ${workflowHasTests}`
    })
  }

  printResults(): void {
    console.log('\n' + '='.repeat(80))
    console.log('📋 COMPREHENSIVE TEST SUITE VALIDATION RESULTS')
    console.log('='.repeat(80))

    const categories = [...new Set(this.results.map(r => r.category))]
    
    for (const category of categories) {
      console.log(`\n📂 ${category}`)
      console.log('-'.repeat(40))
      
      const categoryResults = this.results.filter(r => r.category === category)
      
      for (const result of categoryResults) {
        const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌'
        console.log(`${statusIcon} ${result.requirement}`)
        console.log(`   ${result.details}`)
        
        if (result.files && result.files.length > 0) {
          console.log(`   Files: ${result.files.length} found`)
        }
      }
    }

    // Summary
    const passed = this.results.filter(r => r.status === 'PASS').length
    const partial = this.results.filter(r => r.status === 'PARTIAL').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const total = this.results.length

    console.log('\n' + '='.repeat(80))
    console.log('📊 SUMMARY')
    console.log('='.repeat(80))
    console.log(`✅ Passed: ${passed}/${total}`)
    console.log(`⚠️ Partial: ${partial}/${total}`)
    console.log(`❌ Failed: ${failed}/${total}`)
    
    const score = Math.round(((passed + partial * 0.5) / total) * 100)
    console.log(`\n🎯 Overall Score: ${score}%`)
    
    if (score >= 90) {
      console.log('🎉 Excellent! Comprehensive test suite is well implemented.')
    } else if (score >= 75) {
      console.log('👍 Good! Test suite covers most requirements with some gaps.')
    } else if (score >= 50) {
      console.log('⚠️ Partial! Test suite needs significant improvements.')
    } else {
      console.log('❌ Poor! Test suite requires major work to meet requirements.')
    }

    console.log('\n📋 TASK 18 COMPLETION STATUS')
    console.log('='.repeat(80))
    
    const taskRequirements = [
      'Write unit tests for all data model operations',
      'Create integration tests for React-PixiJS interaction', 
      'Add visual regression tests for rendering accuracy',
      'Implement end-to-end tests for complete workflows',
      'Set up test coverage reporting and CI integration'
    ]

    const completedRequirements = taskRequirements.filter(req =>
      this.results.some(r => r.requirement === req && r.status === 'PASS')
    )

    console.log(`✅ Completed: ${completedRequirements.length}/${taskRequirements.length} requirements`)
    
    if (completedRequirements.length === taskRequirements.length) {
      console.log('🎉 TASK 18 COMPLETED SUCCESSFULLY!')
    } else {
      console.log('⚠️ Task 18 partially completed. See details above for remaining work.')
    }
  }
}

// CLI usage - always run when executed directly
const validator = new TestValidator()
validator.validateComprehensiveTestSuite()
  .then(() => validator.printResults())
  .catch(console.error)

export { TestValidator }