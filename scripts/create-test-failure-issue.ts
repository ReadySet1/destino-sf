#!/usr/bin/env tsx

/**
 * GitHub Issue Creator for Test Failures
 *
 * Creates GitHub issues when critical test failures occur in CI.
 * Avoids duplicates by checking for existing open issues.
 *
 * Usage:
 *   npx tsx scripts/create-test-failure-issue.ts --failures "test1,test2" --run-id 12345
 *
 * Environment Variables:
 *   GITHUB_TOKEN - GitHub token with issues:write permission
 *   GITHUB_REPOSITORY - Repository in format "owner/repo"
 *   GITHUB_RUN_ID - Current workflow run ID
 *   GITHUB_SHA - Current commit SHA
 *   GITHUB_REF_NAME - Current branch name
 */

import fs from 'fs/promises';

interface FailedTest {
  name: string;
  error?: string;
  file?: string;
  duration?: number;
}

interface IssueCreateOptions {
  failures: FailedTest[];
  runId: string;
  commitSha: string;
  branch: string;
  repository: string;
  workflowName?: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  labels: Array<{ name: string }>;
}

const ISSUE_LABELS = ['test-failure', 'ci', 'automated'];
const MAX_FAILURES_IN_ISSUE = 10;
const ERROR_PREVIEW_LENGTH = 500;

async function githubRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<T>;
}

async function findExistingIssue(repository: string): Promise<GitHubIssue | null> {
  try {
    const issues = await githubRequest<GitHubIssue[]>(
      `/repos/${repository}/issues?state=open&labels=${ISSUE_LABELS.join(',')}&per_page=10`
    );

    // Find an issue created in the last 24 hours with test-failure label
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const issue of issues) {
      if (issue.title.includes('Test Failure in CI')) {
        return issue;
      }
    }

    return null;
  } catch (error) {
    console.warn('Could not check for existing issues:', error);
    return null;
  }
}

function generateIssueTitle(failureCount: number): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `🔴 Test Failure in CI - ${failureCount} test(s) failing (${timestamp})`;
}

function generateIssueBody(options: IssueCreateOptions): string {
  const { failures, runId, commitSha, branch, repository, workflowName } = options;
  const lines: string[] = [];

  lines.push('## 🔴 Test Failure in CI');
  lines.push('');
  lines.push('Automated tests have failed in the CI pipeline.');
  lines.push('');

  // Workflow details
  lines.push('### Workflow Details');
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(
    `| **Workflow Run** | [#${runId}](https://github.com/${repository}/actions/runs/${runId}) |`
  );
  lines.push(`| **Branch** | \`${branch}\` |`);
  lines.push(
    `| **Commit** | [\`${commitSha.substring(0, 7)}\`](https://github.com/${repository}/commit/${commitSha}) |`
  );
  if (workflowName) {
    lines.push(`| **Workflow** | ${workflowName} |`);
  }
  lines.push(`| **Time** | ${new Date().toISOString()} |`);
  lines.push('');

  // Failed tests
  lines.push(`### Failed Tests (${failures.length})`);
  lines.push('');

  const displayFailures = failures.slice(0, MAX_FAILURES_IN_ISSUE);

  for (let i = 0; i < displayFailures.length; i++) {
    const failure = displayFailures[i];
    lines.push(`#### ${i + 1}. \`${failure.name}\``);
    if (failure.file) {
      lines.push(`**File:** \`${failure.file}\``);
    }
    if (failure.duration) {
      lines.push(`**Duration:** ${(failure.duration / 1000).toFixed(2)}s`);
    }
    if (failure.error) {
      const errorPreview =
        failure.error.length > ERROR_PREVIEW_LENGTH
          ? failure.error.substring(0, ERROR_PREVIEW_LENGTH) + '...'
          : failure.error;
      lines.push('');
      lines.push('```');
      lines.push(errorPreview);
      lines.push('```');
    }
    lines.push('');
  }

  if (failures.length > MAX_FAILURES_IN_ISSUE) {
    lines.push(`*...and ${failures.length - MAX_FAILURES_IN_ISSUE} more failures*`);
    lines.push('');
  }

  // Reproduction steps
  lines.push('### Reproduction');
  lines.push('');
  lines.push('```bash');
  lines.push('# Clone and checkout the failing commit');
  lines.push(`git checkout ${commitSha}`);
  lines.push('');
  lines.push('# Install dependencies');
  lines.push('pnpm install');
  lines.push('');
  lines.push('# Run the failing tests');
  lines.push('pnpm test:critical');
  lines.push('```');
  lines.push('');

  // Checklist
  lines.push('### Resolution Checklist');
  lines.push('');
  lines.push('- [ ] Investigate the root cause');
  lines.push('- [ ] Determine if this is a flaky test or a real regression');
  lines.push('- [ ] Fix the failing test(s) or underlying code');
  lines.push('- [ ] Verify fix passes locally');
  lines.push('- [ ] Create PR with the fix');
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('*This issue was automatically created by the CI test failure detector.*');
  lines.push('*Close this issue once all failures are resolved.*');

  return lines.join('\n');
}

