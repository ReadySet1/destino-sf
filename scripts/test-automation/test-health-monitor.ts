#!/usr/bin/env tsx

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface TestHealth {
  totalTests: number;
  passingTests: number;
  failingTests: number;
  flakyTests: FlakytestInfo[];
  slowTests: SlowTestInfo[];
  coverage: CoverageInfo;
  trends: TestTrends;
  recommendations: string[];
}

interface FlakytestInfo {
  name: string;
  failureRate: number;
  pattern: string;
  lastFailure: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface SlowTestInfo {
  name: string;
  duration: number;
  category: 'unit' | 'integration' | 'e2e';
  optimizationPotential: number;
}

interface CoverageInfo {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  criticalPaths: Record<string, number>;
}

interface TestTrends {
  direction: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  stabilityScore: number;
  performanceScore: number;
  coverageScore: number;
}

class TestHealthMonitor {
  private readonly resultsDir = './test-results';
  private readonly reportsDir = './test-reports';
  private readonly historyFile = './test-history.json';

  async monitor(): Promise<TestHealth> {
    console.log('🔍 Analyzing test suite health...');

    const [
      testResults,
      coverageData,
      performanceData,
      historicalData
    ] = await Promise.all([
      this.analyzeTestResults(),
      this.analyzeCoverage(),
      this.analyzePerformance(),
      this.loadHistoricalData()
    ]);

    const health: TestHealth = {
      totalTests: testResults.total,
      passingTests: testResults.passing,
      failingTests: testResults.failing,
      flakyTests: await this.identifyFlakyTests(historicalData),
      slowTests: await this.identifySlowTests(performanceData),
      coverage: coverageData,
      trends: await this.analyzeTrends(historicalData),
      recommendations: await this.generateRecommendations(testResults, coverageData)
    };

    await this.saveHealthReport(health);
    await this.updateHistory(health);
    
    return health;
  }

  private async analyzeTestResults() {
    console.log('📊 Analyzing test results...');
    
    try {
      // Run tests and capture results
      const unitResults = await this.runTestSuite('unit');
      const integrationResults = await this.runTestSuite('integration');
      const e2eResults = await this.runTestSuite('e2e');

      return {
        total: unitResults.total + integrationResults.total + e2eResults.total,
        passing: unitResults.passing + integrationResults.passing + e2eResults.passing,
        failing: unitResults.failing + integrationResults.failing + e2eResults.failing,
        suites: { unit: unitResults, integration: integrationResults, e2e: e2eResults }
      };
    } catch (error) {
      console.error('❌ Error analyzing test results:', error);
      return { total: 0, passing: 0, failing: 0, suites: {} };
    }
  }

  private async runTestSuite(type: 'unit' | 'integration' | 'e2e') {
    try {
      const command = this.getTestCommand(type);
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 300000 // 5 minutes timeout
      });

