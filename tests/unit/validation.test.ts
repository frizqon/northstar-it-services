import { describe, it, expect } from 'vitest';
import { validateSiteContent, validateContactInput } from '../../src/worker/lib/db';
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

describe('Contact Validator: validateContactInput', () => {
  it('should validate a valid contact form submission', () => {
    const result = validateContactInput({
      name: 'Budi Santoso',
      email: 'budi@example.com',
      message: 'Need help with cloud transformation.'
    });

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({
      name: 'Budi Santoso',
      email: 'budi@example.com',
      message: 'Need help with cloud transformation.'
    });
  });

  it('should reject invalid or non-object payload', () => {
    expect(validateContactInput(null).valid).toBe(false);
    expect(validateContactInput('hello').valid).toBe(false);
  });

  it('should reject empty or too short name', () => {
    const res = validateContactInput({
      name: 'A',
      email: 'budi@example.com',
      message: 'Valid message content'
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Name must be at least 2 characters');
  });

  it('should reject overlong name (> 100 chars)', () => {
    const res = validateContactInput({
      name: 'A'.repeat(101),
      email: 'budi@example.com',
      message: 'Valid message content'
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Name must not exceed 100 characters');
  });

  it('should reject invalid email formats', () => {
    expect(
      validateContactInput({
        name: 'Budi',
        email: 'invalid-email',
        message: 'Valid message content'
      }).valid
    ).toBe(false);

    expect(
      validateContactInput({
        name: 'Budi',
        email: 'budi@com',
        message: 'Valid message content'
      }).valid
    ).toBe(false);
  });

  it('should reject short or empty messages (< 5 chars)', () => {
    const res = validateContactInput({
      name: 'Budi',
      email: 'budi@example.com',
      message: 'Hi'
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Message must be at least 5 characters');
  });

  it('should reject overlong messages (> 3000 chars)', () => {
    const res = validateContactInput({
      name: 'Budi',
      email: 'budi@example.com',
      message: 'A'.repeat(3001)
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Message must not exceed 3000 characters');
  });
});
