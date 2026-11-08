/**
 * Serializes a value for safe embedding inside a <script> element.
 * JSON.stringify does not escape `</script>`, so raw CMS text could break out
 * of the tag and inject markup. Escaping `<`, `>`, `&`, and the JavaScript line
 * separators keeps the payload inert while remaining valid JSON.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
