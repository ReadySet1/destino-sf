#!/usr/bin/env node

const { spawn } = require('child_process');
const chalk = require('chalk');

console.clear();
console.log(chalk.blue.bold('🔍 Destino SF - Test Monitor\n'));

let testRuns = 0;
let lastPassRate = 0;

function runTests() {
  testRuns++;
  console.log(chalk.gray(`Run #${testRuns} - ${new Date().toLocaleTimeString()}`));
  
  const test = spawn('pnpm', ['test', '--json'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let output = '';
  
  test.stdout.on('data', (data) => {
    output += data.toString();
  });

  test.on('close', (code) => {
    try {
      const results = JSON.parse(output);
      const passRate = (results.numPassedTests / results.numTotalTests * 100).toFixed(1);
      
      console.clear();
      console.log(chalk.blue.bold('🔍 Destino SF - Test Monitor\n'));
      
      // Show trend
      const trend = passRate > lastPassRate ? '📈' : passRate < lastPassRate ? '📉' : '➡️';
      
      console.log(chalk.white('Status:'), passRate >= 80 ? chalk.green('✅ Healthy') : chalk.yellow('⚠️ Needs Attention'));
      console.log(chalk.white('Pass Rate:'), chalk.cyan(`${passRate}%`), trend);
      console.log(chalk.white('Tests:'), chalk.green(results.numPassedTests), '/', results.numTotalTests);
      console.log(chalk.white('Suites:'), chalk.green(results.numPassedTestSuites), '/', results.numTotalTestSuites);
      
      if (results.numFailedTests > 0) {
        console.log(chalk.red(`\n⚠️ ${results.numFailedTests} tests failing`));
      }
      
      lastPassRate = parseFloat(passRate);
    } catch (e) {
      console.log(chalk.red('Error parsing test results'));
    }
    
    console.log(chalk.gray('\nPress Ctrl+C to exit'));
  });
}

// Run tests every 30 seconds
runTests();
setInterval(runTests, 30000);

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Test monitor stopped'));
  process.exit(0);
});
