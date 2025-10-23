# Claude Code Review Setup Guide

This guide explains how to set up automated Claude code reviews for pull requests.

## Overview

The Claude Code Review GitHub Action automatically reviews every pull request using Claude AI, providing:

- Code quality assessment
- Potential bugs and security issues
- Performance optimization suggestions
- Test coverage analysis
- Best practices for Next.js, TypeScript, and React

## Setup Instructions

### Step 1: Get an Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to **API Keys** in the settings
4. Click **Create Key**
5. Give it a name like "GitHub Actions - Destino SF"
6. Copy the API key (starts with `sk-ant-...`)

**Important:** Save this key securely - you won't be able to see it again!

### Step 2: Add API Key to GitHub Secrets

1. Go to your GitHub repository: https://github.com/ReadySet1/destino-sf
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter the following:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Secret:** Paste your API key from Step 1
6. Click **Add secret**

### Step 3: Verify Setup

1. Create a new pull request or push to an existing one
2. Go to the **Actions** tab in your repository
3. Look for the **Claude Code Review** workflow
4. Wait for it to complete (usually 30-60 seconds)
5. Check the pull request - you should see a comment from the bot with the review

## What Gets Reviewed

The Claude reviewer analyzes:

### Code Quality
- Adherence to Next.js 15 best practices
- TypeScript type safety
- React patterns and hooks usage
- Code organization and structure
- Naming conventions

### Security
- SQL injection vulnerabilities
- XSS (Cross-Site Scripting) risks
- Authentication and authorization issues
- Input validation
- Sensitive data exposure

### Performance
- Unnecessary re-renders
- Database query optimization
- Caching opportunities
- Bundle size considerations
- Server Component vs Client Component usage

### Testing
- Test coverage adequacy
- Missing test cases
- Test quality and structure
- Edge cases coverage

### Best Practices
- Error handling
- Logging
- Documentation
- Accessibility (a11y)
- SEO considerations

## Review Format

Each review includes:

1. **Summary**: Brief overview of changes
2. **Code Quality**: Assessment of patterns and practices
3. **Potential Issues**: Bugs, security, or performance concerns
4. **Testing**: Test adequacy and suggestions
5. **Suggestions**: Specific improvements with examples
6. **Security**: Security-specific concerns
7. **Performance**: Performance-specific concerns
8. **Overall Rating**: Approve / Needs Minor Changes / Needs Major Changes

## Example Review

```markdown
## 🤖 Claude Code Review

### Summary
This PR implements a comprehensive test data management system with factories,
seeding, isolation, and validation utilities.

### Code Quality ⭐⭐⭐⭐⭐
Excellent code organization with clear separation of concerns. TypeScript types
are properly defined and factory functions follow consistent patterns.

### Potential Issues ⚠️
None identified. Code follows best practices throughout.

### Testing ✅
Comprehensive test utilities provided. Transaction-based isolation is well-implemented.
Consider adding integration tests for the factory functions themselves.

### Suggestions 💡
1. Consider adding JSDoc comments for factory options:
   ```typescript
   /**
    * Options for building a user
    * @property email - User email address
    * @property role - User role (ADMIN | CUSTOMER)
    */
   export interface UserFactoryOptions {
     email?: string;
     role?: UserRole;
   }
   ```

### Security 🔒
No security concerns identified. Cleanup utilities properly handle test data isolation.

### Performance ⚡
Transaction-based rollback is much faster than manual cleanup. Good optimization.

### Overall Rating ✅ APPROVE
High-quality implementation with excellent documentation and patterns.
```

## Workflow Configuration

The workflow is configured in `.github/workflows/claude-code-review.yml`:

- **Trigger**: Opens, syncs, or reopens PRs to `main` or `development`
- **Model**: Claude Sonnet 4.0 (latest)
- **Max tokens**: 4,096 (allows comprehensive reviews)
- **Permissions**: Read contents, write PR comments

### Customization

You can customize the workflow by editing `.github/workflows/claude-code-review.yml`:

**Change the model:**
```yaml
"model": "claude-sonnet-4-20250514"  # Change to opus-4 for deeper reviews
```

**Change max tokens:**
```yaml
"max_tokens": 4096  # Increase for longer reviews
```

**Add more context:**
```yaml
# Add project-specific guidelines to the prompt
"content": "You are an expert reviewer... [add your guidelines]"
```

**Filter by files:**
```yaml
on:
  pull_request:
    types: [opened, synchronize]
    paths:
      - 'src/**'      # Only review src/ changes
      - 'tests/**'    # Only review tests/ changes
```

## Cost Estimation

Claude API pricing (as of 2024):
- **Input**: ~$3 per million tokens
- **Output**: ~$15 per million tokens

Typical PR review costs:
- Small PR (< 500 lines): $0.05 - $0.10
- Medium PR (500-2000 lines): $0.10 - $0.30
- Large PR (> 2000 lines): $0.30 - $0.80

**Monthly estimate** (assuming 50 PRs/month): **$5-15/month**

To reduce costs:
- Set up path filters to only review critical files
- Use Sonnet instead of Opus (faster and cheaper)
- Truncate very large diffs (already implemented)

## Troubleshooting

### Review not appearing?

1. Check the Actions tab for errors
2. Verify `ANTHROPIC_API_KEY` is set correctly
3. Ensure the workflow has PR write permissions
4. Check if the PR branch/base matches the workflow triggers

### API rate limits?

Anthropic has generous rate limits:
- 50 requests per minute
- 40,000 tokens per minute

If you hit limits:
1. Add delays between reviews
2. Batch reviews instead of per-commit
3. Upgrade your Anthropic plan

### Review quality issues?

Improve review quality by:
1. Adding project-specific context to the prompt
2. Including CLAUDE.md guidelines in the prompt
3. Providing examples of good/bad patterns
4. Using a more powerful model (Opus 4)

### Security concerns?

The workflow:
- ✅ Only reads code (no write access except comments)
- ✅ Uses encrypted GitHub secrets for API keys
- ✅ Runs in isolated GitHub Actions environment
- ✅ Doesn't store code outside GitHub/Anthropic

API key security:
- Never commit API keys to code
- Rotate keys regularly (every 3-6 months)
- Use separate keys for different environments
- Monitor usage in Anthropic Console

## Disabling Reviews

To temporarily disable automated reviews:

1. Go to `.github/workflows/claude-code-review.yml`
2. Comment out the trigger:
   ```yaml
   # on:
   #   pull_request:
   #     types: [opened, synchronize, reopened]
   ```

Or delete the workflow file entirely.

## Best Practices

### For PR Authors

1. **Write clear PR descriptions** - Claude reviews context from descriptions
2. **Keep PRs focused** - Smaller PRs get better reviews
3. **Address feedback seriously** - Claude identifies real issues
4. **Supplement with human review** - AI isn't perfect

### For Reviewers

1. **Use Claude reviews as a first pass** - Not a replacement for human review
2. **Verify Claude's suggestions** - AI can make mistakes
3. **Look for patterns Claude misses** - Business logic, UX, architecture
4. **Provide feedback on review quality** - Help improve prompts

### For Maintainers

1. **Monitor API costs** - Track usage in Anthropic Console
2. **Update prompts regularly** - Keep guidelines current
3. **Rotate API keys** - Security best practice
4. **Collect feedback** - Improve review quality over time

## Support

For issues with:
- **Workflow setup**: Check GitHub Actions logs
- **API access**: Contact Anthropic support
- **Review quality**: Update the prompt in the workflow file
- **Cost concerns**: Adjust model or add filters

---

**Last Updated:** 2025-10-23
**Maintained by:** Destino SF Development Team
