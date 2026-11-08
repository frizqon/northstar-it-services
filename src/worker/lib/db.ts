import { neon } from '@neondatabase/serverless';
import { DEFAULT_CONTENT, type SiteContent } from '../../content/default';
import type {
  WorkerEnv,
  ContactMessage,
  ContactMessageInput,
  ContactMessageStats,
  MessageStatus
} from '../types';

let inMemoryContent: SiteContent = structuredClone(DEFAULT_CONTENT);
let inMemoryContentUpdatedAt: string | null = null;
let inMemoryMessages: ContactMessage[] = [];
let nextMessageId = 1;

export function resetInMemoryStore(): void {
  inMemoryContent = structuredClone(DEFAULT_CONTENT);
  inMemoryContentUpdatedAt = null;
  inMemoryMessages = [];
  nextMessageId = 1;
}

export function validateSiteContent(data: unknown): data is SiteContent {
  if (!data || typeof data !== 'object') return false;
  const c = data as Record<string, unknown>;

  if (typeof c.brand !== 'string' || !c.brand.trim()) return false;

  // Hero validation
  if (!c.hero || typeof c.hero !== 'object') return false;
  const hero = c.hero as Record<string, unknown>;
  if (
    typeof hero.eyebrow !== 'string' ||
    typeof hero.title !== 'string' ||
    typeof hero.highlight !== 'string' ||
    typeof hero.description !== 'string' ||
    typeof hero.primaryCta !== 'string' ||
    typeof hero.secondaryCta !== 'string'
  ) {
    return false;
  }

  // Services validation
  if (!Array.isArray(c.services)) return false;
  for (const s of c.services) {
    if (!s || typeof s !== 'object') return false;
    if (
      typeof s.title !== 'string' ||
      typeof s.description !== 'string' ||
      typeof s.number !== 'string' ||
      typeof s.tag !== 'string'
    ) {
      return false;
    }
  }

  // Projects validation
  if (!Array.isArray(c.projects)) return false;
  for (const p of c.projects) {
    if (!p || typeof p !== 'object') return false;
    if (
      typeof p.name !== 'string' ||
      typeof p.category !== 'string' ||
      typeof p.description !== 'string' ||
      typeof p.result !== 'string' ||
      typeof p.tone !== 'string'
    ) {
      return false;
    }
  }

  // About validation
  if (!c.about || typeof c.about !== 'object') return false;
  const about = c.about as Record<string, unknown>;
  if (
    typeof about.title !== 'string' ||
    typeof about.description !== 'string' ||
    typeof about.stat !== 'string' ||
    typeof about.statLabel !== 'string'
  ) {
    return false;
  }

  // Contact validation
  if (!c.contact || typeof c.contact !== 'object') return false;
  const contact = c.contact as Record<string, unknown>;
  if (
    typeof contact.email !== 'string' ||
    typeof contact.location !== 'string' ||
    typeof contact.availability !== 'string'
  ) {
    return false;
  }

  // SEO validation
  if (!c.seo || typeof c.seo !== 'object') return false;
  const seo = c.seo as Record<string, unknown>;
  if (
    typeof seo.title !== 'string' ||
    typeof seo.description !== 'string'
  ) {
    return false;
  }

  return true;
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

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`SELECT content, updated_at FROM public.site_content WHERE id = 1 LIMIT 1`;
  const row = rows[0] as { content?: SiteContent; updated_at?: unknown } | undefined;
  return {
    content: row?.content ?? DEFAULT_CONTENT,
    updatedAt: toIsoString(row?.updated_at)
  };
}

export async function saveSiteContent(
  env: WorkerEnv['Bindings'],
  content: SiteContent,
  isLocal: boolean
): Promise<void> {
  if (!env.DATABASE_URL) {
    if (isLocal && env.DEV_AUTH_BYPASS === 'true') {
      inMemoryContent = structuredClone(content);
      inMemoryContentUpdatedAt = new Date().toISOString();
      return;
    }
    throw new Error('Database is not configured');
  }

  const sql = neon(env.DATABASE_URL);
  await sql`
    INSERT INTO public.site_content (id, content, updated_at)
    VALUES (1, ${JSON.stringify(content)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET
      content = EXCLUDED.content,
      updated_at = now()
  `;
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

  const sql = neon(env.DATABASE_URL);
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
  statusFilter?: MessageStatus | 'all'
): Promise<ContactMessage[]> {
  if (!env.DATABASE_URL) {
    if (isLocal && env.DEV_AUTH_BYPASS === 'true') {
      if (!statusFilter || statusFilter === 'all') {
        return [...inMemoryMessages];
      }
      return inMemoryMessages.filter((m) => m.status === statusFilter);
    }
    throw new Error('Database is not configured');
  }

  const sql = neon(env.DATABASE_URL);
  if (statusFilter && statusFilter !== 'all') {
    const rows = await sql`
      SELECT id, name, email, message, status, read_at, reply_notes, replied_at, created_at, updated_at
      FROM public.contact_messages
      WHERE status = ${statusFilter}
      ORDER BY created_at DESC
    `;
    return rows as unknown as ContactMessage[];
  }

  const rows = await sql`
    SELECT id, name, email, message, status, read_at, reply_notes, replied_at, created_at, updated_at
    FROM public.contact_messages
    ORDER BY created_at DESC
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

  const sql = neon(env.DATABASE_URL);
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

  const sql = neon(env.DATABASE_URL);
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

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    DELETE FROM public.contact_messages WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}
