/**
 * The edit-product screen wraps ProductImageManager and serialises the result into a
 * hidden `imageUrls` field. QA finding F5 removed the fake upload zone from the
 * manager; this pins the part of the edit screen that still has to work — a removal
 * has to reach the form payload, not just the UI.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductImageSection } from '@/components/admin/products/ProductImageSection';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    alt,
    fill,
    sizes,
    priority,
    ...props
  }: {
    alt: string;
    fill?: boolean;
    sizes?: string;
    priority?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img alt={alt} {...props} />
  ),
}));

describe('ProductImageSection', () => {
  const images = ['https://example.test/a.jpg', 'https://example.test/b.jpg'];

  const hiddenInput = (container: HTMLElement) =>
    container.querySelector('input[type="hidden"][name="imageUrls"]') as HTMLInputElement;

  it('submits the images the product already has', () => {
    const { container } = render(<ProductImageSection initialImages={images} />);

    expect(JSON.parse(hiddenInput(container).value)).toEqual(images);
    expect(screen.getByText(/images come from square/i)).toBeInTheDocument();
  });

  it('drops a removed image from the submitted payload', () => {
    const { container } = render(<ProductImageSection initialImages={images} />);

    fireEvent.click(screen.getAllByRole('button', { name: /remove image/i })[0]);

    expect(JSON.parse(hiddenInput(container).value)).toEqual(['https://example.test/b.jpg']);
    expect(screen.getByText(/^1 image synced from Square$/i)).toBeInTheDocument();
  });

  it('submits an empty array when the product has no images', () => {
    const { container } = render(<ProductImageSection initialImages={[]} />);

    expect(JSON.parse(hiddenInput(container).value)).toEqual([]);
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });
});
