import { Hono } from 'hono';
import type { WorkerEnv, PresignInput, ConfirmMediaInput } from '../types';
import { verifyAdmin } from '../middleware/auth';
import { isSafeOrigin } from '../lib/security';
import { createPresignedUpload, confirmUploadedMedia } from '../lib/s3';
import { logError } from '../lib/log';

export const mediaRouter = new Hono<WorkerEnv>();

mediaRouter.post('/admin/media/presign', verifyAdmin, async (c) => {
  if (!isSafeOrigin(c)) {
    return c.json({ error: 'Cross-origin request rejected' }, 403);
  }

  let input: PresignInput;
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  try {
    const result = await createPresignedUpload(c.env, input);
    return c.json(result);
  } catch (error) {
    if (error instanceof TypeError) {
      return c.json({ error: error.message }, 400);
    }
    if (error instanceof RangeError) {
      const status = error.message.includes('smaller') ? 413 : 415;
      return c.json({ error: error.message }, status);
    }
    if (error instanceof Error && error.message.includes('not configured')) {
      return c.json({ error: error.message }, 503);
    }

    logError('media_presign_failed', error, { requestId: c.get('requestId') });
    return c.json({ error: 'Could not prepare image upload' }, 502);
  }
});

mediaRouter.post('/admin/media/confirm', verifyAdmin, async (c) => {
  if (!isSafeOrigin(c)) {
    return c.json({ error: 'Cross-origin request rejected' }, 403);
  }

  let input: ConfirmMediaInput;
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  try {
    const result = await confirmUploadedMedia(c.env, input);
    return c.json(result);
  } catch (error) {
    if (error instanceof TypeError) {
      return c.json({ error: error.message }, 400);
    }
    if (error instanceof RangeError) {
      return c.json({ error: error.message }, 415);
    }
    if (error instanceof Error && error.message.includes('not configured')) {
      return c.json({ error: error.message }, 503);
    }
    if (error instanceof Error && (error.name === 'NoSuchKey' || error.name === 'NotFound')) {
      return c.json({ error: 'Uploaded file not found' }, 404);
    }

    logError('media_confirm_failed', error, { requestId: c.get('requestId') });
    return c.json({ error: 'Could not verify image upload' }, 502);
  }
});
