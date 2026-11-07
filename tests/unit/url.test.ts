import { describe, it, expect } from 'vitest';
import { isSafeImageUrl } from '../../src/utils/url';

describe('URL Utility: isSafeImageUrl', () => {
  it('should accept valid HTTPS and HTTP URLs', () => {
    expect(isSafeImageUrl('https://images.unsplash.com/photo-123')).toBe(true);
    expect(isSafeImageUrl('http://assets.northstar.example/projects/demo.webp')).toBe(true);
  });

  it('should accept valid relative paths', () => {
    expect(isSafeImageUrl('/images/hero.png')).toBe(true);
    expect(isSafeImageUrl('/_assets/client.js')).toBe(true);
  });

  it('should reject protocol-relative URLs (open redirect / bypass vector)', () => {
    expect(isSafeImageUrl('//malicious-domain.com/evil.png')).toBe(false);
  });

  it('should reject dangerous URI schemes like javascript: and data:', () => {
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeImageUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeImageUrl('vbscript:msgbox(1)')).toBe(false);
  });

  it('should reject non-string or empty inputs', () => {
    expect(isSafeImageUrl('')).toBe(false);
    expect(isSafeImageUrl('   ')).toBe(false);
    expect(isSafeImageUrl(null)).toBe(false);
    expect(isSafeImageUrl(undefined)).toBe(false);
    expect(isSafeImageUrl(12345)).toBe(false);
  });
});
