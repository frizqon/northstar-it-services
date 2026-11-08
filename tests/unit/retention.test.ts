import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isExpiredForRetention,
  RETENTION_REPLIED_MONTHS,
  RETENTION_UNRESOLVED_MONTHS
} from '../../src/worker/lib/retention';
import {
  purgeExpiredContactMessages,
  resetInMemoryStore,
  saveContactMessage
} from '../../src/worker/lib/db';
import type { WorkerEnv } from '../../src/worker/types';

const NOW = new Date('2026-11-08T12:00:00.000Z');

function monthsAgo(months: number, extraDays = 0): string {
  const date = new Date(NOW);
  date.setMonth(date.getMonth() - months);
  date.setDate(date.getDate() - extraDays);
  return date.toISOString();
}

describe('Contact message retention', () => {
  it('should expire replied messages after six months', () => {
    const expired = isExpiredForRetention(
      {
        status: 'replied',
        replied_at: monthsAgo(RETENTION_REPLIED_MONTHS, 1),
        created_at: monthsAgo(24)
      },
      NOW
    );
    expect(expired).toBe(true);

    const fresh = isExpiredForRetention(
      {
        status: 'replied',
        replied_at: monthsAgo(RETENTION_REPLIED_MONTHS - 1),
        created_at: monthsAgo(24)
      },
      NOW
    );
    expect(fresh).toBe(false);
  });

  it('should expire unresolved messages after twelve months', () => {
    const expired = isExpiredForRetention(
      {
        status: 'unread',
        replied_at: null,
        created_at: monthsAgo(RETENTION_UNRESOLVED_MONTHS, 1)
      },
      NOW
    );
    expect(expired).toBe(true);

    const fresh = isExpiredForRetention(
      {
        status: 'read',
        replied_at: null,
        created_at: monthsAgo(RETENTION_UNRESOLVED_MONTHS - 1)
      },
      NOW
    );
    expect(fresh).toBe(false);
  });

  it('should not expire a replied message without replied_at', () => {
    expect(
      isExpiredForRetention(
        {
          status: 'replied',
          replied_at: null,
          created_at: monthsAgo(24)
        },
        NOW
      )
    ).toBe(false);
  });

  it('should ignore invalid dates', () => {
    expect(
      isExpiredForRetention(
        {
          status: 'unread',
          replied_at: null,
          created_at: 'not-a-date'
        },
        NOW
      )
    ).toBe(false);
  });
});

describe('Retention purge', () => {
  afterEach(() => {
    vi.useRealTimers();
    resetInMemoryStore();
  });

  it('should delete expired messages from the in-memory store', async () => {
    const env = {
      DATABASE_URL: '',
      DEV_AUTH_BYPASS: 'true'
    } as WorkerEnv['Bindings'];

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    resetInMemoryStore();
    await saveContactMessage(
      env,
      { name: 'Old Sender', email: 'old@example.com', message: 'Old message' },
      true
    );

    vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'));
    await expect(purgeExpiredContactMessages(env, true)).resolves.toBe(1);
  });

  it('should keep messages inside the retention window', async () => {
    const env = {
      DATABASE_URL: '',
      DEV_AUTH_BYPASS: 'true'
    } as WorkerEnv['Bindings'];

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-05-01T00:00:00.000Z'));
    resetInMemoryStore();
    await saveContactMessage(
      env,
      { name: 'Fresh Sender', email: 'fresh@example.com', message: 'Fresh message' },
      true
    );

    vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'));
    await expect(purgeExpiredContactMessages(env, true)).resolves.toBe(0);
  });
});
