import type { SiteContent } from './default';
import { isSafeImageUrl } from '../utils/url';

export const MAX_SERVICES = 20;
export const MAX_PROJECTS = 50;
export const MAX_CONTENT_BYTES = 512 * 1024;

const LIMITS = {
  brand: 100,
  heroEyebrow: 200,
  heroTitle: 200,
  heroHighlight: 200,
  heroDescription: 2000,
  cta: 100,
  serviceTitle: 200,
  serviceDescription: 2000,
  serviceNumber: 10,
  serviceTag: 100,
  projectName: 200,
  projectCategory: 100,
  projectDescription: 2000,
  projectResult: 200,
  projectTone: 50,
  aboutTitle: 300,
  aboutDescription: 3000,
  aboutStat: 50,
  aboutStatLabel: 200,
  contactEmail: 200,
  contactLocation: 200,
  contactAvailability: 500,
  seoTitle: 200,
  seoDescription: 500
} as const;

function isStringWithin(value: unknown, max: number, min = 0): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

/**
 * Validates the full site content payload. Used before writing to Postgres,
 * before returning database rows to clients, and before hydrating the UI.
 */
export function validateSiteContent(data: unknown): data is SiteContent {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  try {
    if (JSON.stringify(data).length > MAX_CONTENT_BYTES) return false;
  } catch {
    return false;
  }

  const c = data as Record<string, unknown>;

  if (!isStringWithin(c.brand, LIMITS.brand, 1) || !c.brand.trim()) return false;

  // Hero validation
  if (!c.hero || typeof c.hero !== 'object') return false;
  const hero = c.hero as Record<string, unknown>;
  if (
    !isStringWithin(hero.eyebrow, LIMITS.heroEyebrow) ||
    !isStringWithin(hero.title, LIMITS.heroTitle) ||
    !isStringWithin(hero.highlight, LIMITS.heroHighlight) ||
    !isStringWithin(hero.description, LIMITS.heroDescription) ||
    !isStringWithin(hero.primaryCta, LIMITS.cta) ||
    !isStringWithin(hero.secondaryCta, LIMITS.cta)
  ) {
    return false;
  }

  // Services validation
  if (!Array.isArray(c.services) || c.services.length > MAX_SERVICES) return false;
  for (const s of c.services) {
    if (!s || typeof s !== 'object') return false;
    const service = s as Record<string, unknown>;
    if (
      !isStringWithin(service.title, LIMITS.serviceTitle) ||
      !isStringWithin(service.description, LIMITS.serviceDescription) ||
      !isStringWithin(service.number, LIMITS.serviceNumber) ||
      !isStringWithin(service.tag, LIMITS.serviceTag)
    ) {
      return false;
    }
  }

  // Projects validation
  if (!Array.isArray(c.projects) || c.projects.length > MAX_PROJECTS) return false;
  for (const p of c.projects) {
    if (!p || typeof p !== 'object') return false;
    const project = p as Record<string, unknown>;
    if (
      !isStringWithin(project.name, LIMITS.projectName) ||
      !isStringWithin(project.category, LIMITS.projectCategory) ||
      !isStringWithin(project.description, LIMITS.projectDescription) ||
      !isStringWithin(project.result, LIMITS.projectResult) ||
      !isStringWithin(project.tone, LIMITS.projectTone)
    ) {
      return false;
    }

    if (project.imageUrl !== undefined) {
      if (typeof project.imageUrl !== 'string') return false;
      if (project.imageUrl.trim() && !isSafeImageUrl(project.imageUrl)) return false;
    }
  }

  // About validation
  if (!c.about || typeof c.about !== 'object') return false;
  const about = c.about as Record<string, unknown>;
  if (
    !isStringWithin(about.title, LIMITS.aboutTitle) ||
    !isStringWithin(about.description, LIMITS.aboutDescription) ||
    !isStringWithin(about.stat, LIMITS.aboutStat) ||
    !isStringWithin(about.statLabel, LIMITS.aboutStatLabel)
  ) {
    return false;
  }

  // Contact validation
  if (!c.contact || typeof c.contact !== 'object') return false;
  const contact = c.contact as Record<string, unknown>;
  if (
    !isStringWithin(contact.email, LIMITS.contactEmail) ||
    !isStringWithin(contact.location, LIMITS.contactLocation) ||
    !isStringWithin(contact.availability, LIMITS.contactAvailability)
  ) {
    return false;
  }

  // SEO validation
  if (!c.seo || typeof c.seo !== 'object') return false;
  const seo = c.seo as Record<string, unknown>;
  if (
    !isStringWithin(seo.title, LIMITS.seoTitle) ||
    !isStringWithin(seo.description, LIMITS.seoDescription)
  ) {
    return false;
  }

  return true;
}
