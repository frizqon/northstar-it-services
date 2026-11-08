export const MAX_UPLOAD_DIMENSION = 2000;
export const IMAGE_RESIZE_THRESHOLD_BYTES = 1.5 * 1024 * 1024;
export const IMAGE_OUTPUT_QUALITY = 0.85;

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif'
};

export function fitWithin(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0 || maxDimension <= 0) {
    return { width: 0, height: 0 };
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

export function extensionForMime(type: string): string {
  return MIME_EXTENSIONS[type] ?? '';
}

/**
 * Downscales large images in the browser before requesting an upload ticket.
 * The server still enforces the 8 MB limit and canonical MIME extensions; this
 * only reduces bandwidth and keeps the published assets reasonably sized.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file;

  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file);
    const target = fitWithin(bitmap.width, bitmap.height, MAX_UPLOAD_DIMENSION);

    if (
      target.width === bitmap.width &&
      target.height === bitmap.height &&
      file.size <= IMAGE_RESIZE_THRESHOLD_BYTES
    ) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, target.width, target.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', IMAGE_OUTPUT_QUALITY);
    });

    if (!blob || blob.size >= file.size) return file;

    const extension = extensionForMime(blob.type) || '.webp';
    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image';

    return new File([blob], `${baseName}${extension}`, {
      type: blob.type || 'image/webp',
      lastModified: Date.now()
    });
  } catch {
    // Decoding or encoding failed (for example, an unsupported format).
    // Fall back to the original file and let the server validate it.
    return file;
  } finally {
    bitmap?.close();
  }
}
