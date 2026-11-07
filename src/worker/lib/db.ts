import { neon } from '@neondatabase/serverless';
import { DEFAULT_CONTENT, type SiteContent } from '../../content/default';
import type { WorkerEnv } from '../types';

let inMemoryContent: SiteContent = structuredClone(DEFAULT_CONTENT);

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

export async function getSiteContent(
  env: WorkerEnv['Bindings'],
  isLocal: boolean
): Promise<SiteContent> {
  if (!env.DATABASE_URL) {
    if (isLocal && env.DEV_AUTH_BYPASS === 'true') {
      return inMemoryContent;
    }
    throw new Error('DATABASE_URL is not configured');
  }

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`SELECT content FROM site_content WHERE id = 1 LIMIT 1`;
  return (rows[0]?.content as SiteContent | undefined) ?? DEFAULT_CONTENT;
}

export async function saveSiteContent(
  env: WorkerEnv['Bindings'],
  content: SiteContent,
  isLocal: boolean
): Promise<void> {
  if (!env.DATABASE_URL) {
    if (isLocal && env.DEV_AUTH_BYPASS === 'true') {
      inMemoryContent = structuredClone(content);
      return;
    }
    throw new Error('Database is not configured');
  }

  const sql = neon(env.DATABASE_URL);
  await sql`
    INSERT INTO site_content (id, content, updated_at)
    VALUES (1, ${JSON.stringify(content)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET
      content = EXCLUDED.content,
      updated_at = now()
  `;
}
