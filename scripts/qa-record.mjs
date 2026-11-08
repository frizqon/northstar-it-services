import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:8787';
const ADMIN_USER = process.env.QA_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.QA_ADMIN_PASS || 'QaDevPass123';
const OUT = path.resolve('qa-artifacts');
const VIDEO_DIR = path.join(OUT, 'videos');
const SHOT_DIR = path.join(OUT, 'screenshots');

const MODES = {
  desktop: {
    label: 'Desktop 1440x900',
    viewport: { width: 1440, height: 900 },
    video: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  },
  mobile: {
    label: 'Mobile 390x844 (iPhone 14 class)',
    viewport: { width: 390, height: 844 },
    video: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  }
};

const report = { base: BASE, startedAt: new Date().toISOString(), modes: {} };

function pause(ms = 700) {
  return new Promise((r) => setTimeout(r, ms));
}

async function attachDiagnostics(page, bucket) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') bucket.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => bucket.pageErrors.push(String(err)));
  page.on('requestfailed', (req) => {
    const failure = req.failure()?.errorText || 'unknown';
    if (!failure.includes('ERR_ABORTED')) {
      bucket.requestFailures.push(`${req.method()} ${req.url()} :: ${failure}`);
    }
  });
  page.on('response', (res) => {
    if (res.status() >= 400) bucket.httpErrors.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  });
}

async function smoothScroll(page, totalSteps = 14) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.max(200, Math.floor(height / totalSteps));
  for (let y = 0; y < height; y += step) {
    await page.evaluate((to) => window.scrollTo({ top: to, behavior: 'smooth' }), y);
    await pause(450);
  }
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }));
  await pause(900);
}

async function landingJourney(page, mode, bucket) {
  const steps = [];
  const step = async (name, fn) => {
    const started = Date.now();
    const result = await fn();
    steps.push({ step: name, ms: Date.now() - started, result });
    return result;
  };

  await step('open landing page', async () => {
    const res = await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await pause(1200);
    return { status: res?.status(), title: await page.title() };
  });

  await step('verify hero + nav', async () => {
    const data = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      brand: document.querySelector('.site-nav .brand')?.textContent?.trim() || '',
      h1: document.querySelector('h1')?.textContent?.trim() || '',
      navLinks: [...document.querySelectorAll('.nav-links a')].map((a) => a.textContent?.trim()),
      heroCta: document.querySelector('.hero-actions .button-lime')?.textContent?.trim() || ''
    }));
    bucket.checks.push({ check: 'hero/nav present', ok: Boolean(data.h1 && data.navLinks.length >= 4), data });
    return data;
  });

  await step('scroll full page', async () => {
    await smoothScroll(page);
    return 'scrolled to footer';
  });

  await step('verify sections', async () => {
    const data = await page.evaluate(() => {
      const ids = ['services', 'work', 'about', 'contact'];
      return {
        sections: ids.map((id) => ({ id, present: Boolean(document.getElementById(id)) })),
        serviceCards: document.querySelectorAll('.service-card').length,
        projectCards: document.querySelectorAll('.project-card').length,
        footer: Boolean(document.querySelector('.site-footer'))
      };
    });
    const ok = data.sections.every((s) => s.present) && data.serviceCards >= 3 && data.projectCards >= 1 && data.footer;
    bucket.checks.push({ check: 'all landing sections render', ok, data });
    return data;
  });

  await step('nav links scroll to sections', async () => {
    const results = [];
    for (const id of ['services', 'work', 'about']) {
      const link = page.locator(`.nav-links a[href="#${id}"]`);
      const visible = await link.isVisible();
      if (visible) {
        await link.click();
        await pause(900);
      } else {
        await page.locator('.mobile-menu-trigger').click();
        await pause(500);
        await page.locator(`.mobile-nav-item[href="#${id}"]`).click();
        await pause(900);
      }
      const top = await page.evaluate((sectionId) => Math.round(document.getElementById(sectionId).getBoundingClientRect().top), id);
      results.push({ id, visible, sectionTop: top });
    }
    const ok = results.every((r) => Math.abs(r.sectionTop) < 260);
    bucket.checks.push({ check: 'nav links jump to sections', ok, data: results });
    return results;
  });

  await step('theme toggle', async () => {
    const isMobileNav = !(await page.locator('.nav-theme-switch').isVisible());
    const scope = isMobileNav ? '.mobile-theme-row' : '.nav-theme-switch';
    if (isMobileNav) {
      await page.locator('.mobile-menu-trigger').click();
      await pause(400);
    }
    await page.locator(`${scope} button[title="Dark mode"]`).click();
    await pause(800);
    const dark = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.locator(`${scope} button[title^="Auto"]`).click();
    await pause(500);
    const back = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (isMobileNav) {
      await page.locator('.drawer-close-btn').click();
      await pause(400);
    }
    bucket.checks.push({ check: 'theme toggle switches dark/light', ok: dark === 'dark', data: { dark, back } });
    return { dark, back };
  });

  await step('mobile drawer keyboard escape', async () => {
    if (mode !== 'mobile') return 'skipped (desktop)';
    await page.locator('.mobile-menu-trigger').click();
    await pause(500);
    const opened = await page.locator('.mobile-drawer').isVisible();
    await page.keyboard.press('Escape');
    await pause(500);
    const closed = (await page.locator('.mobile-drawer').count()) === 0;
    bucket.checks.push({ check: 'mobile drawer opens and closes with Escape', ok: opened && closed, data: { opened, closed } });
    return { opened, closed };
  });

  await step('contact form validation', async () => {
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await pause(700);
    await page.locator('.contact-submit-btn').click();
    await pause(600);
    const alertText = await page.locator('.form-alert.error').textContent().catch(() => '');
    const ok = /name/i.test(alertText || '');
    bucket.checks.push({ check: 'empty contact submit shows validation', ok, data: alertText });
    return alertText;
  });

  await step('contact form success', async () => {
    await page.fill('#contact-name', 'Budi Santoso');
    await page.fill('#contact-email', 'budi@example.com');
    await page.fill('#contact-message', 'Halo, kami ingin konsultasi migrasi cloud dan penguatan keamanan platform.');
    await pause(400);
    await page.locator('.contact-submit-btn').click();
    await page.locator('.contact-success-state').waitFor({ state: 'visible', timeout: 8000 });
    await pause(1200);
    const text = (await page.locator('.contact-success-state').innerText()).replace(/\s+/g, ' ').trim();
    bucket.checks.push({ check: 'contact form submits successfully', ok: /successfully/i.test(text), data: text });
    return text;
  });

  await step('layout overflow + tap targets', async () => {
    const data = await page.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const targets = [...document.querySelectorAll('a.button, button, .mobile-menu-trigger, .nav-cta')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { label: (el.textContent || el.getAttribute('aria-label') || el.className).trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) };
        });
      const smallTargets = targets.filter((t) => t.h < 24 || t.w < 24);
      const below44 = targets.filter((t) => t.h < 44 || t.w < 44);
      const imgs = [...document.querySelectorAll('img')].map((img) => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') }));
      return { overflowPx: overflow, smallTargets, below44, images: imgs.length, imagesMissingAlt: imgs.filter((i) => i.alt === null).length };
    });
    bucket.checks.push({ check: 'no horizontal overflow', ok: data.overflowPx <= 1, data: { overflowPx: data.overflowPx } });
    bucket.checks.push({ check: 'tap targets >= 24px (WCAG 2.5.8)', ok: data.smallTargets.length === 0, data: data.smallTargets });
    bucket.checks.push({ check: 'tap targets >= 44px (comfort heuristic)', ok: data.below44.length === 0, data: data.below44 });
    bucket.checks.push({ check: 'images have alt attributes', ok: data.imagesMissingAlt === 0, data: { images: data.images, missingAlt: data.imagesMissingAlt } });
    return data;
  });

  await step('full page screenshot', async () => {
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await pause(600);
    const file = path.join(SHOT_DIR, `${mode}-landing.png`);
    await page.screenshot({ path: file, fullPage: true });
    return file;
  });

  return steps;
}

