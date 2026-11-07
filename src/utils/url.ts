/**
 * Validates whether a URL is safe to render in <img src="..." />
 * Only allows http:, https:, or relative / paths. Blocks javascript:, data:, etc.
 */
export function isSafeImageUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url.trim()) {
    return false;
  }

  const trimmed = url.trim();

  // Allow relative paths starting with /
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
