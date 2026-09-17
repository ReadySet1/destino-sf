/**
 * Guards QA finding F5: these admin screens used to render a styled drag-and-drop
 * zone ("Image Upload Component", "Drag and drop images here") with nothing behind
 * it. Square is the source of truth for product images, so the UI must not offer an
 * upload it cannot perform.
 *
 * The screen keeps exactly two real behaviours — removing an image and reporting how
 * many there are — so those are exercised, not just asserted to exist.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductImageManager } from '@/components/admin/products/ProductImageManager';

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

describe('ProductImageManager', () => {
  const onImagesChange = jest.fn();

  const renderManager = (images: string[] = []) =>
    render(<ProductImageManager initialImages={images} onImagesChange={onImagesChange} />);

  beforeEach(() => {
    onImagesChange.mockClear();
  });

  describe('the removed upload mockup', () => {
    it('tells the admin that Square owns product images', () => {
      renderManager([]);

      expect(screen.getByText(/images come from square/i)).toBeInTheDocument();
      expect(
        screen.getByText(/update the matching item in the square catalog/i)
      ).toBeInTheDocument();
    });

    it('does not advertise an upload it cannot perform', () => {
      const { container } = renderManager([]);

      expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/drag and drop/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/add new images/i)).not.toBeInTheDocument();
      expect(container.querySelector('input[type="file"]')).toBeNull();
    });

    it('drops the capacity language that only made sense for an upload', () => {
      // Under the limit: used to read "(8 slots available)".
      renderManager(['https://example.test/a.jpg', 'https://example.test/b.jpg']);

      expect(screen.queryByText(/slots available/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/maximum reached/i)).not.toBeInTheDocument();
    });

    it('no longer advertises a capacity it cannot honor', () => {
      // Used to read "Current: N / 10" beside "(N slots available)". Nothing can add
      // an image here, and a Square item with 12 images rendered "Current: 12 / 10".
      renderManager(['https://example.test/a.jpg', 'https://example.test/b.jpg']);

      expect(screen.queryByText(/maximum reached/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/current:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/\/ 10/)).not.toBeInTheDocument();
    });
  });

  describe('image count', () => {
    it('still reports how many images the product has', () => {
      renderManager(['https://example.test/a.jpg', 'https://example.test/b.jpg']);

      expect(screen.getByText(/^2 images synced from Square$/i)).toBeInTheDocument();
    });

    it('hides the grid and the count badge when there are no images', () => {
      const { container } = renderManager([]);

      expect(container.querySelector('img')).toBeNull();
      expect(screen.queryByText(/synced from Square/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /remove image/i })).not.toBeInTheDocument();
    });

    it('uses the singular noun for a single image', () => {
      renderManager(['https://example.test/a.jpg']);

      expect(screen.getByText(/^1 image synced from Square$/i)).toBeInTheDocument();
    });

    it('uses the plural noun for several images', () => {
      renderManager(['https://example.test/a.jpg', 'https://example.test/b.jpg']);

      expect(screen.getByText(/^2 images synced from Square$/i)).toBeInTheDocument();
    });
  });

  describe('removing images', () => {
    it('keeps the existing remove affordance for each image', () => {
      renderManager(['https://example.test/a.jpg']);

      expect(screen.getAllByRole('button', { name: /remove image/i })).toHaveLength(1);
    });

    it('removes the image the admin clicked and reports the new list', () => {
      renderManager([
        'https://example.test/a.jpg',
        'https://example.test/b.jpg',
        'https://example.test/c.jpg',
      ]);

      fireEvent.click(screen.getAllByRole('button', { name: /remove image/i })[1]);

      expect(onImagesChange).toHaveBeenCalledTimes(1);
      expect(onImagesChange).toHaveBeenCalledWith([
        'https://example.test/a.jpg',
        'https://example.test/c.jpg',
      ]);
    });

    it('updates the count the admin sees after a removal', () => {
      renderManager(['https://example.test/a.jpg', 'https://example.test/b.jpg']);

      fireEvent.click(screen.getAllByRole('button', { name: /remove image/i })[0]);

      expect(screen.getByText(/^1 image synced from Square$/i)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /remove image/i })).toHaveLength(1);
    });

    it('removes only the clicked occurrence when the same URL appears twice', () => {
      renderManager(['https://example.test/dup.jpg', 'https://example.test/dup.jpg']);

      fireEvent.click(screen.getAllByRole('button', { name: /remove image/i })[0]);

      expect(onImagesChange).toHaveBeenCalledWith(['https://example.test/dup.jpg']);
      expect(screen.getByText(/^1 image synced from Square$/i)).toBeInTheDocument();
    });

    it('clears every image and empties the grid when "Clear all" is used', () => {
      renderManager(['https://example.test/a.jpg', 'https://example.test/b.jpg']);

      fireEvent.click(screen.getByRole('button', { name: /clear all/i }));

      expect(onImagesChange).toHaveBeenCalledWith([]);
      expect(screen.queryByText(/synced from Square/i)).not.toBeInTheDocument();
    });
  });

  describe('broken image URLs', () => {
    it('shows a "Failed to load" tile when a Square image URL cannot be fetched', () => {
      const { container } = renderManager(['https://example.test/gone.jpg']);

      fireEvent.error(container.querySelector('img') as HTMLImageElement);

      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      expect(container.querySelector('img')).toBeNull();
    });

    it('keeps the other images rendered when one of them fails', () => {
      const { container } = renderManager([
        'https://example.test/gone.jpg',
        'https://example.test/ok.jpg',
      ]);

      fireEvent.error(container.querySelectorAll('img')[0]);

      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      expect(container.querySelectorAll('img')).toHaveLength(1);
      expect(screen.getByAltText('Product image 2')).toBeInTheDocument();
    });

    it('still lets the admin remove an image whose URL is broken', () => {
      const { container } = renderManager(['https://example.test/gone.jpg']);

      fireEvent.error(container.querySelector('img') as HTMLImageElement);
      fireEvent.click(screen.getByRole('button', { name: /remove image/i }));

      expect(onImagesChange).toHaveBeenCalledWith([]);
    });
  });
});
