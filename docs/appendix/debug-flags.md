# Debug Flags Configuration

## Overview

The application now includes several debug flags to reduce console noise during development while still allowing detailed logging when needed for debugging specific issues.

## Available Debug Flags

Add these to your `.env.local` file and set to `'true'` to enable verbose logging for specific areas:

### `DB_DEBUG`
Controls database connection and query logging.

```bash
DB_DEBUG=true
```

**When enabled:**
- Shows Prisma client connection flow
- Displays connection retries and timeouts
- Logs Supabase pooler connection details
- Shows database validation messages

**When disabled (default):**
- Only critical database errors are shown
- Connection messages are suppressed

### `API_DEBUG`
Controls API route operation logging.

```bash
API_DEBUG=true
```

**When enabled:**
- Shows user order query operations
- Displays spotlight-picks fetch operations
- Logs API operation success/failure details

**When disabled (default):**
- API operations run silently unless errors occur

### `AUTH_DEBUG`
Controls authentication and profile sync logging.

```bash
AUTH_DEBUG=true
```

**When enabled:**
- Shows profile lookup and creation operations
- Displays user sync queue operations
- Logs cookie setting warnings in Server Components

**When disabled (default):**
- Authentication operations run silently unless errors occur

### `BUILD_DEBUG`
Controls build-time and deployment logging.

```bash
BUILD_DEBUG=true
```

**When enabled:**
- Shows build-time detection messages
- Displays fallback data usage logs
- Logs server environment checks
- Shows Supabase admin client initialization
- Displays sitemap generation details

**When disabled (default):**
- Build and deployment operations run silently with clean output

## Usage

1. Create or edit your `.env.local` file in the project root
2. Add the debug flags you want to enable
3. Restart your development server for changes to take effect

Example `.env.local`:
```bash
# Only enable when debugging specific issues
DB_DEBUG=false
API_DEBUG=false
AUTH_DEBUG=false
BUILD_DEBUG=false

# Your other environment variables...
DATABASE_URL=your-database-url
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# etc.
```

## Default Behavior

By default, all debug flags are `false`, resulting in a much cleaner development console with only essential logs:
- Error messages (always shown)
- Warning messages for important issues
- Build and compilation information from Next.js
- HTTP request/response logs

## Recommended Usage

- **Normal development:** Keep all flags `false` for a clean console
- **Debugging database issues:** Enable `DB_DEBUG=true`
- **Debugging API problems:** Enable `API_DEBUG=true`
- **Debugging authentication:** Enable `AUTH_DEBUG=true`
- **Debugging build/deployment:** Enable `BUILD_DEBUG=true`
- **Comprehensive debugging:** Enable all flags temporarily

Remember to disable debug flags when not actively debugging to maintain a clean development experience.
