/**
 * Guards QA finding F5: these admin screens used to render a styled drag-and-drop
 * zone ("Image Upload Component", "Drag and drop images here") with nothing behind
 * it. Square is the source of truth for product images, so the UI must not offer an
 * upload it cannot perform.
 */
import { render, screen } from '@testing-library/react';
import { ProductImageManager } from '@/components/admin/products/ProductImageManager';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: { alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img alt={alt} {...props} />
  ),
}));

describe('ProductImageManager', () => {
  const renderManager = (images: string[] = []) =>
    render(
      <ProductImageManager initialImages={images} onImagesChange={jest.fn()} maxImages={10} />
    );

  it('tells the admin that Square owns product images', () => {
    renderManager();

    expect(screen.getByText(/images come from square/i)).toBeInTheDocument();
    expect(screen.getByText(/update the matching item in the square catalog/i)).toBeInTheDocument();
  });

  it('does not advertise an upload it cannot perform', () => {
    const { container } = renderManager();

    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/drag and drop/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/add new images/i)).not.toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it('still reports how many images the product has', () => {
    renderManager(['https://example.test/a.jpg', 'https://example.test/b.jpg']);

    expect(screen.getByText(/current: 2 \/ 10/i)).toBeInTheDocument();
  });

  it('keeps the existing remove affordance for each image', () => {
    renderManager(['https://example.test/a.jpg']);

    expect(screen.getAllByRole('button', { name: /remove image/i })).toHaveLength(1);
  });
});
