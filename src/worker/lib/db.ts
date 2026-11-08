import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { DEFAULT_CONTENT, type SiteContent } from '../../content/default';
import { validateSiteContent } from '../../content/validate';
import { isExpiredForRetention } from './retention';
import type {
  WorkerEnv,
  ContactMessage,
  ContactMessageInput,
  ContactMessageStats,
  MessageStatus
} from '../types';

export { validateSiteContent } from '../../content/validate';

export const DEFAULT_MESSAGE_PAGE_SIZE = 50;
export const MAX_MESSAGE_PAGE_SIZE = 100;

let inMemoryContent: SiteContent = structuredClone(DEFAULT_CONTENT);
let inMemoryContentUpdatedAt: string | null = null;
let inMemoryMessages: ContactMessage[] = [];
let nextMessageId = 1;

let cachedSql: NeonQueryFunction<false, false> | null = null;
let cachedSqlUrl: string | null = null;

/**
 * Reuses one Neon client per isolate. Creating a client per request adds
 * avoidable setup work and loses the driver's internal connection state.
 */
function getSql(databaseUrl: string): NeonQueryFunction<false, false> {
  if (!cachedSql || cachedSqlUrl !== databaseUrl) {
    cachedSql = neon(databaseUrl);
    cachedSqlUrl = databaseUrl;
  }
  return cachedSql;
}

export function resetInMemoryStore(): void {
  inMemoryContent = structuredClone(DEFAULT_CONTENT);
  inMemoryContentUpdatedAt = null;
  inMemoryMessages = [];
  nextMessageId = 1;
}

export function validateContactInput(data: unknown): {
  valid: boolean;
  error?: string;
  data?: ContactMessageInput;
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid input payload' };
  }

  const payload = data as Record<string, unknown>;
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';

  if (!name || name.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters long' };
  }
  if (name.length > 100) {
    return { valid: false, error: 'Name must not exceed 100 characters' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { valid: false, error: 'A valid email address is required' };
  }
  if (email.length > 150) {
    return { valid: false, error: 'Email must not exceed 150 characters' };
  }

  if (!message || message.length < 5) {
    return { valid: false, error: 'Message must be at least 5 characters long' };
  }
  if (message.length > 3000) {
    return { valid: false, error: 'Message must not exceed 3000 characters' };
  }

  return {
    valid: true,
    data: { name, email, message }
  };
}

export type SiteContentRecord = {
  content: SiteContent;
  updatedAt: string | null;
};

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function getSiteContent(
  env: WorkerEnv['Bindings'],
  isLocal: boolean
): Promise<SiteContentRecord> {
  if (!env.DATABASE_URL) {
    if (isLocal && env.DEV_AUTH_BYPASS === 'true') {
      return {
        content: inMemoryContent,
        updatedAt: inMemoryContentUpdatedAt
      };
    }
    throw new Error('DATABASE_URL is not configured');
  }

  const sql = getSql(env.DATABASE_URL);
  const rows = await sql`SELECT content, updated_at FROM public.site_content WHERE id = 1 LIMIT 1`;
  const row = rows[0] as { content?: unknown; updated_at?: unknown } | undefined;
  const rawContent = row?.content;

  let content: SiteContent = DEFAULT_CONTENT;
  if (rawContent !== undefined) {
    if (validateSiteContent(rawContent)) {
      content = rawContent;
    } else {
      console.warn(JSON.stringify({ event: 'site_content_invalid_row' }));
    }
  }

  return {
    content,
    updatedAt: toIsoString(row?.updated_at)
  };
}

export type SaveSiteContentResult =
  | { ok: true; updatedAt: string }
  | { ok: false; conflict: true };

