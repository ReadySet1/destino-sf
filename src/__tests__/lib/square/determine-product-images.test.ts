/**
 * Tests for determineProductImages — the image-decision helper used during Square sync.
 *
 * Regression coverage for the S3-URL heuristic bug where existing products
 * stopped receiving Square image updates once their images had been stored
 * in Square's production S3 bucket.
 */

import { describe, it, expect } from '@jest/globals';
import { determineProductImages } from '@/lib/square/sync';

type SquareItem = Parameters<typeof determineProductImages>[0];
type RelatedObject = Parameters<typeof determineProductImages>[1][number];

// URL shape that processImageUrl passes through unchanged
// (no `/files/{id}/{name}` segment, so no S3 HEAD probing).
const NEW_SQUARE_URL = 'https://square-cdn.example.com/new-image.jpg';
const OTHER_SQUARE_URL = 'https://square-cdn.example.com/other-image.jpg';
const EXISTING_S3_URL =
  'https://items-images-production.s3.us-west-2.amazonaws.com/cached/old.jpg';
const LOCAL_ASSET = '/images/empanadas/beef.jpg';

function makeItem(name: string, imageIds: string[] = []): SquareItem {
  return {
    type: 'ITEM',
    id: `item-${name}`,
    item_data: { name, image_ids: imageIds },
  } as SquareItem;
}

function makeImageObjects(pairs: Array<{ id: string; url: string }>): RelatedObject[] {
  return pairs.map(({ id, url }) => ({
    type: 'IMAGE',
    id,
    image_data: { url },
  })) as RelatedObject[];
}

describe('determineProductImages', () => {
  it('returns Square images for a new product', async () => {
    const result = await determineProductImages(
      makeItem('Beef Empanada', ['img1']),
      makeImageObjects([{ id: 'img1', url: NEW_SQUARE_URL }]),
      undefined
    );

    expect(result).toEqual([NEW_SQUARE_URL]);
  });

  it('overwrites existing images with Square images by default (regression)', async () => {
    const result = await determineProductImages(
      makeItem('Beef Empanada', ['img1']),
      makeImageObjects([{ id: 'img1', url: NEW_SQUARE_URL }]),
      {
        id: 'db-1',
        name: 'Beef Empanada',
        images: [EXISTING_S3_URL],
        syncLocked: false,
      }
    );

    expect(result).toEqual([NEW_SQUARE_URL]);
  });

  it('preserves existing images when syncLocked=true and force is off', async () => {
    const result = await determineProductImages(
      makeItem('Beef Empanada', ['img1']),
      makeImageObjects([{ id: 'img1', url: NEW_SQUARE_URL }]),
      {
        id: 'db-1',
        name: 'Beef Empanada',
        images: [EXISTING_S3_URL],
        syncLocked: true,
      }
    );

    expect(result).toEqual([EXISTING_S3_URL]);
  });

  it('overwrites syncLocked=true images when forceImageUpdate is true', async () => {
    const result = await determineProductImages(
      makeItem('Beef Empanada', ['img1']),
      makeImageObjects([{ id: 'img1', url: NEW_SQUARE_URL }]),
      {
        id: 'db-1',
        name: 'Beef Empanada',
        images: [EXISTING_S3_URL],
        syncLocked: true,
      },
      { forceImageUpdate: true }
    );

    expect(result).toEqual([NEW_SQUARE_URL]);
  });

  it('always preserves catering-category images, even with forceImageUpdate', async () => {
    const result = await determineProductImages(
      makeItem('Catering Platter', ['img1']),
      makeImageObjects([{ id: 'img1', url: NEW_SQUARE_URL }]),
      {
        id: 'db-2',
        name: 'Catering Platter',
        images: [EXISTING_S3_URL],
        syncLocked: false,
      },
      { categoryName: 'CATERING- APPETIZERS', forceImageUpdate: true }
    );

    expect(result).toEqual([EXISTING_S3_URL]);
  });

  it('preserves existing when Square has 0 images and existing includes a local asset', async () => {
    const result = await determineProductImages(
      makeItem('Artisan Alfajor', []),
      [],
      {
        id: 'db-3',
        name: 'Artisan Alfajor',
        images: [LOCAL_ASSET, EXISTING_S3_URL],
        syncLocked: false,
      }
    );

    expect(result).toEqual([LOCAL_ASSET, EXISTING_S3_URL]);
  });

  it('clears images when Square has 0 images and existing has only Square URLs', async () => {
    const result = await determineProductImages(
      makeItem('Plain Empanada', []),
      [],
      {
        id: 'db-4',
        name: 'Plain Empanada',
        images: [EXISTING_S3_URL],
        syncLocked: false,
      }
    );

    expect(result).toEqual([]);
  });

  it('returns the full Square image set when multiple are provided', async () => {
    const result = await determineProductImages(
      makeItem('Beef Empanada', ['img1', 'img2']),
      makeImageObjects([
        { id: 'img1', url: NEW_SQUARE_URL },
        { id: 'img2', url: OTHER_SQUARE_URL },
      ]),
      {
        id: 'db-5',
        name: 'Beef Empanada',
        images: [EXISTING_S3_URL],
        syncLocked: false,
      }
    );

    expect(result).toEqual([NEW_SQUARE_URL, OTHER_SQUARE_URL]);
  });
});
