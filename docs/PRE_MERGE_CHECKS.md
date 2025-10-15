# Pre-Merge Validation System

This document describes the automated pre-merge validation system for the Destino SF project.

## Overview

The project uses a multi-layered validation approach to ensure code quality before merging:

1. **Local Git Hooks** - Run on developer machines before commits/pushes
2. **GitHub Actions** - Automated checks on pull requests
3. **Manual Validation** - Commands developers can run locally

---

## 1. Local Git Hooks (Recommended)

### Installation

Install the git hooks by running:

```bash
./scripts/install-git-hooks.sh
```

### What Gets Installed

#### Pre-Commit Hook

Runs automatically before every `git commit`:

- ✅ TypeScript type checking (`pnpm type-check`)
- ✅ ESLint (`pnpm lint`)
- ✅ Code formatting check (`pnpm format --check`)
- ✅ Prisma schema validation (if schema.prisma changed)

**Fails the commit if any check fails.**

#### Pre-Push Hook

Runs automatically before every `git push`:

- ✅ Production build (`pnpm build`)
- ✅ Critical path tests (`pnpm test:critical`)
- ✅ Unit tests (`pnpm test:unit`)
- ✅ **Additional checks for `development`/`main` branches:**
  - API tests (`pnpm test:api`)
  - Component tests (`pnpm test:components`)

**Prevents push if any check fails.**

### Bypassing Hooks (Emergency Use Only)

```bash
# Skip pre-commit hook
git commit --no-verify

# Skip pre-push hook
git push --no-verify
```

⚠️ **Warning**: Only use `--no-verify` in emergencies. CI will still catch issues.

---

## 2. GitHub Actions (Automated)

### For Pull Requests to `development`

**Workflow**: `.github/workflows/pre-merge-development.yml`

**Triggered on**: PR opened, synchronized, or reopened

**Checks performed**:

1. ✅ TypeScript type checking
2. ✅ ESLint
3. ✅ Code formatting
4. ✅ Production build
5. ✅ Prisma client generation
6. ✅ Prisma schema validation
7. ✅ Database migration test
8. ✅ Unit tests
9. ✅ Critical path tests
10. ✅ API tests
11. ✅ Component tests
12. ✅ Security audit (pnpm audit)

**On success**: Posts a ✅ comment with validation report
**On failure**: Posts a ❌ comment with failure notice

**Code review checklist**: Automatically posted when PR is opened

### For Pull Requests to `main`

**Workflow**: `.github/workflows/pre-deployment.yml`

**Includes all `development` checks PLUS**:

- ✅ E2E critical tests
- ✅ Test coverage verification
- ✅ Deployment approval gate
- ✅ Production deployment issue creation

---

## 3. Manual Validation

### Quick Validation (Before Committing)

```bash
pnpm validate
```

Runs:

- Type checking
- Linting

### Full Validation (Before Creating PR)

```bash
# Run all checks that CI will run
pnpm type-check
pnpm lint
pnpm format --check
pnpm build
pnpm prisma validate
pnpm test:unit
pnpm test:critical
pnpm test:api
pnpm test:components
```

### Individual Checks

```bash
# Type checking only
pnpm type-check

# Linting only
pnpm lint

# Fix linting issues automatically
pnpm lint:fix

# Format check only
pnpm format --check

# Format all files
pnpm format

# Build only
pnpm build

# Prisma validation
pnpm prisma generate
pnpm prisma validate

# Test suites
pnpm test:unit          # Unit tests
pnpm test:critical      # Critical path tests
pnpm test:api           # API route tests
pnpm test:components    # Component tests
pnpm test:e2e:critical  # E2E critical flows

# Security audit
pnpm audit --audit-level moderate
```

---

## 4. Git Workflow

### Creating a Feature Branch

```bash
# Start from development
git checkout development
git pull origin development

# Create feature branch
git checkout -b feature/your-feature-name
```

### Making Commits

```bash
# Stage changes
git add .

# Commit (pre-commit hook runs automatically)
git commit -m "feat: descriptive commit message"
```

**Commit message format**:

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `chore:` - Build/tooling changes

### Pushing Changes

```bash
# Push to remote (pre-push hook runs automatically)
git push -u origin feature/your-feature-name
```

### Creating a Pull Request

```bash
# Using GitHub CLI (recommended)
gh pr create --base development --title "feat: Your Feature" --body "Description"

# Or use GitHub UI
```

