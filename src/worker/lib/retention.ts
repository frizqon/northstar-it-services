import type { ContactMessage } from '../types';

export const RETENTION_REPLIED_MONTHS = 6;
export const RETENTION_UNRESOLVED_MONTHS = 12;

type RetentionCandidate = Pick<ContactMessage, 'status' | 'replied_at' | 'created_at'>;

function monthsBefore(date: Date, months: number): Date {
  const cutoff = new Date(date);
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

/**
 * Returns true when a message is past its retention window.
 * Replied messages expire six months after `replied_at`; unresolved messages
 * expire twelve months after `created_at`.
 */
export function isExpiredForRetention(
  message: RetentionCandidate,
  now: Date = new Date()
): boolean {
  const reference =
    message.status === 'replied' ? message.replied_at : message.created_at;
  if (!reference) return false;

  const referenceDate = new Date(reference);
  if (Number.isNaN(referenceDate.getTime())) return false;

  const months =
    message.status === 'replied' ? RETENTION_REPLIED_MONTHS : RETENTION_UNRESOLVED_MONTHS;

  return referenceDate < monthsBefore(now, months);
}
