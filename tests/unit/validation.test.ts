import { describe, it, expect } from 'vitest';
import { validateSiteContent } from '../../src/worker/lib/db';
import { DEFAULT_CONTENT } from '../../src/content/default';

describe('Database Utility: validateSiteContent', () => {
  it('should validate complete DEFAULT_CONTENT structure as true', () => {
    expect(validateSiteContent(DEFAULT_CONTENT)).toBe(true);
  });

  it('should return false for null, undefined, or primitive types', () => {
    expect(validateSiteContent(null)).toBe(false);
    expect(validateSiteContent(undefined)).toBe(false);
    expect(validateSiteContent('not-an-object')).toBe(false);
    expect(validateSiteContent(42)).toBe(false);
  });

  it('should return false if brand is missing or empty', () => {
    const invalid = structuredClone(DEFAULT_CONTENT);
    invalid.brand = '';
    expect(validateSiteContent(invalid)).toBe(false);
  });

  it('should return false if hero structure is invalid', () => {
    const invalid = structuredClone(DEFAULT_CONTENT);
    // @ts-expect-error testing invalid payload
    delete invalid.hero.title;
    expect(validateSiteContent(invalid)).toBe(false);
  });

  it('should return false if services array has corrupted items', () => {
    const invalid = structuredClone(DEFAULT_CONTENT);
    // @ts-expect-error testing corrupted item
    invalid.services = [{ title: 'Partial Service' }];
    expect(validateSiteContent(invalid)).toBe(false);
  });

  it('should return false if projects array is missing', () => {
    const invalid = structuredClone(DEFAULT_CONTENT);
    // @ts-expect-error testing missing array
    delete invalid.projects;
    expect(validateSiteContent(invalid)).toBe(false);
  });
});
