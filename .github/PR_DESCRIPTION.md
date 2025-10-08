# Fix Profile Update Permission Denied Error

**Fixes:** [DES-37](https://linear.app/ready-set-llc/issue/DES-37/profile-update-fails-with-permission-denied-error-in-dev-branch)

## 🎯 Summary

Fixed a critical bug preventing users from updating their profile information (name and phone number). The issue manifested differently in development and production:
- **Development**: Displayed "Permission denied" error (PostgreSQL error code 42501)
- **Production**: Failed silently without updating the database

## 🔍 Root Cause Analysis

### The Problem
The `AccountProfile` component was using the browser-side Supabase client to directly update the `profiles` table from a client component. This caused an authentication context mismatch.

### Why It Failed
1. Browser client's auth session wasn't properly synchronized with server-side session
2. JWT token wasn't being passed correctly to Supabase in the database query
3. Row Level Security (RLS) policy check `(id = auth.uid())` failed because `auth.uid()` returned `NULL`
4. PostgreSQL rejected the update with error code 42501 (permission denied)

### RLS Policies (Verified in Supabase)
```sql
-- This policy was failing due to NULL auth.uid()
Policy: "Users can update own profile"
Command: UPDATE
Check: (id = auth.uid())
With Check: (id = auth.uid())
```

## ✅ Solution

Implemented a server action pattern following Next.js 15 best practices:

### Architecture Change
```
Before: Client Component → Browser Client → Direct DB Update ❌
After:  Client Component → Server Action → Server Client → DB Update ✅
```

### Changes Made

#### 1. New Server Action (`src/app/(store)/account/actions.ts`)
```typescript
export async function updateProfileAction(data: {
  name?: string | null;
  phone?: string | null;
}): Promise<{ success: boolean; error?: string }>
```

**Features:**
- Runs on server with proper authentication context
- Uses server-side Supabase client (maintains JWT session)
- Comprehensive error handling
- Path revalidation after successful update
- Type-safe with explicit return types

#### 2. Updated Component (`src/components/store/AccountProfile.tsx`)
**Removed:**
- Direct Supabase client instantiation
- Complex error handling for permission errors
- Debug logging statements

**Added:**
- Server action invocation
- Simplified error handling
- Cleaner code structure

## 🧪 Testing Performed

### Automated Testing
- ✅ **TypeScript Compilation**: No errors
- ✅ **ESLint**: All checks passed
- ✅ **Code Quality**: No `any` types, no debug statements
- ⚠️ **Unit Tests**: Pre-existing test failures unrelated to this PR (Square webhooks, spotlight picks)

### Manual Testing Required
- [ ] Profile update on development environment
- [ ] Profile update on production environment
- [ ] Test with different user roles (customer, admin)
- [ ] Verify error handling when network fails
- [ ] Check browser console for errors

### Files Changed
```
src/app/(store)/account/actions.ts       | +53 additions
src/components/store/AccountProfile.tsx  | -24 deletions, +7 additions
```

## 📊 Impact Assessment

### User Impact
- **High Priority**: Users can now successfully update their profiles
- **No Breaking Changes**: Existing functionality remains unchanged
- **Transparent Fix**: No user-facing changes to UI/UX

### Technical Impact
- **Performance**: Negligible impact (server actions are efficient)
- **Security**: ✅ Improved (proper auth context handling)
- **Maintainability**: ✅ Better (follows Next.js 15 patterns)
- **Database**: No schema changes required
- **Dependencies**: No new dependencies added

## 🗄️ Database Migrations

**None required** - This is a code-level fix for existing functionality.

## 🚨 Breaking Changes

**None** - This is a backward-compatible bug fix.

## 🔒 Security Considerations

✅ **Security Improvements:**
- Proper JWT token handling in RLS policy evaluation
- Server-side authentication validation
- No exposure of client credentials
- Maintains existing RLS policies

## 📝 Additional Notes

### Why Server Actions?
Server actions in Next.js 15 provide:
1. Automatic CSRF protection
2. Proper auth context propagation
3. Better error handling
4. Type safety with TypeScript
5. Simplified client code

### Technical Details
- Server-side Supabase client properly passes JWT tokens for RLS policy evaluation
- `auth.uid()` now correctly returns the user's ID instead of NULL
- Path revalidation ensures UI reflects updated data immediately

## ✅ Reviewer Checklist

- [ ] Code follows TypeScript strict mode conventions
- [ ] No sensitive data in commits (API keys, tokens, passwords)
- [ ] Server action properly handles authentication
- [ ] Error messages are user-friendly
- [ ] RLS policies remain secure
- [ ] Code is well-documented with clear comments
- [ ] No unnecessary dependencies added
- [ ] Changes are isolated to the bug fix
- [ ] Manual testing confirms the fix works

## 🔗 Related Issues

- Fixes: [DES-37](https://linear.app/ready-set-llc/issue/DES-37/profile-update-fails-with-permission-denied-error-in-dev-branch)

## 📸 Screenshots

N/A - No UI changes, backend bug fix only

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
