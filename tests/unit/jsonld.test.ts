import { describe, it, expect } from 'vitest';
import { serializeJsonLd } from '../../src/utils/jsonld';

describe('JSON-LD serializer', () => {
  it('should keep a normal payload valid JSON', () => {
    const payload = { '@type': 'WebSite', name: 'Northstar', url: 'https://example.com' };
    expect(JSON.parse(serializeJsonLd(payload))).toEqual(payload);
  });

  it('should neutralize a closing script tag', () => {
    const output = serializeJsonLd({ description: '</script><script>alert(1)</script>' });
    expect(output).not.toContain('</script>');
    expect(output).toContain('\\u003c/script\\u003e');
  });

  it('should neutralize an HTML comment opener', () => {
    const output = serializeJsonLd({ description: '<!--<script>' });
    expect(output).not.toContain('<!--');
    expect(output).not.toContain('<script>');
  });

  it('should escape JavaScript line separators', () => {
    const output = serializeJsonLd({ description: 'a\u2028b\u2029c' });
    expect(output).toContain('\\u2028');
    expect(output).toContain('\\u2029');
  });
});