export async function saveSiteContent(
  env: WorkerEnv['Bindings'],
  content: SiteContent,
  isLocal: boolean,
  expectedUpdatedAt?: string | null
): Promise<SaveSiteContentResult> {
  if (!env.DATABASE_URL) {
    if (isLocal && env.DEV_AUTH_BYPASS === 'true') {
      if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== inMemoryContentUpdatedAt) {
        return { ok: false, conflict: true };
      }
      inMemoryContent = structuredClone(content);
      inMemoryContentUpdatedAt = new Date().toISOString();
      return { ok: true, updatedAt: inMemoryContentUpdatedAt };
    }
    throw new Error('Database is not configured');
  }

  const sql = getSql(env.DATABASE_URL);

  if (expectedUpdatedAt === undefined) {
    // Legacy clients without a precondition keep last-write-wins behaviour.
    const rows = await sql`
      INSERT INTO public.site_content (id, content, updated_at)
      VALUES (1, ${JSON.stringify(content)}::jsonb, now())
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        updated_at = now()
      RETURNING updated_at
    `;
    return { ok: true, updatedAt: toIsoString(rows[0]?.updated_at) ?? new Date().toISOString() };
  }

  if (expectedUpdatedAt === null) {
    // First save: only insert when the singleton row does not exist yet.
    const rows = await sql`
      INSERT INTO public.site_content (id, content, updated_at)
      VALUES (1, ${JSON.stringify(content)}::jsonb, now())
      ON CONFLICT (id) DO NOTHING
      RETURNING updated_at
    `;
    if (rows.length === 0) return { ok: false, conflict: true };
    return { ok: true, updatedAt: toIsoString(rows[0]?.updated_at) ?? new Date().toISOString() };
  }

  const rows = await sql`
    UPDATE public.site_content
    SET content = ${JSON.stringify(content)}::jsonb,
        updated_at = now()
    WHERE id = 1
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', ${expectedUpdatedAt}::timestamptz)
    RETURNING updated_at
  `;

  if (rows.length === 0) return { ok: false, conflict: true };
  return { ok: true, updatedAt: toIsoString(rows[0]?.updated_at) ?? new Date().toISOString() };
}

export async function saveContactMessage(
  env: WorkerEnv['Bindings'],
  input: ContactMessageInput,
  isLocal: boolean
): Promise<ContactMessage> {
  if (!env.DATABASE_URL) {
    if (isLocal && env.DEV_AUTH_BYPASS === 'true') {
      const now = new Date().toISOString();
      const message: ContactMessage = {
        id: nextMessageId++,
        name: input.name,
        email: input.email,
        message: input.message,
        status: 'unread',
        read_at: null,
        reply_notes: null,
        replied_at: null,
        created_at: now,
        updated_at: now
      };
      inMemoryMessages.unshift(message);
      return message;
    }
    throw new Error('Database is not configured');
  }

  const sql = getSql(env.DATABASE_URL);
  const rows = await sql`
    INSERT INTO public.contact_messages (name, email, message, status, created_at, updated_at)
    VALUES (${input.name}, ${input.email}, ${input.message}, 'unread', now(), now())
    RETURNING id, name, email, message, status, read_at, reply_notes, replied_at, created_at, updated_at
  `;

  return rows[0] as unknown as ContactMessage;
}

