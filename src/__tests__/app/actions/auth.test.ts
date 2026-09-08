/**
 * QA round 4 (E2 / E3) regressions for the auth server actions.
 *
 * - signUpAction built `emailRedirectTo` from a form field named `origin`
 *   that no form ever sends, so verification emails linked to
 *   "null/auth/callback". It must resolve the origin like forgotPasswordAction.
 * - signInAction hit an unrecoverable lockout when an auth user existed but the
 *   `profiles` row for that email carried a different id: the upsert-by-id
 *   violated the email unique index (P2002) and the user got
 *   "User profile could not be created". It must relink the row instead.
 */

// The global node setup mocks @prisma/client without the generated enums.
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
  Prisma: {},
  UserRole: { CUSTOMER: 'CUSTOMER', ADMIN: 'ADMIN' },
}));

const mockRedirect = jest.fn();
jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

const mockHeadersGet = jest.fn();
jest.mock('next/headers', () => ({
  headers: jest.fn(async () => ({ get: mockHeadersGet })),
}));

const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockGetUser = jest.fn();
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      getUser: mockGetUser,
    },
  })),
}));

const mockGetUserById = jest.fn();
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: { admin: { getUserById: (...args: unknown[]) => mockGetUserById(...args) } },
  },
}));

import { prisma } from '@/lib/db-unified';
import { signInAction, signUpAction } from '@/app/actions/auth';

const profileMock = prisma.profile as unknown as {
  findUnique: jest.Mock;
  upsert: jest.Mock;
  update: jest.Mock;
};

function formDataFrom(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const emailUniqueViolation = Object.assign(new Error('Unique constraint failed'), {
  code: 'P2002',
  meta: { target: ['email'] },
});

describe('signUpAction (E2 leftover)', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    profileMock.findUnique.mockResolvedValue(null);
    profileMock.upsert.mockResolvedValue({ id: 'auth-user-1' });
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    mockSignUp.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });
  });

  afterEach(() => {
    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it('builds emailRedirectTo from the request origin header, not a form field', async () => {
    mockHeadersGet.mockImplementation((name: string) =>
      name === 'origin' ? 'https://www.destinosf.com/' : null
    );

    await signUpAction(formDataFrom({ email: 'new@example.com', password: 'secret123' }));

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { emailRedirectTo: 'https://www.destinosf.com/auth/callback' },
      })
    );
  });

  it('falls back to NEXT_PUBLIC_SITE_URL when the origin header is absent', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.destinosf.com/';
    mockHeadersGet.mockReturnValue(null);

    await signUpAction(formDataFrom({ email: 'new@example.com', password: 'secret123' }));

    const call = mockSignUp.mock.calls[0][0];
    expect(call.options.emailRedirectTo).toBe('https://www.destinosf.com/auth/callback');
    expect(call.options.emailRedirectTo).not.toContain('null');
  });
});

