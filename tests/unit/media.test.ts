import { describe, it, expect } from 'vitest';
import {
  detectImageType,
  expectedImageTypeForKey,
  isMediaKey
} from '../../src/worker/lib/media';

describe('Media magic-byte detection', () => {
  it('detects JPEG', () => {
    expect(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
  });

  it('detects PNG', () => {
    expect(
      detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ).toBe('image/png');
  });

  it('detects WebP', () => {
    const header = new TextEncoder().encode('RIFF0000WEBP');
    expect(detectImageType(header)).toBe('image/webp');
  });

  it('detects AVIF', () => {
    const header = new TextEncoder().encode('0000ftypavif');
    expect(detectImageType(header)).toBe('image/avif');
  });

  it('rejects non-image content', () => {
    expect(detectImageType(new TextEncoder().encode('<html>not an image'))).toBeNull();
  });

  it('rejects truncated signatures', () => {
    expect(detectImageType(Uint8Array.from([0xff, 0xd8]))).toBeNull();
    expect(detectImageType(Uint8Array.from([0x89, 0x50]))).toBeNull();
  });
});

describe('Media key validation', () => {
  const validKey = 'projects/123e4567-e89b-42d3-a456-426614174000-photo.jpg';

  it('accepts canonical media keys', () => {
    expect(isMediaKey(validKey)).toBe(true);
    expect(expectedImageTypeForKey(validKey)).toBe('image/jpeg');
  });

  it('rejects traversal and arbitrary keys', () => {
    expect(isMediaKey('../photo.jpg')).toBe(false);
    expect(isMediaKey('projects/photo.jpg')).toBe(false);
    expect(isMediaKey('projects/123e4567-e89b-42d3-a456-426614174000-photo.exe')).toBe(false);
  });

  it('maps canonical extensions to content types', () => {
    expect(expectedImageTypeForKey('a.png')).toBe('image/png');
    expect(expectedImageTypeForKey('a.webp')).toBe('image/webp');
    expect(expectedImageTypeForKey('a.avif')).toBe('image/avif');
    expect(expectedImageTypeForKey('a.gif')).toBeNull();
  });
});