export async function getContactMessages(
  env: WorkerEnv['Bindings'],
  isLocal: boolean,
  statusFilter?: MessageStatus | 'all',
  limit: number = DEFAULT_MESSAGE_PAGE_SIZE,
  offset: number = 0
): Promise<ContactMessage[]> {
  if (!env.DATABASE_URL) {
    if (isLocal && env.DEV_AUTH_BYPASS === 'true') {
      const filtered =
        !statusFilter || statusFilter === 'all'
          ? [...inMemoryMessages]
          : inMemoryMessages.filter((m) => m.status === statusFilter);
      return filtered.slice(offset, offset + limit);
    }
    throw new Error('Database is not configured');
  }

  const sql = getSql(env.DATABASE_URL);
  if (statusFilter && statusFilter !== 'all') {
    const rows = await sql`
      SELECT id, name, email, message, status, read_at, reply_notes, replied_at, created_at, updated_at
      FROM public.contact_messages
      WHERE status = ${statusFilter}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return rows as unknown as ContactMessage[];
  }

  const rows = await sql`
    SELECT id, name, email, message, status, read_at, reply_notes, replied_at, created_at, updated_at
    FROM public.contact_messages
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows as unknown as ContactMessage[];
}

export async function getContactMessageStats(
  env: WorkerEnv['Bindings'],
  isLocal: boolean
): Promise<ContactMessageStats> {
  if (!env.DATABASE_URL) {
    if (isLocal && env.DEV_AUTH_BYPASS === 'true') {
      let unread = 0;
      let read = 0;
      let replied = 0;
      for (const m of inMemoryMessages) {
        if (m.status === 'unread') unread++;
        else if (m.status === 'read') read++;
        else if (m.status === 'replied') replied++;
      }
      return {
        total: inMemoryMessages.length,
        unread,
        read,
        replied
      };
    }
    throw new Error('Database is not configured');
  }

  const sql = getSql(env.DATABASE_URL);
  const rows = await sql`
    SELECT status, count(*)::int as count
    FROM public.contact_messages
    GROUP BY status
  `;

  const counts: Record<string, number> = {
    unread: 0,
    read: 0,
    replied: 0
  };

  let total = 0;
  for (const row of rows as unknown as { status: string; count: number }[]) {
    counts[row.status] = (counts[row.status] || 0) + Number(row.count);
    total += Number(row.count);
  }

  return {
    total,
    unread: counts.unread || 0,
    read: counts.read || 0,
    replied: counts.replied || 0
  };
}

export async function updateContactMessageStatus(
  env: WorkerEnv['Bindings'],
  id: number,
  status: MessageStatus,
  replyNotes: string | null = null,
  isLocal: boolean = false
): Promise<ContactMessage | null> {
  if (!env.DATABASE_URL) {
    if (isLocal && env.DEV_AUTH_BYPASS === 'true') {
      const idx = inMemoryMessages.findIndex((m) => m.id === id);
      if (idx === -1) return null;
      const now = new Date().toISOString();
      const updated: ContactMessage = {
        ...inMemoryMessages[idx],
        status,
        read_at:
          status === 'read'
            ? inMemoryMessages[idx].read_at || now
            : status === 'unread'
            ? null
            : inMemoryMessages[idx].read_at,
        reply_notes: replyNotes !== null ? replyNotes : inMemoryMessages[idx].reply_notes,
        replied_at:
          status === 'replied'
            ? inMemoryMessages[idx].replied_at || now
            : inMemoryMessages[idx].replied_at,
        updated_at: now
      };
      inMemoryMessages[idx] = updated;
      return updated;
    }
    throw new Error('Database is not configured');
  }

  const sql = getSql(env.DATABASE_URL);
  const rows = await sql`
    UPDATE public.contact_messages
    SET status = ${status},
        read_at = CASE
          WHEN ${status} = 'read' THEN COALESCE(read_at, now())
          WHEN ${status} = 'unread' THEN NULL
          ELSE read_at
        END,
        reply_notes = COALESCE(${replyNotes}, reply_notes),
        replied_at = CASE WHEN ${status} = 'replied' THEN COALESCE(replied_at, now()) ELSE replied_at END,
        updated_at = now()
    WHERE id = ${id}
    RETURNING id, name, email, message, status, read_at, reply_notes, replied_at, created_at, updated_at
  `;

  if (!rows || rows.length === 0) return null;
  return rows[0] as unknown as ContactMessage;
}

export async function deleteContactMessage(
  env: WorkerEnv['Bindings'],
  id: number,
  isLocal: boolean
): Promise<boolean> {
  if (!env.DATABASE_URL) {
    if (isLocal && env.DEV_AUTH_BYPASS === 'true') {
      const initialLen = inMemoryMessages.length;
      inMemoryMessages = inMemoryMessages.filter((m) => m.id !== id);
      return inMemoryMessages.length < initialLen;
    }
    throw new Error('Database is not configured');
  }

  const sql = getSql(env.DATABASE_URL);
  const rows = await sql`
    DELETE FROM public.contact_messages WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}

const RETENTION_BATCH_SIZE = 1000;
const RETENTION_MAX_BATCHES = 10;

/**
 * Deletes messages outside the documented retention window in bounded batches.
 * Replied messages expire six months after `replied_at`; unresolved messages
 * expire twelve months after `created_at`.
 */
export async function purgeExpiredContactMessages(
  env: WorkerEnv['Bindings'],
  isLocal: boolean
): Promise<number> {
  if (!env.DATABASE_URL) {
    if (isLocal && env.DEV_AUTH_BYPASS === 'true') {
      const before = inMemoryMessages.length;
      inMemoryMessages = inMemoryMessages.filter((message) => !isExpiredForRetention(message));
      return before - inMemoryMessages.length;
    }
    throw new Error('Database is not configured');
  }

  const sql = getSql(env.DATABASE_URL);
  let deleted = 0;

  for (let batch = 0; batch < RETENTION_MAX_BATCHES; batch++) {
    const rows = await sql`
      WITH expired AS (
        SELECT id
        FROM public.contact_messages
        WHERE (status = 'replied' AND replied_at < now() - interval '6 months')
           OR (status <> 'replied' AND created_at < now() - interval '12 months')
        ORDER BY created_at
        LIMIT ${RETENTION_BATCH_SIZE}
      )
      DELETE FROM public.contact_messages
      WHERE id IN (SELECT id FROM expired)
      RETURNING id
    `;

    deleted += rows.length;
    if (rows.length < RETENTION_BATCH_SIZE) break;
  }

  return deleted;
}
