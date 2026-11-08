import { Hono } from 'hono';
import type { WorkerEnv, MessageStatus } from '../types';
import { verifyAdmin } from '../middleware/auth';
import { isLocalDev, isSafeOrigin } from '../lib/security';
import { verifyTurnstile } from '../lib/turnstile';
import { contactRateLimiter } from '../middleware/rateLimit';
import { logError } from '../lib/log';
import {
  validateContactInput,
  saveContactMessage,
  getContactMessages,
  getContactMessageStats,
  updateContactMessageStatus,
  deleteContactMessage,
  DEFAULT_MESSAGE_PAGE_SIZE,
  MAX_MESSAGE_PAGE_SIZE
} from '../lib/db';

export const contactRouter = new Hono<WorkerEnv>();

function parseMessageId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Public endpoint to submit a contact inquiry.
 */
contactRouter.post('/contact', contactRateLimiter, async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const validation = validateContactInput(payload);
  if (!validation.valid || !validation.data) {
    return c.json({ error: validation.error || 'Invalid form input' }, 400);
  }

  if (c.env.TURNSTILE_SECRET_KEY) {
    const body = payload as Record<string, unknown>;
    const turnstileToken =
      typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : '';

    if (!turnstileToken) {
      return c.json({ error: 'Please complete the security challenge.' }, 400);
    }

    const verification = await verifyTurnstile(
      c.env.TURNSTILE_SECRET_KEY,
      turnstileToken,
      c.req.header('cf-connecting-ip')
    );

    if (!verification.success) {
      console.warn(
        JSON.stringify({
          event: 'turnstile_failed',
          requestId: c.get('requestId'),
          errors: verification.errors
        })
      );
      return c.json({ error: 'Security challenge failed. Please try again.' }, 400);
    }
  }

  const isLocal = isLocalDev(c);
  if (!c.env.DATABASE_URL && (!isLocal || c.env.DEV_AUTH_BYPASS !== 'true')) {
    return c.json({ error: 'Contact service is temporarily unavailable' }, 503);
  }

  try {
    const saved = await saveContactMessage(c.env, validation.data, isLocal);
    return c.json(
      {
        ok: true,
        message: 'Your inquiry has been received. Our team will contact you soon.',
        id: saved.id
      },
      201
    );
  } catch (error) {
    logError('contact_save_failed', error, { requestId: c.get('requestId') });
    return c.json({ error: 'Could not submit your message. Please try again later.' }, 500);
  }
});

/**
 * Admin endpoint: List messages and aggregate stats.
 */
contactRouter.get('/admin/messages', verifyAdmin, async (c) => {
  const isLocal = isLocalDev(c);
  if (!c.env.DATABASE_URL && (!isLocal || c.env.DEV_AUTH_BYPASS !== 'true')) {
    return c.json({ error: 'Database is not configured' }, 503);
  }

  const statusParam = c.req.query('status') as MessageStatus | 'all' | undefined;
  const validStatuses: (MessageStatus | 'all')[] = ['all', 'unread', 'read', 'replied'];
  const filterStatus = statusParam && validStatuses.includes(statusParam) ? statusParam : 'all';

  const requestedLimit = Number(c.req.query('limit') ?? DEFAULT_MESSAGE_PAGE_SIZE);
  const requestedOffset = Number(c.req.query('offset') ?? 0);
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_MESSAGE_PAGE_SIZE)
      : DEFAULT_MESSAGE_PAGE_SIZE;
  const offset = Number.isInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0;

  try {
    const [messages, stats] = await Promise.all([
      getContactMessages(c.env, isLocal, filterStatus, limit, offset),
      getContactMessageStats(c.env, isLocal)
    ]);

    const filteredTotal = filterStatus === 'all' ? stats.total : stats[filterStatus];

    return c.json({
      ok: true,
      messages,
      stats,
      pagination: {
        limit,
        offset,
        total: filteredTotal,
        hasMore: offset + messages.length < filteredTotal
      }
    });
  } catch (error) {
    logError('contact_messages_read_failed', error, { requestId: c.get('requestId') });
    return c.json({ error: 'Could not retrieve messages' }, 500);
  }
});

/**
 * Admin endpoint: Update message status (unread, read, replied) and reply notes.
 */
contactRouter.put('/admin/messages/:id', verifyAdmin, async (c) => {
  if (!isSafeOrigin(c)) {
    return c.json({ error: 'Cross-origin request rejected' }, 403);
  }

  const id = parseMessageId(c.req.param('id'));
  if (id === null) {
    return c.json({ error: 'Invalid message ID' }, 400);
  }

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  if (!payload || typeof payload !== 'object') {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const body = payload as { status?: string; replyNotes?: string | null };
  const validStatuses: MessageStatus[] = ['unread', 'read', 'replied'];

  if (!body.status || !validStatuses.includes(body.status as MessageStatus)) {
    return c.json({ error: 'Invalid status. Must be unread, read, or replied.' }, 400);
  }

  if (body.replyNotes !== undefined && body.replyNotes !== null) {
    if (typeof body.replyNotes !== 'string') {
      return c.json({ error: 'Reply notes must be a string' }, 400);
    }
    if (body.replyNotes.length > 2000) {
      return c.json({ error: 'Reply notes must not exceed 2000 characters' }, 400);
    }
  }

  const isLocal = isLocalDev(c);
  if (!c.env.DATABASE_URL && (!isLocal || c.env.DEV_AUTH_BYPASS !== 'true')) {
    return c.json({ error: 'Database is not configured' }, 503);
  }

  try {
    const updated = await updateContactMessageStatus(
      c.env,
      id,
      body.status as MessageStatus,
      body.replyNotes !== undefined ? body.replyNotes : null,
      isLocal
    );

    if (!updated) {
      return c.json({ error: 'Message not found' }, 404);
    }

    return c.json({ ok: true, message: updated });
  } catch (error) {
    logError('contact_message_update_failed', error, { requestId: c.get('requestId') });
    return c.json({ error: 'Could not update message' }, 500);
  }
});

/**
 * Admin endpoint: Delete message.
 */
contactRouter.delete('/admin/messages/:id', verifyAdmin, async (c) => {
  if (!isSafeOrigin(c)) {
    return c.json({ error: 'Cross-origin request rejected' }, 403);
  }

  const id = parseMessageId(c.req.param('id'));
  if (id === null) {
    return c.json({ error: 'Invalid message ID' }, 400);
  }

  const isLocal = isLocalDev(c);
  if (!c.env.DATABASE_URL && (!isLocal || c.env.DEV_AUTH_BYPASS !== 'true')) {
    return c.json({ error: 'Database is not configured' }, 503);
  }

  try {
    const deleted = await deleteContactMessage(c.env, id, isLocal);
    if (!deleted) {
      return c.json({ error: 'Message not found' }, 404);
    }
    return c.json({ ok: true });
  } catch (error) {
    logError('contact_message_delete_failed', error, { requestId: c.get('requestId') });
    return c.json({ error: 'Could not delete message' }, 500);
  }
});