describe('signInAction (E3 orphaned profile relink)', () => {
  const authUser = {
    id: 'c2125aa5-96f6-4bd4-b8a9-21b084e6b258',
    email: 'orphan@example.com',
    email_confirmed_at: '2026-08-27T20:40:00Z',
    user_metadata: {},
  };
  const orphanRow = { id: 'b895e652-66c9-403e-9c90-53954bd010ab', role: 'CUSTOMER' };
  const lockoutRedirect = expect.stringContaining(
    '/sign-in?error=User%20profile%20could%20not%20be%20created'
  );

  /** No row under the auth user's id, but `orphanRow` under the email. */
  function seedOrphan(row: { id: string; role: string } | null = orphanRow) {
    profileMock.findUnique.mockImplementation(async (args: { where: { id?: string } }) =>
      args.where.id ? null : row
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: authUser } });
    seedOrphan();
    // The upsert-by-id collides with the orphan row's unique email...
    profileMock.upsert.mockRejectedValue(emailUniqueViolation);
    // ...and the row's old id no longer exists in auth.users.
    mockGetUserById.mockResolvedValue({ data: { user: null }, error: { status: 404 } });
  });

  it('relinks the orphaned row (by its old id) to the auth user id on P2002(email)', async () => {
    profileMock.update.mockResolvedValue({ role: 'CUSTOMER' });

    await signInAction(formDataFrom({ email: authUser.email, password: 'secret123' }));

    expect(profileMock.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: authUser.email } })
    );
    expect(profileMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: orphanRow.id },
        data: expect.objectContaining({ id: authUser.id }),
        select: { role: true },
      })
    );
    expect(mockRedirect).toHaveBeenCalledWith('/menu');
  });

  it('keys the relink on the verified auth email, never the submitted form email', async () => {
    profileMock.update.mockResolvedValue({ role: 'CUSTOMER' });

    await signInAction(formDataFrom({ email: 'someone-else@example.com', password: 'secret123' }));

    expect(profileMock.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: authUser.email } })
    );
    expect(profileMock.findUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'someone-else@example.com' } })
    );
  });

  it('checks that the old profile id is really orphaned before relinking', async () => {
    profileMock.update.mockResolvedValue({ role: 'CUSTOMER' });

    await signInAction(formDataFrom({ email: authUser.email, password: 'secret123' }));

    expect(mockGetUserById).toHaveBeenCalledWith(orphanRow.id);
    expect(profileMock.update).toHaveBeenCalled();
  });

  it('refuses to relink when the old id still belongs to a live auth user', async () => {
    mockGetUserById.mockResolvedValue({ data: { user: { id: orphanRow.id } }, error: null });

    await signInAction(formDataFrom({ email: authUser.email, password: 'secret123' }));

    expect(profileMock.update).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(lockoutRedirect);
  });

  it('fails closed when the admin lookup itself errors', async () => {
    mockGetUserById.mockRejectedValue(new Error('service role key missing'));

    await signInAction(formDataFrom({ email: authUser.email, password: 'secret123' }));

    expect(profileMock.update).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(lockoutRedirect);
  });

  it('honors the redirect form field after a relink', async () => {
    profileMock.update.mockResolvedValue({ role: 'CUSTOMER' });

    await signInAction(
      formDataFrom({ email: authUser.email, password: 'secret123', redirect: '/catering/checkout' })
    );

    expect(mockRedirect).toHaveBeenCalledWith('/catering/checkout');
  });

  it('refuses to relink an ADMIN row on sign-in', async () => {
    seedOrphan({ ...orphanRow, role: 'ADMIN' });

    await signInAction(formDataFrom({ email: authUser.email, password: 'secret123' }));

    expect(profileMock.update).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(lockoutRedirect);
  });

  it('refuses to relink when the auth email is not confirmed', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { ...authUser, email_confirmed_at: null } },
    });

    await signInAction(formDataFrom({ email: authUser.email, password: 'secret123' }));

    expect(profileMock.update).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(lockoutRedirect);
  });

  it('refuses to relink when the auth user has no email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { ...authUser, email: undefined } } });

    await signInAction(formDataFrom({ email: authUser.email, password: 'secret123' }));

    expect(profileMock.update).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(lockoutRedirect);
  });

  it('does not log the customer email when relinking', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    profileMock.update.mockResolvedValue({ role: 'CUSTOMER' });

    await signInAction(formDataFrom({ email: authUser.email, password: 'secret123' }));

    const logged = warn.mock.calls.map(args => args.join(' ')).join('\n');
    expect(logged).toContain(authUser.id);
    expect(logged).not.toContain(authUser.email);
    warn.mockRestore();
  });

  it('still reports the lockout when the relink itself fails', async () => {
    profileMock.update.mockRejectedValue(new Error('boom'));

    await signInAction(formDataFrom({ email: authUser.email, password: 'secret123' }));

    expect(mockRedirect).toHaveBeenCalledWith(lockoutRedirect);
  });

  it.each([
    ['a P2002 on a non-email target', { code: 'P2002', meta: { target: ['id'] } }],
    ['a P2002 without meta', { code: 'P2002' }],
  ])('does not relink on %s', async (_label, shape) => {
    profileMock.upsert.mockRejectedValue(Object.assign(new Error('unique'), shape));

    await signInAction(formDataFrom({ email: authUser.email, password: 'secret123' }));

    expect(profileMock.update).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(lockoutRedirect);
  });

  it('relinks when the P2002 target is a constraint name mentioning email', async () => {
    profileMock.upsert.mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002', meta: { target: 'profiles_email_key' } })
    );
    profileMock.update.mockResolvedValue({ role: 'CUSTOMER' });

    await signInAction(formDataFrom({ email: authUser.email, password: 'secret123' }));

    expect(profileMock.update).toHaveBeenCalled();
  });

  it('does not attempt a relink for unrelated creation errors', async () => {
    profileMock.upsert.mockRejectedValue(new Error('connection reset'));

    await signInAction(formDataFrom({ email: authUser.email, password: 'secret123' }));

    expect(profileMock.update).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/sign-in?error='));
  });

  it('creates a fresh profile when none exists under either key', async () => {
    profileMock.upsert.mockResolvedValue({ role: 'CUSTOMER' });

    await signInAction(formDataFrom({ email: authUser.email, password: 'secret123' }));

    expect(profileMock.update).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith('/menu');
  });
});
