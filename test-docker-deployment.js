#!/usr/bin/env node

/**
 * Docker deployment testing script
 * Tests Docker deployment in different environments
 * Requirements: Test Docker deployment in different environments
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DockerDeploymentTester {
  constructor() {
    this.testResults = [];
    this.containers = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const result = execSync(command, { 
          encoding: 'utf8', 
          stdio: 'pipe',
          ...options 
        });
        resolve(result.trim());
      } catch (error) {
        reject(error);
      }
    });
  }

  async checkDockerInstallation() {
    this.log('Checking Docker installation...');
    
    try {
      const dockerVersion = await this.runCommand('docker --version');
      const composeVersion = await this.runCommand('docker-compose --version');
      
      this.log(`Docker version: ${dockerVersion}`, 'success');
      this.log(`Docker Compose version: ${composeVersion}`, 'success');
      
      return true;
    } catch (error) {
      this.log('Docker or Docker Compose not found', 'error');
      return false;
    }
  }

  async buildProductionImage() {
    this.log('Building production Docker image...');
    
    try {
      await this.runCommand('docker build -t floor-plan-editor:test -f Dockerfile .');
      this.log('Production image built successfully', 'success');
      return true;
    } catch (error) {
      this.log(`Failed to build production image: ${error.message}`, 'error');
      return false;
    }
  }

  async buildDevelopmentImage() {
    this.log('Building development Docker image...');
    
    try {
      await this.runCommand('docker build -t floor-plan-editor:dev-test -f Dockerfile.dev .');
      this.log('Development image built successfully', 'success');
      return true;
    } catch (error) {
      this.log(`Failed to build development image: ${error.message}`, 'error');
      return false;
    }
  }

  async testProductionDeployment() {
    this.log('Testing production deployment...');
    
    try {
      // Start production container
      const containerId = await this.runCommand(
        'docker run -d -p 3001:3000 --name floor-plan-editor-test floor-plan-editor:test'
      );
      
      this.containers.push('floor-plan-editor-test');
      this.log(`Production container started: ${containerId.substring(0, 12)}`, 'success');
      
      // Wait for container to be ready
      await this.waitForContainer('floor-plan-editor-test', 3001);
      
      // Test health check
      const healthCheck = await this.testHealthEndpoint('http://localhost:3001');
      
      if (healthCheck) {
        this.log('Production deployment test passed', 'success');
        return true;
      } else {
        this.log('Production deployment health check failed', 'error');
        return false;
      }
    } catch (error) {
      this.log(`Production deployment test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testDevelopmentDeployment() {
    this.log('Testing development deployment...');
    
    try {
      // Start development container
      const containerId = await this.runCommand(
        'docker run -d -p 5174:5173 -v $(pwd):/app -v /app/node_modules --name floor-plan-editor-dev-test floor-plan-editor:dev-test'
      );
      
      this.containers.push('floor-plan-editor-dev-test');
      this.log(`Development container started: ${containerId.substring(0, 12)}`, 'success');
      
      // Wait for container to be ready
      await this.waitForContainer('floor-plan-editor-dev-test', 5174);
      
      // Test health check
      const healthCheck = await this.testHealthEndpoint('http://localhost:5174');
      
      if (healthCheck) {
        this.log('Development deployment test passed', 'success');
        return true;
      } else {
        this.log('Development deployment health check failed', 'error');
        return false;
      }
    } catch (error) {
      this.log(`Development deployment test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testDockerCompose() {
    this.log('Testing Docker Compose deployment...');
    
    try {
      // Test production compose
      await this.runCommand('docker-compose up -d floor-plan-editor');
      this.log('Docker Compose production service started', 'success');
      
      await this.waitForContainer('floor-plan-editor_floor-plan-editor_1', 3000);
      
      const healthCheck = await this.testHealthEndpoint('http://localhost:3000');
      
      if (healthCheck) {
        this.log('Docker Compose deployment test passed', 'success');
        
        // Stop compose services
        await this.runCommand('docker-compose down');
        return true;
      } else {
        this.log('Docker Compose health check failed', 'error');
        await this.runCommand('docker-compose down');
        return false;
      }
    } catch (error) {
      this.log(`Docker Compose test failed: ${error.message}`, 'error');
      try {
        await this.runCommand('docker-compose down');
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      return false;
    }
  }

  async waitForContainer(containerName, port, timeout = 30000) {
    this.log(`Waiting for container ${containerName} to be ready on port ${port}...`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.runCommand(`docker inspect --format='{{.State.Status}}' ${containerName}`);
        
        if (status === 'running') {
          // Additional wait for service to be ready
          await new Promise(resolve => setTimeout(resolve, 5000));
          return true;
        }
      } catch (error) {
        // Container might not exist yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Container ${containerName} did not become ready within ${timeout}ms`);
  }

  async testHealthEndpoint(url) {
    this.log(`Testing health endpoint: ${url}`);
    
    try {
      // Use curl to test the endpoint
      await this.runCommand(`curl -f -s ${url} > /dev/null`);
      this.log(`Health check passed for ${url}`, 'success');
      return true;
    } catch (error) {
      this.log(`Health check failed for ${url}: ${error.message}`, 'error');
      return false;
    }
  }

  async testEnvironmentVariables() {
    this.log('Testing environment variable configuration...');
    
    try {
      // Create test .env file
      const testEnv = `
PROD_PORT=3002
DEV_PORT=5175
NODE_ENV=production
APP_NAME=Floor Plan Editor Test
APP_VERSION=1.0.0-test
`;
      
      fs.writeFileSync('.env.test', testEnv);
      
      // Test with custom environment
      const containerId = await this.runCommand(
        'docker run -d -p 3002:3000 --env-file .env.test --name floor-plan-editor-env-test floor-plan-editor:test'
      );
      
      this.containers.push('floor-plan-editor-env-test');
      
      await this.waitForContainer('floor-plan-editor-env-test', 3002);
      
      const healthCheck = await this.testHealthEndpoint('http://localhost:3002');
      
      // Cleanup test env file
      fs.unlinkSync('.env.test');
      
      if (healthCheck) {
        this.log('Environment variable test passed', 'success');
        return true;
      } else {
        this.log('Environment variable test failed', 'error');
        return false;
      }
    } catch (error) {
      this.log(`Environment variable test failed: ${error.message}`, 'error');
      
      // Cleanup
      try {
        fs.unlinkSync('.env.test');
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      return false;
    }
  }

  async testResourceUsage() {
    this.log('Testing container resource usage...');
    
    try {
      // Get container stats
      const stats = await this.runCommand(
        'docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}" floor-plan-editor-test'
      );
      
      this.log(`Container resource usage:\n${stats}`, 'success');
      
      // Check if memory usage is reasonable (less than 512MB)
      const memoryMatch = stats.match(/(\d+(?:\.\d+)?)MiB/);
      if (memoryMatch) {
        const memoryUsage = parseFloat(memoryMatch[1]);
        if (memoryUsage < 512) {
          this.log(`Memory usage is acceptable: ${memoryUsage}MiB`, 'success');
          return true;
        } else {
          this.log(`Memory usage is high: ${memoryUsage}MiB`, 'error');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      this.log(`Resource usage test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testMultipleEnvironments() {
    this.log('Testing deployment in multiple environments...');
    
    const environments = [
      { name: 'Alpine Linux', baseImage: 'node:24-alpine' },
      { name: 'Ubuntu', baseImage: 'node:24' },
    ];
    
    let allPassed = true;
    
    for (const env of environments) {
      this.log(`Testing ${env.name} environment...`);
      
      try {
        // Create temporary Dockerfile for this environment
        const dockerfileContent = fs.readFileSync('Dockerfile', 'utf8');
        const modifiedDockerfile = dockerfileContent.replace('FROM node:24-alpine', `FROM ${env.baseImage}`);
        
        fs.writeFileSync(`Dockerfile.${env.name.toLowerCase()}`, modifiedDockerfile);
        
        // Build image for this environment
        await this.runCommand(`docker build -t floor-plan-editor:${env.name.toLowerCase()} -f Dockerfile.${env.name.toLowerCase()} .`);
        
        // Test the image
        const containerId = await this.runCommand(
          `docker run -d -p 3003:3000 --name floor-plan-editor-${env.name.toLowerCase()} floor-plan-editor:${env.name.toLowerCase()}`
        );
        
        this.containers.push(`floor-plan-editor-${env.name.toLowerCase()}`);
        
        await this.waitForContainer(`floor-plan-editor-${env.name.toLowerCase()}`, 3003);
        
        const healthCheck = await this.testHealthEndpoint('http://localhost:3003');
        
        if (healthCheck) {
          this.log(`${env.name} environment test passed`, 'success');
        } else {
          this.log(`${env.name} environment test failed`, 'error');
          allPassed = false;
        }
        
        // Cleanup
        fs.unlinkSync(`Dockerfile.${env.name.toLowerCase()}`);
        
      } catch (error) {
        this.log(`${env.name} environment test failed: ${error.message}`, 'error');
        allPassed = false;
        
        // Cleanup
        try {
          fs.unlinkSync(`Dockerfile.${env.name.toLowerCase()}`);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
    }
    
    return allPassed;
  }

  async cleanup() {
    this.log('Cleaning up test containers...');
    
    for (const container of this.containers) {
      try {
        await this.runCommand(`docker stop ${container}`);
        await this.runCommand(`docker rm ${container}`);
        this.log(`Cleaned up container: ${container}`, 'success');
      } catch (error) {
        this.log(`Failed to cleanup container ${container}: ${error.message}`, 'error');
      }
    }
    
    // Clean up test images
    try {
      await this.runCommand('docker rmi floor-plan-editor:test floor-plan-editor:dev-test');
      this.log('Cleaned up test images', 'success');
    } catch (error) {
      this.log(`Failed to cleanup test images: ${error.message}`, 'error');
    }
  }

  async generateReport() {
    this.log('Generating deployment test report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.passed).length,
        failed: this.testResults.filter(r => !r.passed).length
      }
    };
    
    const reportPath = path.join(__dirname, 'docker-deployment-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Test report generated: ${reportPath}`, 'success');
    
    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(__dirname, 'DOCKER_DEPLOYMENT_TEST_REPORT.md');
    fs.writeFileSync(markdownPath, markdownReport);
    
    this.log(`Markdown report generated: ${markdownPath}`, 'success');
  }

  generateMarkdownReport(report) {
    const { summary, testResults } = report;
    
    return `# Docker Deployment Test Report

Generated: ${report.timestamp}

## Summary

- **Total Tests**: ${summary.total}
- **Passed**: ${summary.passed} ✅
- **Failed**: ${summary.failed} ❌
- **Success Rate**: ${((summary.passed / summary.total) * 100).toFixed(1)}%

## Test Results

${testResults.map(result => `
### ${result.name}

- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${result.duration}ms
${result.error ? `- **Error**: ${result.error}` : ''}
${result.details ? `- **Details**: ${result.details}` : ''}
`).join('\n')}

## Recommendations

${summary.failed > 0 ? `
⚠️ **${summary.failed} test(s) failed**. Please review the failed tests and address the issues before deploying to production.

Common issues and solutions:
- **Port conflicts**: Ensure the required ports are available
- **Resource constraints**: Check available memory and CPU
- **Network issues**: Verify Docker network configuration
- **Image build failures**: Check Dockerfile syntax and dependencies
` : `
✅ **All tests passed!** The application is ready for Docker deployment.

Next steps:
- Deploy to staging environment for further testing
- Configure production environment variables
- Set up monitoring and logging
- Plan rollback strategy
`}

## Environment Information

- **Docker Version**: Check with \`docker --version\`
- **Docker Compose Version**: Check with \`docker-compose --version\`
- **Test Environment**: ${process.platform}
- **Node.js Version**: ${process.version}

## Files Generated

- \`docker-deployment-test-report.json\`: Detailed JSON report
- \`DOCKER_DEPLOYMENT_TEST_REPORT.md\`: This markdown report
`;
  }

  async runTest(name, testFunction) {
    const startTime = Date.now();
    this.log(`Running test: ${name}`);
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name,
        passed: result,
        duration,
        timestamp: new Date().toISOString()
      });
      
      if (result) {
        this.log(`Test passed: ${name} (${duration}ms)`, 'success');
      } else {
        this.log(`Test failed: ${name} (${duration}ms)`, 'error');
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name,
        passed: false,
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.log(`Test error: ${name} - ${error.message}`, 'error');
      return false;
    }
  }

  async runAllTests() {
    this.log('Starting Docker deployment tests...');
    
    try {
      // Prerequisites
      const dockerInstalled = await this.runTest('Docker Installation Check', () => this.checkDockerInstallation());
      if (!dockerInstalled) {
        this.log('Docker not available, skipping deployment tests', 'error');
        return;
      }
      
      // Build tests
      await this.runTest('Production Image Build', () => this.buildProductionImage());
      await this.runTest('Development Image Build', () => this.buildDevelopmentImage());
      
      // Deployment tests
      await this.runTest('Production Deployment', () => this.testProductionDeployment());
      await this.runTest('Development Deployment', () => this.testDevelopmentDeployment());
      await this.runTest('Docker Compose Deployment', () => this.testDockerCompose());
      
      // Configuration tests
      await this.runTest('Environment Variables', () => this.testEnvironmentVariables());
      await this.runTest('Resource Usage', () => this.testResourceUsage());
      
      // Multi-environment tests
      await this.runTest('Multiple Environments', () => this.testMultipleEnvironments());
      
    } finally {
      await this.cleanup();
      await this.generateReport();
    }
    
    const summary = this.testResults.reduce((acc, result) => {
      acc.total++;
      if (result.passed) acc.passed++;
      else acc.failed++;
      return acc;
    }, { total: 0, passed: 0, failed: 0 });
    
    this.log(`\nTest Summary: ${summary.passed}/${summary.total} passed`, 
      summary.failed === 0 ? 'success' : 'error');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new DockerDeploymentTester();
  tester.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = DockerDeploymentTester;