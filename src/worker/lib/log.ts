/**
 * Emits a structured, secret-free error log entry.
 * Never logs raw error objects: provider errors can include connection details,
 * query fragments, or other sensitive context.
 */
export function logError(
  event: string,
  error: unknown,
  context: Record<string, unknown> = {}
): void {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const safeMessage = normalized.message
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted-database-url]')
    .replace(/password=[^\s&]+/gi, 'password=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
    .slice(0, 500);

  console.error(
    JSON.stringify({
      event,
      ...context,
      errorName: normalized.name,
      errorMessage: safeMessage
    })
  );
}