async function adminJourney(page, mode, bucket) {
  const steps = [];
  const step = async (name, fn) => {
    const started = Date.now();
    const result = await fn();
    steps.push({ step: name, ms: Date.now() - started, result });
    return result;
  };

  await step('open admin login', async () => {
    await page.goto(BASE + '/admin/', { waitUntil: 'networkidle' });
    await page.locator('.login-header h1').waitFor({ state: 'visible', timeout: 10000 });
    await pause(900);
    return await page.locator('.login-header h1').innerText();
  });

  await step('invalid credentials rejected', async () => {
    await page.fill('input[autocomplete="username"]', ADMIN_USER);
    await page.fill('input[autocomplete="current-password"]', 'WrongPassword123!');
    await page.locator('button.login-button').click();
    await page.locator('.notice.error').waitFor({ state: 'visible', timeout: 8000 });
    await pause(1000);
    const text = (await page.locator('.notice.error').innerText()).trim();
    bucket.checks.push({ check: 'invalid login rejected', ok: Boolean(text), data: text });
    return text;
  });

  await step('valid credentials sign in', async () => {
    await page.fill('input[autocomplete="username"]', ADMIN_USER);
    await page.fill('input[autocomplete="current-password"]', ADMIN_PASS);
    await page.locator('button.login-button').click();
    await page.locator('.admin-shell').waitFor({ state: 'visible', timeout: 10000 });
    await pause(1400);
    const data = await page.evaluate(() => ({
      heading: document.querySelector('.admin-title-row h1')?.textContent?.trim(),
      stats: document.querySelectorAll('.stat-card').length
    }));
    bucket.checks.push({ check: 'valid login opens Content Studio', ok: Boolean(data.heading), data });
    return data;
  });

  await step('navigate studio tabs', async () => {
    const results = [];
    for (const label of ['Messages', 'Hero', 'Services', 'Projects', 'About', 'Contact & SEO', 'Overview']) {
      const btn = page.locator(`.admin-sidebar nav button[aria-label="${label}"]`);
      await btn.click();
      await pause(800);
      results.push({ label, active: await btn.evaluate((el) => el.classList.contains('active')) });
    }
    const ok = results.every((r) => r.active);
    bucket.checks.push({ check: 'sidebar tab navigation works', ok, data: results });
    return results;
  });

  await step('save content', async () => {
    await page.locator('.save-button').first().click();
    await pause(1800);
    const toast = (await page.locator('.toast-notice, .notice').first().innerText().catch(() => '')).trim();
    bucket.checks.push({ check: 'save content shows confirmation', ok: /saved|saving/i.test(toast), data: toast });
    return toast;
  });

  await step('admin layout overflow', async () => {
    const data = await page.evaluate(() => ({
      overflowPx: document.documentElement.scrollWidth - window.innerWidth,
      viewport: window.innerWidth
    }));
    bucket.checks.push({ check: 'admin has no horizontal overflow', ok: data.overflowPx <= 1, data });
    return data;
  });

  await step('admin screenshot', async () => {
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await pause(600);
    const file = path.join(SHOT_DIR, `${mode}-admin.png`);
    await page.screenshot({ path: file, fullPage: false });
    return file;
  });

  await step('logout returns to login', async () => {
    const logout = page.locator('.logout-button').first();
    if (await logout.count()) {
      await logout.click();
      await pause(1200);
      const back = await page.locator('.login-header h1').isVisible().catch(() => false);
      bucket.checks.push({ check: 'logout returns to login', ok: back, data: { back } });
      return back;
    }
    bucket.checks.push({ check: 'logout control found', ok: false, data: 'no logout button matched' });
    return 'no logout control';
  });

  return steps;
}

