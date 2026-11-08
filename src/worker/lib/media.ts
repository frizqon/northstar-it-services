const EXTENSION_TO_IMAGE_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif'
};

const MEDIA_KEY_PATTERN =
  /^projects\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[a-z0-9_-]{1,50}\.(?:jpg|png|webp|avif)$/i;

function readAscii(bytes: Uint8Array, start: number, end: number): string {
  let value = '';
  const limit = Math.min(end, bytes.length);
  for (let index = start; index < limit; index++) {
    value += String.fromCharCode(bytes[index]);
  }
  return value;
}

/**
 * Detects the image type from the first bytes of an uploaded file.
 * The presigned upload only validates the declared MIME type, so this
 * second check prevents a renamed non-image file from being published.
 */
export function detectImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (bytes.length >= 12 && readAscii(bytes, 0, 4) === 'RIFF' && readAscii(bytes, 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  if (bytes.length >= 12 && readAscii(bytes, 4, 8) === 'ftyp') {
    const brands = readAscii(bytes, 8, 32);
    if (brands.includes('avif') || brands.includes('avis')) {
      return 'image/avif';
    }
  }

  return null;
}

export function expectedImageTypeForKey(key: string): string | null {
  const match = key.match(/\.([a-z0-9]+)$/i);
  if (!match) {
    return null;
  }

  return EXTENSION_TO_IMAGE_TYPE[match[1].toLowerCase()] ?? null;
}

export function isMediaKey(key: string): boolean {
  return MEDIA_KEY_PATTERN.test(key);
}