async function createIssue(options: IssueCreateOptions): Promise<number> {
  const { repository, failures } = options;

  const title = generateIssueTitle(failures.length);
  const body = generateIssueBody(options);

  const issue = await githubRequest<GitHubIssue>(`/repos/${repository}/issues`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      body,
      labels: ISSUE_LABELS,
    }),
  });

  return issue.number;
}

async function updateExistingIssue(
  repository: string,
  issueNumber: number,
  options: IssueCreateOptions
): Promise<void> {
  const { failures, runId, commitSha, branch } = options;

  const comment = `## New Failures Detected

**Workflow Run:** [#${runId}](https://github.com/${repository}/actions/runs/${runId})
**Branch:** \`${branch}\`
**Commit:** \`${commitSha.substring(0, 7)}\`
**Time:** ${new Date().toISOString()}

### Failed Tests (${failures.length})

${failures
  .slice(0, 5)
  .map((f, i) => `${i + 1}. \`${f.name}\``)
  .join('\n')}
${failures.length > 5 ? `\n*...and ${failures.length - 5} more*` : ''}
`;

  await githubRequest(`/repos/${repository}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body: comment }),
  });
}

function parseFailuresArg(arg: string): FailedTest[] {
  try {
    // Try parsing as JSON first
    return JSON.parse(arg);
  } catch {
    // Fall back to comma-separated list
    return arg.split(',').map(name => ({ name: name.trim() }));
  }
}

async function loadFailuresFromFile(filePath: string): Promise<FailedTest[]> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const results = JSON.parse(data);

    // Handle Jest output format
    if (results.testResults) {
      const failures: FailedTest[] = [];
      for (const suite of results.testResults) {
        for (const test of suite.assertionResults || []) {
          if (test.status === 'failed') {
            failures.push({
              name: test.fullName || test.title,
              error: test.failureMessages?.join('\n'),
              file: suite.name,
              duration: test.duration,
            });
          }
        }
      }
      return failures;
    }

    // Handle Playwright output format
    if (results.suites) {
      const failures: FailedTest[] = [];
      const extractFailures = (suites: any[]) => {
        for (const suite of suites) {
          for (const spec of suite.specs || []) {
            for (const test of spec.tests || []) {
              if (test.status === 'failed' || test.status === 'timedOut') {
                failures.push({
                  name: spec.title,
                  error: test.results?.[0]?.error?.message,
                  file: suite.file,
                  duration: test.results?.[0]?.duration,
                });
              }
            }
          }
          if (suite.suites) {
            extractFailures(suite.suites);
          }
        }
      };
      extractFailures(results.suites);
      return failures;
    }

    return [];
  } catch (error) {
    console.warn('Could not load failures from file:', error);
    return [];
  }
}

async function main(): Promise<void> {
  console.log('🔍 Checking for test failures to report...');

  // Parse arguments
  const args = process.argv.slice(2);
  let failures: FailedTest[] = [];
  let runId = process.env.GITHUB_RUN_ID || '';
  let commitSha = process.env.GITHUB_SHA || '';
  let branch = process.env.GITHUB_REF_NAME || '';
  let repository = process.env.GITHUB_REPOSITORY || '';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--failures':
        failures = parseFailuresArg(args[++i]);
        break;
      case '--failures-file':
        failures = await loadFailuresFromFile(args[++i]);
        break;
      case '--run-id':
        runId = args[++i];
        break;
      case '--commit':
        commitSha = args[++i];
        break;
      case '--branch':
        branch = args[++i];
        break;
      case '--repository':
        repository = args[++i];
        break;
    }
  }

  // Try to load failures from default file if not provided
  if (failures.length === 0) {
    failures = await loadFailuresFromFile('./test-results/results.json');
  }

  if (failures.length === 0) {
    console.log('✅ No test failures to report');
    return;
  }

  if (!repository) {
    console.error('❌ GITHUB_REPOSITORY or --repository is required');
    process.exit(1);
  }

  if (!process.env.GITHUB_TOKEN) {
    console.log('⚠️ GITHUB_TOKEN not set - skipping issue creation');
    console.log(`Would create issue for ${failures.length} failures`);
    return;
  }

  console.log(`Found ${failures.length} test failure(s)`);

  // Check for existing issue
  const existingIssue = await findExistingIssue(repository);

  const options: IssueCreateOptions = {
    failures,
    runId,
    commitSha,
    branch,
    repository,
  };

  if (existingIssue) {
    console.log(`📝 Updating existing issue #${existingIssue.number}`);
    await updateExistingIssue(repository, existingIssue.number, options);
    console.log(`✅ Updated issue #${existingIssue.number}`);
  } else {
    console.log('📝 Creating new issue...');
    const issueNumber = await createIssue(options);
    console.log(`✅ Created issue #${issueNumber}`);

    // Output for GitHub Actions
    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
      await fs.appendFile(outputFile, `issue_number=${issueNumber}\n`);
      await fs.appendFile(outputFile, `issue_created=true\n`);
    }
  }
}

main().catch(error => {
  console.error('❌ Error creating issue:', error);
  process.exit(1);
});
