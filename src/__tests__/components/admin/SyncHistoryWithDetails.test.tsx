/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SyncHistoryWithDetails } from '@/components/admin/sync/SyncHistoryWithDetails';

jest.mock('lucide-react', () => {
  const stub = ({ className }: { className?: string }) => (
    <span className={className} data-testid="lucide-icon" />
  );
  return new Proxy(
    {},
    {
      get: () => stub,
    }
  );
});

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/form/FormButton', () => ({
  FormButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/form/FormStack', () => ({
  FormStack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/form/FormIcons', () => ({
  FormIcons: { refresh: <span /> },
}));

jest.mock('@/components/ui/ClientPagination', () => ({
  ClientPagination: () => null,
}));

const buildResponse = (rows: unknown[]) => ({
  history: rows,
  pagination: { limit: 10, offset: 0, returned: rows.length, hasMore: false },
  stats: { total: rows.length, last7Days: { completed: rows.length, failed: 0 } },
});

describe('<SyncHistoryWithDetails />', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders "No recent synchronizations" when API returns empty list', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => buildResponse([]),
    });

    render(<SyncHistoryWithDetails />);

    await waitFor(() =>
      expect(screen.getByText(/No recent synchronizations/i)).toBeInTheDocument()
    );
  });

  it('renders "Started by:" line when API returns rows with startedBy', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () =>
        buildResponse([
          {
            syncId: 'sync-1',
            status: 'COMPLETED',
            startTime: '2026-04-25T00:45:00Z',
            endTime: '2026-04-25T00:46:00Z',
            duration: 60,
            message: 'Sync completed successfully - 116 items synced',
            startedBy: 'James (james@destinosf.com)',
            summary: { syncedProducts: 116, skippedProducts: 0, warnings: 0, errors: 0 },
          },
        ]),
    });

    render(<SyncHistoryWithDetails />);

    await waitFor(() =>
      expect(
        screen.getByText(/Started by: James \(james@destinosf\.com\)/i)
      ).toBeInTheDocument()
    );
  });

  it('omits "Started by:" line when startedBy is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () =>
        buildResponse([
          {
            syncId: 'sync-2',
            status: 'COMPLETED',
            startTime: '2026-04-25T00:45:00Z',
            duration: 60,
            message: 'Sync completed',
          },
        ]),
    });

    render(<SyncHistoryWithDetails />);

    await waitFor(() =>
      expect(screen.getByText(/Sync completed/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/Started by:/i)).not.toBeInTheDocument();
  });

  it('shows error state when API returns non-OK', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'boom',
    });

    render(<SyncHistoryWithDetails />);

    await waitFor(() =>
      expect(screen.getByText(/Error loading sync history/i)).toBeInTheDocument()
    );
  });
});
