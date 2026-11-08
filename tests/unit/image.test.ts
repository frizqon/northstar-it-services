import { describe, expect, it } from 'vitest';
import { extensionForMime, fitWithin } from '../../src/utils/image';

describe('Image upload helpers', () => {
  it('should fit landscape images inside the maximum dimension', () => {
    expect(fitWithin(4000, 2000, 2000)).toEqual({ width: 2000, height: 1000 });
  });

  it('should fit portrait images inside the maximum dimension', () => {
    expect(fitWithin(2000, 4000, 2000)).toEqual({ width: 1000, height: 2000 });
  });

  it('should not upscale small images', () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });

  it('should handle invalid dimensions defensively', () => {
    expect(fitWithin(0, 100, 2000)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(100, 100, 0)).toEqual({ width: 0, height: 0 });
  });

  it('should map supported MIME types to canonical extensions', () => {
    expect(extensionForMime('image/jpeg')).toBe('.jpg');
    expect(extensionForMime('image/png')).toBe('.png');
    expect(extensionForMime('image/webp')).toBe('.webp');
    expect(extensionForMime('image/avif')).toBe('.avif');
    expect(extensionForMime('image/gif')).toBe('');
  });
});
