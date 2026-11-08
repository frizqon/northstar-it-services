import { describe, it, expect } from 'vitest';
import { DEFAULT_CONTENT } from '../../src/content/default';
import { validateSiteContent, MAX_SERVICES, MAX_CONTENT_BYTES } from '../../src/content/validate';

function cloneContent() {
  return structuredClone(DEFAULT_CONTENT);
}

describe('Site content validation', () => {
  it('should accept the default content', () => {
    expect(validateSiteContent(cloneContent())).toBe(true);
  });

  it('should reject a non-object payload', () => {
    expect(validateSiteContent(null)).toBe(false);
    expect(validateSiteContent([])).toBe(false);
    expect(validateSiteContent('content')).toBe(false);
  });

  it('should reject an unsafe project image URL', () => {
    const content = cloneContent();
    content.projects[0].imageUrl = 'javascript:alert(1)';
    expect(validateSiteContent(content)).toBe(false);
  });

  it('should allow an empty or relative project image URL', () => {
    const empty = cloneContent();
    empty.projects[0].imageUrl = '';
    expect(validateSiteContent(empty)).toBe(true);

    const relative = cloneContent();
    relative.projects[0].imageUrl = '/uploads/photo.jpg';
    expect(validateSiteContent(relative)).toBe(true);
  });

  it('should reject too many services', () => {
    const content = cloneContent();
    content.services = Array.from({ length: MAX_SERVICES + 1 }, () => ({
      number: '01',
      tag: 'TAG',
      title: 'Service',
      description: 'Description'
    }));
    expect(validateSiteContent(content)).toBe(false);
  });

  it('should reject an oversized field', () => {
    const content = cloneContent();
    content.brand = 'A'.repeat(101);
    expect(validateSiteContent(content)).toBe(false);
  });

  it('should reject a payload above the serialized size cap', () => {
    const content = cloneContent() as ReturnType<typeof cloneContent> & { extra?: string };
    content.extra = 'A'.repeat(MAX_CONTENT_BYTES);
    expect(validateSiteContent(content)).toBe(false);
  });
});
