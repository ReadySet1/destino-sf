/**
 * The admin catering order page recovers from a pooler prepared-statement
 * error (or a dead engine) by calling `forceResetConnection()` and retrying
 * the query once. It must never call `$disconnect()` on the shared client
 * itself: doing so from one request wedged the engine for the whole
 * container on 2026-09-16.
 */
import { render, screen } from '@testing-library/react';

const mockFindUnique = jest.fn<Promise<unknown>, unknown[]>();
const mockForceResetConnection = jest.fn<Promise<void>, unknown[]>(async () => {});
const mockDisconnect = jest.fn<Promise<void>, unknown[]>(async () => {});

jest.mock('@/lib/db-unified', () => ({
  prisma: {
    cateringOrder: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    $disconnect: (...args: unknown[]) => mockDisconnect(...args),
  },
  forceResetConnection: (...args: unknown[]) => mockForceResetConnection(...args),
}));

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import AdminCateringOrderPage from '@/app/(dashboard)/admin/catering/[cateringId]/page';

const CATERING_ID = '0b1f4a9e-2f3c-4d5e-8a6b-7c8d9e0f1a2b';

const cateringOrder = {
  id: CATERING_ID,
  squareOrderId: null,
  status: 'CONFIRMED',
  paymentStatus: 'PAID',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '555-0100',
  customerId: null,
  items: [],
  totalAmount: null,
  eventDate: new Date('2026-10-01T18:00:00Z'),
  numberOfPeople: 12,
  createdAt: new Date('2026-09-01T10:00:00Z'),
  updatedAt: new Date('2026-09-02T10:00:00Z'),
  deliveryAddress: null,
  specialRequests: null,
};

function preparedStatementError(): Error {
  return Object.assign(new Error('prepared statement "s1" already exists'), { code: '42P05' });
}

const renderPage = async () =>
  render(await AdminCateringOrderPage({ params: Promise.resolve({ cateringId: CATERING_ID }) }));

describe('AdminCateringOrderPage - database recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retries once through forceResetConnection after a prepared-statement error', async () => {
    mockFindUnique
      .mockRejectedValueOnce(preparedStatementError())
      .mockResolvedValueOnce(cateringOrder);

    await renderPage();

    expect(screen.getByText('Catering Order Details')).toBeInTheDocument();
    expect(mockFindUnique).toHaveBeenCalledTimes(2);
    expect(mockForceResetConnection).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it('treats "Response from the Engine was empty" as retryable', async () => {
    mockFindUnique
      .mockRejectedValueOnce(new Error('Response from the Engine was empty'))
      .mockResolvedValueOnce(cateringOrder);

    await renderPage();

    expect(screen.getByText('Catering Order Details')).toBeInTheDocument();
    expect(mockFindUnique).toHaveBeenCalledTimes(2);
    expect(mockForceResetConnection).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it('renders the error panel when the retry fails too, without a second reset', async () => {
    mockFindUnique
      .mockRejectedValueOnce(preparedStatementError())
      .mockRejectedValueOnce(new Error('retry also failed'));

    await renderPage();

    expect(screen.getByText('retry also failed')).toBeInTheDocument();
    expect(mockFindUnique).toHaveBeenCalledTimes(2);
    expect(mockForceResetConnection).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it('does not reset the connection for a non-connection error', async () => {
    mockFindUnique.mockRejectedValueOnce(new Error('column does not exist'));

    await renderPage();

    expect(screen.getByText('column does not exist')).toBeInTheDocument();
    expect(mockFindUnique).toHaveBeenCalledTimes(1);
    expect(mockForceResetConnection).not.toHaveBeenCalled();
    expect(mockDisconnect).not.toHaveBeenCalled();
  });
});
