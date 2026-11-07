import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_CONTENT, type SiteContent } from '../content/default';

const field = (label: string, value: string, onInput: (value: string) => void, multiline = false) => (
  <label class="field">
    <span>{label}</span>
    {multiline ? (
      <textarea value={value} onInput={e => onInput((e.target as HTMLTextAreaElement).value)} rows={3} />
    ) : (
      <input value={value} onInput={e => onInput((e.target as HTMLInputElement).value)} />
    )}
  </label>
);

export default function AdminApp() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [active, setActive] = useState('Overview');

  // Auth States
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('admin');

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const data = await res.json();
        setAuthenticated(true);
        if (data.user?.username) setCurrentUser(data.user.username);
        return true;
      }
    } catch {}
    setAuthenticated(false);
    return false;
  };

  const loadContent = () => {
    setLoading(true);
    fetch('/api/content')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) setContent(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    checkAuth().then(isAuth => {
      setAuthChecking(false);
      if (isAuth) {
        loadContent();
      }
    });
  }, []);

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      setAuthenticated(true);
      if (data.user?.username) setCurrentUser(data.user.username);
      loadContent();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    setAuthenticated(false);
    setPassword('');
  };

  const update = (fn: (draft: SiteContent) => void) =>
    setContent(previous => {
      const next = structuredClone(previous);
      fn(next);
      return next;
    });

  const save = async () => {
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      });
      if (response.status === 401) {
        setAuthenticated(false);
        throw new Error('Session expired. Please log in again.');
      }
      if (!response.ok) throw new Error('Could not save changes.');
      setNotice('Changes saved. Your live site will reflect the updated content.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setSaving(false);
      window.setTimeout(() => setNotice(''), 5000);
    }
  };

  const uploadProjectImage = async (index: number, file: File) => {
    setUploadingIndex(index);
    setNotice('');
    try {
      const response = await fetch('/api/admin/media/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size })
      });
      if (response.status === 401) {
        setAuthenticated(false);
        throw new Error('Session expired. Please log in again.');
      }
      const ticket = await response.json();
      if (!response.ok) throw new Error(ticket.error || 'Could not prepare upload.');
      const form = new FormData();
      Object.entries(ticket.fields as Record<string, string>).forEach(([key, value]) => form.append(key, value));
      form.append('file', file);
      const uploaded = await fetch(ticket.uploadUrl, { method: 'POST', body: form });
      if (!uploaded.ok) throw new Error('Upload failed. Check bucket CORS settings.');
      update(d => {
        d.projects[index].imageUrl = ticket.publicUrl;
      });
      setNotice('Image uploaded. Save changes to publish it on the website.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Image upload failed.');
    } finally {
      setUploadingIndex(null);
      window.setTimeout(() => setNotice(''), 7000);
    }
  };

  // Loading spinner during initial auth check
  if (authChecking) {
    return (
      <div class="login-shell">
        <div class="login-card" style={{ textAlign: 'center' }}>
          <span class="brand-mark">✳</span>
          <p style={{ marginTop: '12px', fontSize: '13px', color: '#9aa79e' }}>Verifying studio credentials…</p>
        </div>
      </div>
    );
  }

  // Login Screen
  if (!authenticated) {
    return (
      <div class="login-shell">
        <div class="login-card">
          <div class="login-header">
            <span class="brand-mark">✳</span>
            <h1>Content Studio</h1>
            <p>Enter your administrator credentials to manage Northstar content.</p>
          </div>

          {loginError && <div class="notice error">{loginError}</div>}

          <form class="login-form" onSubmit={handleLogin}>
            <label class="field">
              <span>Username</span>
              <input
                type="text"
                value={username}
                onInput={e => setUsername((e.target as HTMLInputElement).value)}
                required
                autoComplete="username"
              />
            </label>

            <label class="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onInput={e => setPassword((e.target as HTMLInputElement).value)}
                required
                placeholder="••••••••••••"
                autoComplete="current-password"
                autoFocus
              />
            </label>

            <button type="submit" class="button button-lime login-button" disabled={loggingIn}>
              {loggingIn ? 'Authenticating…' : 'Sign in to Studio'} <span>→</span>
            </button>
          </form>

          <div class="login-footer">
            <a href="/">← Return to public website</a>
          </div>
        </div>
      </div>
    );
  }

  const nav = ['Overview', 'Hero', 'Services', 'Projects', 'About', 'Contact & SEO'];

  return (
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <a class="admin-brand" href="/">
          <span class="brand-mark">✳</span>
          <span>
            NORTHSTAR<small>CONTENT STUDIO</small>
          </span>
        </a>
        <div class="sidebar-label">WORKSPACE</div>
        <nav>
          {nav.map((item, i) => (
            <button
              class={active === item ? 'active' : ''}
              onClick={() => {
                setActive(item);
                document.getElementById(item.toLowerCase().replaceAll(' ', '-').replace('&-', ''))?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>{['◫', '✳', '◈', '▧', '◎', '⚙'][i]}</span>
              {item}
            </button>
          ))}
        </nav>
        <div class="sidebar-bottom">
          <span class="status-dot" /> All systems operational
          <a href="/">↗ View live website</a>
        </div>
      </aside>

      <main class="admin-main">
        <header class="admin-topbar">
          <div class="crumb">
            Northstar <span>/</span> Content Studio
          </div>
          <div class="admin-user">
            <span class="user-avatar">{currentUser.slice(0, 2).toUpperCase()}</span>
            <div>
              <span>{currentUser}</span>
              <small>Administrator</small>
            </div>
            <button class="logout-button" onClick={handleLogout} title="Sign out of Content Studio">
              Sign out
            </button>
          </div>
        </header>

        <div class="admin-content">
          <div class="admin-title-row">
            <div>
              <span class="section-kicker">CONTENT MANAGEMENT</span>
              <h1>Good morning, {currentUser}.</h1>
              <p>Keep your website fresh. Your changes are saved directly to your content database.</p>
            </div>
            <button class="button button-dark save-button" onClick={save} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save changes'} <span>↗</span>
            </button>
          </div>

          {notice && (
            <div class={`notice ${notice.includes('required') || notice.includes('Could not') || notice.includes('failed') || notice.includes('expired') ? 'error' : ''}`}>
              {notice}
            </div>
          )}

          <section class="stats-row" id="overview">
            <div class="stat-card">
              <span>CONTENT AREAS</span>
              <strong>06</strong>
              <small>Ready to customize</small>
            </div>
            <div class="stat-card">
              <span>SERVICES</span>
              <strong>{content.services.length.toString().padStart(2, '0')}</strong>
              <small>Published on your site</small>
            </div>
            <div class="stat-card">
              <span>CASE STUDIES</span>
              <strong>{content.projects.length.toString().padStart(2, '0')}</strong>
              <small>Showing real impact</small>
            </div>
            <a href="/" class="stat-card stat-live">
              <span>WEBSITE STATUS</span>
              <strong>
                <i class="status-dot" /> Live
              </strong>
              <small>Open your public website ↗</small>
            </a>
          </section>

          {loading && <div class="loading-line">Loading your content…</div>}

          <section class="editor-panel" id="hero">
            <div class="panel-heading">
              <div>
                <span class="section-kicker">01 / FIRST IMPRESSION</span>
                <h2>Hero section</h2>
                <p>The first thing visitors see when they land on your site.</p>
              </div>
              <span class="panel-icon">✳</span>
            </div>
            <div class="field-grid">
              {field('Eyebrow', content.hero.eyebrow, v => update(d => { d.hero.eyebrow = v; }))}
              {field('Brand name', content.brand, v => update(d => { d.brand = v; }))}
              {field('Main heading', content.hero.title, v => update(d => { d.hero.title = v; }))}
              {field('Highlighted heading', content.hero.highlight, v => update(d => { d.hero.highlight = v; }))}
              {field('Description', content.hero.description, v => update(d => { d.hero.description = v; }), true)}
              {field('Primary button', content.hero.primaryCta, v => update(d => { d.hero.primaryCta = v; }))}
            </div>
          </section>

          <section class="editor-panel" id="services">
            <div class="panel-heading">
              <div>
                <span class="section-kicker">02 / WHAT YOU OFFER</span>
                <h2>Services</h2>
                <p>Describe the expertise your team brings to clients.</p>
              </div>
              <span class="panel-icon">◈</span>
            </div>
            {content.services.map((service, i) => (
              <div class="repeat-card" key={i}>
                <div class="repeat-title">
                  <span class="repeat-number">{String(i + 1).padStart(2, '0')}</span>
                  <strong>Service {i + 1}</strong>
                  <button class="remove-button" onClick={() => update(d => { d.services.splice(i, 1); })}>
                    Remove
                  </button>
                </div>
                <div class="field-grid">
                  {field('Service name', service.title, v => update(d => { d.services[i].title = v; }))}
                  {field('Category tag', service.tag, v => update(d => { d.services[i].tag = v; }))}
                  {field('Short description', service.description, v => update(d => { d.services[i].description = v; }), true)}
                </div>
              </div>
            ))}
            <button
              class="add-button"
              onClick={() =>
                update(d => {
                  d.services.push({
                    number: String(d.services.length + 1).padStart(2, '0'),
                    tag: 'NEW SERVICE',
                    title: 'New service',
                    description: 'Describe this service for your clients.'
                  });
                })
              }
            >
              ＋ Add a service
            </button>
          </section>

          <section class="editor-panel" id="projects">
            <div class="panel-heading">
              <div>
                <span class="section-kicker">03 / PROOF OF IMPACT</span>
                <h2>Selected projects</h2>
                <p>Showcase outcomes and the work behind them.</p>
              </div>
              <span class="panel-icon">▧</span>
            </div>
            {content.projects.map((project, i) => (
              <div class="repeat-card" key={i}>
                <div class="repeat-title">
                  <span class="repeat-number">0{i + 1}</span>
                  <strong>Case study {i + 1}</strong>
                  <button class="remove-button" onClick={() => update(d => { d.projects.splice(i, 1); })}>
                    Remove
                  </button>
                </div>
                <div class="field-grid">
                  {field('Project title', project.name, v => update(d => { d.projects[i].name = v; }))}
                  {field('Category', project.category, v => update(d => { d.projects[i].category = v; }))}
                  {field('Summary', project.description, v => update(d => { d.projects[i].description = v; }), true)}
                  {field('Key result', project.result, v => update(d => { d.projects[i].result = v; }))}
                  <label class="field">
                    <span>Project image · JPEG, PNG, WebP or AVIF · max 8 MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      disabled={uploadingIndex === i}
                      onChange={e => {
                        const file = (e.currentTarget as HTMLInputElement).files?.[0];
                        if (file) void uploadProjectImage(i, file);
                      }}
                    />
                    {uploadingIndex === i && <small class="upload-hint">Uploading securely…</small>}
                  </label>
                  {project.imageUrl && (
                    <div class="uploaded-preview">
                      <img src={project.imageUrl} alt="Project image preview" />
                      <span>Uploaded image ready to publish</span>
                      <button type="button" class="remove-button" onClick={() => update(d => { d.projects[i].imageUrl = ''; })}>
                        Remove image
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button
              class="add-button"
              onClick={() =>
                update(d => {
                  d.projects.push({
                    name: 'New case study',
                    category: 'YOUR INDUSTRY',
                    description: 'Describe the challenge and the solution.',
                    result: 'A measurable result',
                    tone: d.projects.length % 2 ? 'blue' : 'mint'
                  });
                })
              }
            >
              ＋ Add a case study
            </button>
          </section>

          <section class="editor-panel" id="about">
            <div class="panel-heading">
              <div>
                <span class="section-kicker">04 / YOUR STORY</span>
                <h2>About your team</h2>
                <p>Explain what makes your approach different.</p>
              </div>
              <span class="panel-icon">◎</span>
            </div>
            <div class="field-grid">
              {field('Headline', content.about.title, v => update(d => { d.about.title = v; }), true)}
              {field('About description', content.about.description, v => update(d => { d.about.description = v; }), true)}
              {field('Stat or milestone', content.about.stat, v => update(d => { d.about.stat = v; }))}
              {field('Stat caption', content.about.statLabel, v => update(d => { d.about.statLabel = v; }))}
            </div>
          </section>

          <section class="editor-panel" id="contact-seo">
            <div class="panel-heading">
              <div>
                <span class="section-kicker">05 / MAKE IT EASY TO CONNECT</span>
                <h2>Contact & SEO</h2>
                <p>Contact details and search engine metadata.</p>
              </div>
              <span class="panel-icon">↗</span>
            </div>
            <div class="field-grid">
              {field('Contact email', content.contact.email, v => update(d => { d.contact.email = v; }))}
              {field('Location', content.contact.location, v => update(d => { d.contact.location = v; }))}
              {field('Call to action', content.contact.availability, v => update(d => { d.contact.availability = v; }), true)}
              {field('SEO page title', content.seo.title, v => update(d => { d.seo.title = v; }))}
              {field('SEO description', content.seo.description, v => update(d => { d.seo.description = v; }), true)}
            </div>
          </section>

          <div class="bottom-save">
            <span>Remember to save your changes before leaving.</span>
            <button class="button button-dark" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'} <span>↗</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