      return this.parseTestOutput(output);
    } catch (error: any) {
      console.warn(`⚠️ Test suite ${type} had issues:`, error.message);
      return { total: 0, passing: 0, failing: 0, duration: 0 };
    }
  }

  private getTestCommand(type: string): string {
    const commands = {
      unit: 'pnpm test:unit --passWithNoTests --silent',
      integration: 'pnpm test:integration --passWithNoTests --silent',
      e2e: 'pnpm test:e2e:critical --reporter=json'
    };
    return commands[type as keyof typeof commands] || 'pnpm test';
  }

  private parseTestOutput(output: string) {
    // Parse Jest/Playwright output to extract test statistics
    const lines = output.split('\n');
    let total = 0, passing = 0, failing = 0, duration = 0;

    for (const line of lines) {
      if (line.includes('Tests:')) {
        const match = line.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+failed,\s+(\d+)\s+total/);
        if (match) {
          passing = parseInt(match[1]);
          failing = parseInt(match[2]);
          total = parseInt(match[3]);
        }
      }
      if (line.includes('Time:')) {
        const timeMatch = line.match(/Time:\s+([\d.]+)s/);
        if (timeMatch) {
          duration = parseFloat(timeMatch[1]) * 1000;
        }
      }
    }

    return { total, passing, failing, duration };
  }

  private async analyzeCoverage(): Promise<CoverageInfo> {
    console.log('📈 Analyzing code coverage...');
    
    try {
      // Generate coverage report
      execSync('pnpm test:coverage --silent', { stdio: 'pipe' });
      
      const coverageFile = './coverage/coverage-summary.json';
      const coverageData = JSON.parse(await fs.readFile(coverageFile, 'utf8'));
      
      return {
        lines: coverageData.total.lines.pct,
        functions: coverageData.total.functions.pct,
        branches: coverageData.total.branches.pct,
        statements: coverageData.total.statements.pct,
        criticalPaths: await this.analyzeCriticalPathCoverage(coverageData)
      };
    } catch (error) {
      console.error('❌ Error analyzing coverage:', error);
      return { lines: 0, functions: 0, branches: 0, statements: 0, criticalPaths: {} };
    }
  }

  private async analyzeCriticalPathCoverage(coverageData: any): Promise<Record<string, number>> {
    const criticalPaths = [
      'src/app/api/checkout',
      'src/lib/square',
      'src/app/actions/orders.ts'
    ];

    const criticalCoverage: Record<string, number> = {};
    
    for (const pathPattern of criticalPaths) {
      const matchingFiles = Object.keys(coverageData)
        .filter(file => file.includes(pathPattern));
      
      if (matchingFiles.length > 0) {
        const avgCoverage = matchingFiles.reduce((sum, file) => {
          return sum + (coverageData[file]?.lines?.pct || 0);
        }, 0) / matchingFiles.length;
        
        criticalCoverage[pathPattern] = avgCoverage;
      }
    }

    return criticalCoverage;
  }

  private async analyzePerformance() {
    console.log('⚡ Analyzing test performance...');
    
    try {
      const performanceFile = './test-results/performance.json';
      const data = await fs.readFile(performanceFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Generate performance data from test runs
      return {
        slowTests: [],
        averageDuration: 0,
        totalDuration: 0
      };
    }
  }

  private async loadHistoricalData() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { runs: [] };
    }
  }

  private async identifyFlakyTests(historicalData: any): Promise<FlakytestInfo[]> {
    const flakyTests: FlakytestInfo[] = [];
    
    if (!historicalData.runs || historicalData.runs.length < 5) {
      return flakyTests;
    }

    // Analyze test failure patterns
    const testFailures: Record<string, number[]> = {};
    
    historicalData.runs.forEach((run: any, index: number) => {
      if (run.failures) {
        run.failures.forEach((failure: any) => {
          if (!testFailures[failure.test]) {
            testFailures[failure.test] = [];
          }
          testFailures[failure.test].push(index);
        });
      }
    });

    // Identify flaky patterns
    for (const [testName, failureIndices] of Object.entries(testFailures)) {
      const failureRate = (failureIndices.length / historicalData.runs.length) * 100;
      
      if (failureRate > 5 && failureRate < 95) { // Flaky if fails 5-95% of the time
        flakyTests.push({
          name: testName,
          failureRate,
          pattern: this.identifyFailurePattern(testName, historicalData),
          lastFailure: new Date().toISOString(),
          severity: this.calculateFlakySeverity(failureRate)
        });
      }
    }

    return flakyTests.sort((a, b) => b.failureRate - a.failureRate);
  }

  private identifyFailurePattern(testName: string, historicalData: any): string {
    // Analyze common failure patterns
    const patterns = ['timeout', 'race-condition', 'network', 'database', 'async-await'];
    
    // Simple pattern detection based on test name and error messages
    if (testName.includes('payment') || testName.includes('api')) return 'timeout';
    if (testName.includes('cart') || testName.includes('state')) return 'race-condition';
    if (testName.includes('database') || testName.includes('db')) return 'database';
    
    return 'unknown';
  }

  private calculateFlakySeverity(failureRate: number): FlakytestInfo['severity'] {
    if (failureRate >= 50) return 'CRITICAL';
    if (failureRate >= 25) return 'HIGH';
    if (failureRate >= 10) return 'MEDIUM';
    return 'LOW';
  }

  private async identifySlowTests(performanceData: any): Promise<SlowTestInfo[]> {
    const slowTests: SlowTestInfo[] = [];
    
    // Identify tests taking longer than thresholds
    const thresholds = {
      unit: 5000,      // 5 seconds
      integration: 30000, // 30 seconds
      e2e: 60000       // 60 seconds
    };

    // This would be populated from actual test run data
    return slowTests;
  }

  private async analyzeTrends(historicalData: any): Promise<TestTrends> {
    if (!historicalData.runs || historicalData.runs.length < 3) {
      return {
        direction: 'STABLE',
        stabilityScore: 95,
        performanceScore: 85,
        coverageScore: 80
      };
    }

    const recentRuns = historicalData.runs.slice(-5);
    const stabilityTrend = this.calculateTrend(recentRuns.map((r: any) => r.successRate || 95));
    const performanceTrend = this.calculateTrend(recentRuns.map((r: any) => r.avgDuration || 180000));
    const coverageTrend = this.calculateTrend(recentRuns.map((r: any) => r.coverage || 80));

    return {
      direction: this.determineTrendDirection([stabilityTrend, -performanceTrend, coverageTrend]),
      stabilityScore: recentRuns[recentRuns.length - 1]?.successRate || 95,
      performanceScore: this.calculatePerformanceScore(recentRuns[recentRuns.length - 1]?.avgDuration || 180000),
      coverageScore: recentRuns[recentRuns.length - 1]?.coverage || 80
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const recent = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = values.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3);
    
    return recent - older;
  }

  private determineTrendDirection(trends: number[]): TestTrends['direction'] {
    const avgTrend = trends.reduce((a, b) => a + b, 0) / trends.length;
    
    if (avgTrend > 2) return 'IMPROVING';
    if (avgTrend < -2) return 'DEGRADING';
    return 'STABLE';
  }

  private calculatePerformanceScore(duration: number): number {
    // Convert duration to a score (lower duration = higher score)
    const maxDuration = 300000; // 5 minutes
    return Math.max(0, Math.min(100, 100 - (duration / maxDuration) * 100));
  }

  private async generateRecommendations(testResults: any, coverage: CoverageInfo): Promise<string[]> {
    const recommendations: string[] = [];

    // Coverage recommendations
    if (coverage.lines < 80) {
      recommendations.push('🎯 Increase overall test coverage to at least 80%');
    }

    // Critical path recommendations
    for (const [path, pathCoverage] of Object.entries(coverage.criticalPaths)) {
      if (pathCoverage < 85) {
        recommendations.push(`🔒 Improve coverage for critical path: ${path} (currently ${pathCoverage.toFixed(1)}%)`);
      }
    }

    // Test failure recommendations
    const successRate = (testResults.passing / testResults.total) * 100;
    if (successRate < 95) {
      recommendations.push('🔧 Fix failing tests to achieve >95% success rate');
    }

    // Performance recommendations
    if (testResults.suites?.unit?.duration > 60000) {
      recommendations.push('⚡ Optimize unit test performance (currently taking >1 minute)');
    }

    return recommendations;
  }

  private async saveHealthReport(health: TestHealth): Promise<void> {
    await fs.mkdir(this.reportsDir, { recursive: true });
    
    const timestamp = new Date().toISOString();
    const reportFile = path.join(this.reportsDir, `health-report-${timestamp.split('T')[0]}.json`);
    
    await fs.writeFile(reportFile, JSON.stringify(health, null, 2));
    
    // Also save as latest
    await fs.writeFile(path.join(this.reportsDir, 'latest-health.json'), JSON.stringify(health, null, 2));
    
    console.log(`💾 Health report saved to ${reportFile}`);
  }

  private async updateHistory(health: TestHealth): Promise<void> {
    const historicalData = await this.loadHistoricalData();
    
    const newRun = {
      timestamp: new Date().toISOString(),
      totalTests: health.totalTests,
      successRate: (health.passingTests / health.totalTests) * 100,
      coverage: health.coverage.lines,
      flakyTestCount: health.flakyTests.length,
      slowTestCount: health.slowTests.length
    };

    historicalData.runs = historicalData.runs || [];
    historicalData.runs.push(newRun);
    
    // Keep only last 30 runs
    if (historicalData.runs.length > 30) {
      historicalData.runs = historicalData.runs.slice(-30);
    }

    await fs.writeFile(this.historyFile, JSON.stringify(historicalData, null, 2));
  }

  async generateReport(health: TestHealth): Promise<void> {
    console.log('\n📋 TEST SUITE HEALTH REPORT');
    console.log('='.repeat(50));
    
    // Overall Health
    const overallScore = this.calculateOverallScore(health);
    const healthStatus = this.getHealthStatus(overallScore);
    
    console.log(`🏥 Overall Health: ${healthStatus} (${overallScore}/100)`);
    console.log(`📊 Tests: ${health.passingTests}/${health.totalTests} passing (${((health.passingTests/health.totalTests)*100).toFixed(1)}%)`);
    console.log(`📈 Coverage: ${health.coverage.lines.toFixed(1)}% lines, ${health.coverage.functions.toFixed(1)}% functions`);
    console.log(`📉 Trends: ${health.trends.direction}`);
    
    // Issues
    if (health.flakyTests.length > 0) {
      console.log(`\n🔥 Flaky Tests (${health.flakyTests.length}):`);
      health.flakyTests.slice(0, 5).forEach(test => {
        console.log(`  • ${test.name} (${test.failureRate.toFixed(1)}% failure rate) - ${test.severity}`);
      });
    }
    
    if (health.slowTests.length > 0) {
      console.log(`\n🐌 Slow Tests (${health.slowTests.length}):`);
      health.slowTests.slice(0, 5).forEach(test => {
        console.log(`  • ${test.name} (${(test.duration/1000).toFixed(1)}s) - ${test.category}`);
      });
    }
    
    // Recommendations
    if (health.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      health.recommendations.forEach(rec => {
        console.log(`  ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
  }

  private calculateOverallScore(health: TestHealth): number {
    const successRate = (health.passingTests / health.totalTests) * 100;
    const coverageScore = (health.coverage.lines + health.coverage.functions) / 2;
    const stabilityPenalty = health.flakyTests.length * 2;
    const performancePenalty = health.slowTests.length * 1;
    
    return Math.max(0, Math.min(100, 
      (successRate * 0.4) + 
      (coverageScore * 0.4) + 
      (health.trends.stabilityScore * 0.2) - 
      stabilityPenalty - 
      performancePenalty
    ));
  }

  private getHealthStatus(score: number): string {
    if (score >= 90) return '🟢 EXCELLENT';
    if (score >= 80) return '🟡 GOOD';
    if (score >= 70) return '🟠 FAIR';
    return '🔴 POOR';
  }
}

// CLI Interface
async function main() {
  const monitor = new TestHealthMonitor();
  
  try {
    const health = await monitor.monitor();
    await monitor.generateReport(health);
    
    // Exit with error code if health is poor
    const overallScore = (health.passingTests / health.totalTests) * 100;
    if (overallScore < 90) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test health monitoring failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { TestHealthMonitor }; 