**PR checklist**:

1. All local hooks passed
2. All CI checks pass (wait for GitHub Actions)
3. Code review completed
4. All feedback addressed
5. No merge conflicts
6. Tests added for new functionality
7. Documentation updated if needed

---

## 5. Troubleshooting

### Hook Issues

**Problem**: Hook fails but I think it's correct

```bash
# Run the check manually to see detailed output
pnpm type-check  # or lint, format --check, etc.
```

**Problem**: Hook installation failed

```bash
# Check if .git/hooks directory exists
ls -la .git/hooks/

# Re-run installation
./scripts/install-git-hooks.sh
```

### CI Failures

**Problem**: CI fails but passes locally

```bash
# Ensure you're running the same Node version
node -v  # Should be 20.x

# Ensure dependencies are up to date
pnpm install

# Clear caches
pnpm clean
pnpm install
pnpm build
```

**Problem**: Database migration test fails

```bash
# Verify Prisma schema is valid
pnpm prisma validate

# Regenerate Prisma client
pnpm prisma generate

# Check migration status
pnpm prisma migrate status
```

### Test Failures

**Problem**: Tests pass locally but fail in CI

```bash
# Run tests in CI-like environment
NODE_ENV=test pnpm test

# Check for environment-specific issues
# CI uses PostgreSQL service, ensure your local DB matches
```

**Problem**: Specific test fails

```bash
# Run single test file
pnpm test path/to/test.test.ts

# Run with verbose output
pnpm test path/to/test.test.ts --verbose

# Run without cache
pnpm test path/to/test.test.ts --no-cache
```

---

## 6. Maintenance

### Updating Git Hooks

If the hooks change, developers need to reinstall:

```bash
./scripts/install-git-hooks.sh
```

Notify team when hooks are updated.

### Updating CI Workflows

When modifying workflows in `.github/workflows/`:

1. Test changes on a feature branch first
2. Verify all checks still pass
3. Document any new requirements
4. Update this documentation

### Adding New Checks

To add a new validation check:

1. **Update git hooks**: Edit `scripts/install-git-hooks.sh`
2. **Update CI workflow**: Edit `.github/workflows/pre-merge-development.yml`
3. **Update documentation**: Update this file and `CLAUDE.md`
4. **Notify team**: Announce changes and request hook reinstallation

---

## 7. Best Practices

### For Developers

✅ **DO**:

- Install git hooks immediately after cloning
- Run `pnpm validate` before committing
- Fix issues before committing (don't rely on `--no-verify`)
- Keep PRs focused and reasonably sized
- Write meaningful commit messages
- Add tests for new features
- Update documentation

❌ **DON'T**:

- Use `--no-verify` except in emergencies
- Push directly to `development` or `main`
- Commit commented-out code or console.logs
- Ignore linting warnings
- Skip writing tests

### For Code Reviewers

✅ **Check**:

- All CI checks pass before reviewing
- Code follows project conventions
- Tests cover new functionality
- No security vulnerabilities
- Documentation is updated
- No breaking changes without migration plan

---

## 8. Summary

**Three layers of protection**:

1. **Local hooks** - Catch issues before commit/push (fastest feedback)
2. **CI validation** - Comprehensive checks on PRs (catches what hooks missed)
3. **Code review** - Human review of logic, design, security

**Why multiple layers?**

- Faster feedback locally (don't wait for CI)
- CI catches environment-specific issues
- Hooks can be bypassed, CI cannot (unless you have admin access)
- Defense in depth = higher quality code

---

## 9. Quick Reference

```bash
# Setup (once)
./scripts/install-git-hooks.sh

# Before committing
pnpm validate

# Before creating PR
pnpm validate && pnpm test:critical

# Full validation
pnpm type-check && pnpm lint && pnpm build && pnpm test

# Emergency bypass (not recommended)
git commit --no-verify
git push --no-verify
```

---

## Related Documentation

- [Product Archive Deployment Guide](./PRODUCT_ARCHIVE_DEPLOYMENT_GUIDE.md)
- [CLAUDE.md](../CLAUDE.md) - Main development guide
- [Phase 5 Test Infrastructure](./PHASE_5_TEST_INFRASTRUCTURE_SUMMARY.md)

---

**Last Updated**: 2025-10-01
**Maintained By**: Development Team
