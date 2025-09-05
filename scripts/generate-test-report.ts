#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface TestResults {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  testResults: Array<{
    name: string;
    status: 'passed' | 'failed';
    numPassingTests: number;
    numFailingTests: number;
    message?: string;
  }>;
}

interface CoverageReport {
  total: {
    lines: { pct: number };
    statements: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
  };
}

class TestReportGenerator {
  private resultsPath = path.join(process.cwd(), 'coverage', 'test-results.json');
  private coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  private reportPath = path.join(process.cwd(), 'coverage', 'test-report.html');

  async generate(): Promise<void> {
    console.log('📊 Generating Test Report...\n');

    try {
      // Run tests with JSON reporter
      console.log('Running tests...');
      execSync('pnpm test --json --outputFile=coverage/test-results.json', {
        stdio: 'pipe',
        encoding: 'utf8',
      });
    } catch (error) {
      console.log('Tests completed (some may have failed)');
    }

    // Read results
    const results = this.readTestResults();
    const coverage = this.readCoverageReport();

    // Generate HTML report
    const html = this.generateHTML(results, coverage);
    
    // Write report
    fs.writeFileSync(this.reportPath, html);
    console.log(`\n✅ Test report generated: ${this.reportPath}`);

    // Generate summary
    this.printSummary(results, coverage);
  }

  private readTestResults(): TestResults | null {
    try {
      const data = fs.readFileSync(this.resultsPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private readCoverageReport(): CoverageReport | null {
    try {
      const data = fs.readFileSync(this.coveragePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private generateHTML(results: TestResults | null, coverage: CoverageReport | null): string {
    const now = new Date().toLocaleString();
    const passRate = results 
      ? ((results.numPassedTests / results.numTotalTests) * 100).toFixed(1)
      : '0';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Destino SF - Test Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 2rem;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .header p { opacity: 0.9; }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            padding: 2rem;
            background: #f8f9fa;
        }
        .metric {
            background: white;
            padding: 1.5rem;
            border-radius: 0.5rem;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #667eea;
        }
        .metric-label {
            color: #6c757d;
            margin-top: 0.5rem;
        }
        .pass { color: #28a745 !important; }
        .fail { color: #dc3545 !important; }
        .coverage-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
            padding: 2rem;
        }
        .coverage-item {
            text-align: center;
            padding: 1rem;
            background: white;
            border-radius: 0.5rem;
            border: 2px solid #e9ecef;
        }
        .coverage-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 0.5rem;
        }
        .coverage-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s;
        }
        .failed-tests {
            padding: 2rem;
        }
        .failed-test {
            background: #fff5f5;
            border-left: 4px solid #dc3545;
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 0.25rem;
        }
        .timestamp {
            text-align: center;
            padding: 1rem;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Destino SF Test Report</h1>
            <p>Automated QA Dashboard</p>
        </div>
        
        <div class="metrics">
            <div class="metric">
                <div class="metric-value ${results && results.numPassedTests > results.numFailedTests ? 'pass' : 'fail'}">
                    ${passRate}%
                </div>
                <div class="metric-label">Test Pass Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${results?.numTotalTests || 0}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value pass">${results?.numPassedTests || 0}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value fail">${results?.numFailedTests || 0}</div>
                <div class="metric-label">Failed</div>
            </div>
        </div>

        ${coverage ? `
        <div class="coverage-grid">
            <div class="coverage-item">
                <strong>Lines</strong>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${coverage.total.lines.pct}%"></div>
                </div>
                <div>${coverage.total.lines.pct.toFixed(1)}%</div>
            </div>
            <div class="coverage-item">
                <strong>Statements</strong>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${coverage.total.statements.pct}%"></div>
                </div>
                <div>${coverage.total.statements.pct.toFixed(1)}%</div>
            </div>
            <div class="coverage-item">
                <strong>Functions</strong>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${coverage.total.functions.pct}%"></div>
                </div>
                <div>${coverage.total.functions.pct.toFixed(1)}%</div>
            </div>
            <div class="coverage-item">
                <strong>Branches</strong>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${coverage.total.branches.pct}%"></div>
                </div>
                <div>${coverage.total.branches.pct.toFixed(1)}%</div>
            </div>
        </div>
        ` : ''}

        <div class="timestamp">
            Generated on ${now}
        </div>
    </div>
</body>
</html>`;
  }

  private printSummary(results: TestResults | null, coverage: CoverageReport | null): void {
    console.log('\n📈 Test Summary:');
    if (results) {
      console.log(`✅ Passed: ${results.numPassedTests}/${results.numTotalTests} tests`);
      console.log(`📦 Suites: ${results.numPassedTestSuites}/${results.numTotalTestSuites} passing`);
    }
    if (coverage) {
      console.log(`📊 Coverage: ${coverage.total.lines.pct.toFixed(1)}% lines`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  new TestReportGenerator().generate();
}

export { TestReportGenerator };
