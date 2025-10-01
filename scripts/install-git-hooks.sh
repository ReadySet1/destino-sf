#!/bin/bash

# Install Git Hooks for Pre-Merge Validation
# Run this script to set up local git hooks that validate code before commits

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

echo "📦 Installing Git Hooks for Pre-Merge Validation..."
echo ""

# Create pre-commit hook
cat > "$GIT_HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

# Pre-commit hook: Run basic code quality checks before committing

set -e

echo "🔍 Running pre-commit checks..."

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first."
    exit 1
fi

# Run TypeScript type checking
echo "  ✓ Type checking..."
pnpm type-check || {
    echo "❌ Type check failed. Please fix TypeScript errors before committing."
    exit 1
}

# Run ESLint
echo "  ✓ Linting..."
pnpm lint || {
    echo "❌ Linting failed. Run 'pnpm lint:fix' to auto-fix issues."
    exit 1
}

# Run Prettier format check
echo "  ✓ Format checking..."
pnpm format --check || {
    echo "❌ Code formatting issues found. Run 'pnpm format' to fix."
    exit 1
}

# Validate Prisma schema if changed
if git diff --cached --name-only | grep -q "prisma/schema.prisma"; then
    echo "  ✓ Validating Prisma schema..."
    pnpm prisma validate || {
        echo "❌ Prisma schema validation failed."
        exit 1
    }
fi

echo "✅ Pre-commit checks passed!"
EOF

# Create pre-push hook
cat > "$GIT_HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash

# Pre-push hook: Run comprehensive tests before pushing

set -e

echo "🚀 Running pre-push checks..."

# Get the branch being pushed
current_branch=$(git rev-parse --abbrev-ref HEAD)

echo "  Branch: $current_branch"

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first."
    exit 1
fi

# Run build to ensure it compiles
echo "  ✓ Building..."
pnpm build || {
    echo "❌ Build failed. Please fix build errors before pushing."
    exit 1
}

# Run critical tests
echo "  ✓ Running critical tests..."
pnpm test:critical || {
    echo "❌ Critical tests failed. Please fix failing tests before pushing."
    exit 1
}

# Run unit tests
echo "  ✓ Running unit tests..."
pnpm test:unit || {
    echo "❌ Unit tests failed. Please fix failing tests before pushing."
    exit 1
}

# Additional checks for development/main branches
if [[ "$current_branch" == "development" || "$current_branch" == "main" ]]; then
    echo "  ✓ Running additional checks for protected branch..."

    # Run API tests
    echo "    → API tests..."
    pnpm test:api || {
        echo "❌ API tests failed. Cannot push to $current_branch."
        exit 1
    }

    # Run component tests
    echo "    → Component tests..."
    pnpm test:components || {
        echo "❌ Component tests failed. Cannot push to $current_branch."
        exit 1
    }
fi

echo "✅ Pre-push checks passed!"
EOF

# Make hooks executable
chmod +x "$GIT_HOOKS_DIR/pre-commit"
chmod +x "$GIT_HOOKS_DIR/pre-push"

echo "✅ Git hooks installed successfully!"
echo ""
echo "📝 Installed hooks:"
echo "  • pre-commit: Type checking, linting, formatting"
echo "  • pre-push: Build verification, critical tests, unit tests"
echo ""
echo "💡 To skip hooks in emergencies (not recommended):"
echo "  git commit --no-verify"
echo "  git push --no-verify"
echo ""
echo "🎉 You're all set! Your commits will now be validated automatically."