async function runMode(browser, mode) {
  const cfg = MODES[mode];
  const modeReport = { label: cfg.label, journeys: {} };

  for (const journey of ['landing', 'admin']) {
    const context = await browser.newContext({
      viewport: cfg.viewport,
      deviceScaleFactor: cfg.deviceScaleFactor,
      isMobile: cfg.isMobile,
      hasTouch: cfg.hasTouch,
      recordVideo: { dir: VIDEO_DIR, size: cfg.video }
    });
    const page = await context.newPage();
    const journeyBucket = { consoleErrors: [], pageErrors: [], requestFailures: [], httpErrors: [], checks: [] };
    await attachDiagnostics(page, journeyBucket);
    try {
      const steps = journey === 'landing'
        ? await landingJourney(page, mode, journeyBucket)
        : await adminJourney(page, mode, journeyBucket);
      modeReport.journeys[journey] = { ok: true, steps, ...journeyBucket };
    } catch (err) {
      modeReport.journeys[journey] = {
        ok: false,
        error: String(err?.message || err),
        screenshot: await page.screenshot({ path: path.join(SHOT_DIR, `${mode}-${journey}-failure.png`) }).catch(() => null),
        ...journeyBucket
      };
    }
    const video = page.video();
    await context.close();
    if (video) {
      const src = await video.path();
      const dest = path.join(VIDEO_DIR, `${mode}-${journey}.webm`);
      await fs.rename(src, dest).catch(async () => {
        await fs.copyFile(src, dest);
      });
      modeReport.journeys[journey].video = dest;
    }
  }

  return modeReport;
}

await fs.mkdir(VIDEO_DIR, { recursive: true });
await fs.mkdir(SHOT_DIR, { recursive: true });

const browser = await chromium.launch();
try {
  for (const mode of Object.keys(MODES)) {
    report.modes[mode] = await runMode(browser, mode);
  }
} finally {
  await browser.close();
}

report.finishedAt = new Date().toISOString();
await fs.writeFile(path.join(OUT, 'qa-report.json'), JSON.stringify(report, null, 2), 'utf8');

const lines = ['# QA run report', '', `Base URL: ${BASE}`, `Started: ${report.startedAt}`, `Finished: ${report.finishedAt}`, ''];
for (const [mode, data] of Object.entries(report.modes)) {
  lines.push(`## ${data.label}`);
  for (const [name, j] of Object.entries(data.journeys)) {
    lines.push(`### ${name}: ${j.ok ? 'PASS' : 'FAIL'}`);
    if (j.error) lines.push(`- Error: ${j.error}`);
    if (j.video) lines.push(`- Video: ${path.relative(process.cwd(), j.video)}`);
    for (const c of j.checks || []) {
      lines.push(`- [${c.ok ? 'x' : ' '}] ${c.check}${c.ok ? '' : ` -> ${JSON.stringify(c.data)}`}`);
    }
    for (const e of j.consoleErrors || []) lines.push(`- console error: ${e}`);
    for (const e of j.pageErrors || []) lines.push(`- page error: ${e}`);
    for (const e of j.requestFailures || []) lines.push(`- request failed: ${e}`);
    for (const e of j.httpErrors || []) lines.push(`- http error: ${e}`);
  }
  lines.push('');
}
await fs.writeFile(path.join(OUT, 'qa-report.md'), lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
