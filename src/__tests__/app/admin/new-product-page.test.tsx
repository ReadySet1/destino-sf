/**
 * Guards QA finding F5 on the "Create New Product" screen.
 *
 * This page used to render a dashed drag-and-drop zone ("Image Upload Component",
 * "Drag and drop images here, or click to browse files") whose only real element was
 * a hidden `imageUrls` input pinned to "[]". Square owns product images, so the
 * mockup is gone — but the hidden input must stay, because the untouched server
 * action still reads `imageUrls` from the form data.
 */
import { render, screen } from '@testing-library/react';

const mockFindMany = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    category: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

jest.mock('@/app/(dashboard)/admin/products/actions', () => ({
  createProductAction: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import NewProductPage from '@/app/(dashboard)/admin/products/new/page';

describe('NewProductPage - Product Images section', () => {
  beforeEach(() => {
    mockFindMany.mockResolvedValue([
      { id: 'cat-1', name: 'Alfajores' },
      { id: 'cat-2', name: 'Empanadas' },
    ]);
  });

  const renderPage = async () => render(await NewProductPage());

  it('explains that Square owns product images', async () => {
    await renderPage();

    expect(screen.getByText(/images come from square/i)).toBeInTheDocument();
    expect(
      screen.getByText(/square is the source of truth for product images/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/managed in the square catalog and synced automatically/i)
    ).toBeInTheDocument();
  });

  it('no longer renders the drag-and-drop upload mockup', async () => {
    const { container } = await renderPage();

    expect(screen.queryByText(/image upload component/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/drag and drop images here/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no images selected/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/upload high-quality images/i)).not.toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it('keeps the hidden imageUrls input the server action still reads', async () => {
    const { container } = await renderPage();

    const hidden = container.querySelector('input[type="hidden"][name="imageUrls"]');
    expect(hidden).not.toBeNull();
    expect(hidden).toHaveValue('[]');
    expect(JSON.parse((hidden as HTMLInputElement).value)).toEqual([]);
  });

  it('leaves the rest of the create form intact', async () => {
    await renderPage();

    expect(screen.getByLabelText(/product name/i)).toBeRequired();
    expect(screen.getByLabelText(/^price/i)).toBeRequired();
    expect(screen.getByLabelText(/category/i)).toBeRequired();
    expect(screen.getByRole('option', { name: 'Empanadas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create product/i })).toBeInTheDocument();
  });
});
