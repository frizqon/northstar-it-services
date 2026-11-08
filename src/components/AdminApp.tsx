import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_CONTENT, type Service, type SiteContent } from '../content/default';
import { validateSiteContent } from '../content/validate';
import type { ContactMessage, ContactMessageStats, MessageStatus } from '../worker/types';
import { ToastNotice } from './ui/ToastNotice';
import { LoginView } from './admin/LoginView';
import { AdminSidebar } from './admin/AdminSidebar';
import { AdminHeader } from './admin/AdminHeader';
import { StatsOverview } from './admin/StatsOverview';
import { MessagesManager } from './admin/MessagesManager';
import { HeroEditor } from './admin/editors/HeroEditor';
import { ServicesEditor } from './admin/editors/ServicesEditor';
import { ProjectsEditor } from './admin/editors/ProjectsEditor';
import { AboutEditor } from './admin/editors/AboutEditor';
import { ContactSeoEditor } from './admin/editors/ContactSeoEditor';

type Notice = { type: 'success' | 'error'; message: string };

function renumberServices(services: Service[]): void {
  services.forEach((service, index) => {
    service.number = String(index + 1).padStart(2, '0');
  });
}

function normalizeContent(content: SiteContent): SiteContent {
  const next = structuredClone(content);
  renumberServices(next.services);
  return next;
}

export default function AdminApp() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [contentUpdatedAt, setContentUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');

  // Messages State
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesStats, setMessagesStats] = useState<ContactMessageStats>({
    total: 0,
    unread: 0,
    read: 0,
    replied: 0
  });
  const [messageFilter, setMessageFilter] = useState<'all' | MessageStatus>('all');
  const [messagesHasMore, setMessagesHasMore] = useState(false);

  const showNotice = (message: string, type: Notice['type'] = 'success') => {
    setNotice({ type, message });
  };

  // Auth States
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<string>('admin');

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const data = await res.json();
        setAuthenticated(true);
        if (data.user?.username) {
          setCurrentUser(data.user.username);
        }
        return true;
      }
    } catch {
      // Network failure or unauthenticated
    }
    setAuthenticated(false);
    return false;
  };

  const loadContent = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/content', { cache: 'no-store' });
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!res.ok) {
        throw new Error('Could not load content');
      }
      const data = await res.json();
      if (validateSiteContent(data?.content)) {
        setContent(normalizeContent(data.content));
        setContentUpdatedAt(typeof data.updatedAt === 'string' ? data.updatedAt : null);
      } else {
        console.warn('Received invalid content payload; keeping the current editor state');
      }
    } catch (err) {
      console.warn('Failed to load content', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (
    options: { reset?: boolean; filter?: 'all' | MessageStatus } = {}
  ) => {
    const filter = options.filter ?? messageFilter;
    const reset = options.reset ?? false;
    setMessagesLoading(true);
    try {
      const offset = reset ? 0 : messages.length;
      const params = new URLSearchParams({
        limit: '50',
        offset: String(offset)
      });
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const res = await fetch(`/api/admin/messages?${params.toString()}`);
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!res.ok) {
        return;
      }

      const data = await res.json();
      if (Array.isArray(data.messages)) {
        setMessages((prev) => (reset ? data.messages : [...prev, ...data.messages]));
      }
      if (data.stats) {
        setMessagesStats(data.stats as ContactMessageStats);
      }
      setMessagesHasMore(Boolean(data.pagination?.hasMore));
    } catch (err) {
      console.warn('Failed to load messages', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleFilterChange = (filter: 'all' | MessageStatus) => {
    setMessageFilter(filter);
    void loadMessages({ reset: true, filter });
  };

  useEffect(() => {
    checkAuth().then((isAuth) => {
      setAuthChecking(false);
      if (isAuth) {
        void loadContent();
        void loadMessages({ reset: true, filter: 'all' });
      }
    });
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    setAuthenticated(false);
  };

  const update = (fn: (draft: SiteContent) => void) => {
    setContent((previous) => {
      const next = structuredClone(previous);
      fn(next);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, updatedAt: contentUpdatedAt })
      });
      if (response.status === 401) {
        setAuthenticated(false);
        throw new Error('Session expired. Please log in again.');
      }

      const data = await response.json().catch(() => ({}));

      if (response.status === 409) {
        showNotice(
          'Another session changed this content. Reloaded the latest version; reapply your edits.',
          'error'
        );
        await loadContent();
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Could not save changes.');
      }

      if (typeof data.updatedAt === 'string') {
        setContentUpdatedAt(data.updatedAt);
      }
      showNotice('Changes saved. Your live site will reflect the updated content.');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
      window.setTimeout(() => setNotice(null), 5000);
    }
  };

  const handleUpdateMessageStatus = async (
    id: number,
    status: MessageStatus,
    replyNotes?: string | null
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/messages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, replyNotes })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (data.ok && data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? (data.message as ContactMessage) : m))
        );
        void loadMessages({ reset: true, filter: messageFilter });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDeleteMessage = async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/messages/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        return false;
      }

      setMessages((prev) => prev.filter((m) => m.id !== id));
      void loadMessages({ reset: true, filter: messageFilter });

      return true;
    } catch {
      return false;
    }
  };

  const uploadProjectImage = async (index: number, file: File) => {
    setUploadingIndex(index);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/media/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          size: file.size
        })
      });

      if (response.status === 401) {
        setAuthenticated(false);
        throw new Error('Session expired. Please log in again.');
      }

      const ticket = await response.json();
      if (!response.ok) {
        throw new Error(ticket.error || 'Could not prepare upload.');
      }

      const form = new FormData();
      Object.entries(ticket.fields as Record<string, string>).forEach(([key, value]) =>
        form.append(key, value)
      );
      form.append('file', file);

      const uploaded = await fetch(ticket.uploadUrl, { method: 'POST', body: form });
      if (!uploaded.ok) {
        throw new Error('Upload failed. Check bucket CORS settings.');
      }

      const confirmation = await fetch('/api/admin/media/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: ticket.key })
      });

      if (confirmation.status === 401) {
        setAuthenticated(false);
        throw new Error('Session expired. Please log in again.');
      }

      const verified = await confirmation.json();
      if (!confirmation.ok) {
        throw new Error(verified.error || 'Image verification failed.');
      }

      update((d) => {
        d.projects[index].imageUrl = verified.publicUrl;
      });
      showNotice('Image uploaded. Save changes to publish it on the website.');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Image upload failed.', 'error');
    } finally {
      setUploadingIndex(null);
      window.setTimeout(() => setNotice(null), 7000);
    }
  };

  const handleSelectTab = (tabName: string, elementId: string) => {
    setActiveTab(tabName);
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // 1. Initial auth verification loading state
  if (authChecking) {
    return (
      <div class="login-shell">
        <div class="login-card" style={{ textAlign: 'center' }}>
          <span class="brand-mark" aria-hidden="true">✳</span>
          <p style={{ marginTop: '12px', fontSize: '13px', color: '#9aa79e' }}>
            Verifying studio credentials…
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated login screen
  if (!authenticated) {
    return (
      <LoginView
        onSuccess={(username) => {
          setAuthenticated(true);
          setCurrentUser(username);
          void loadContent();
          void loadMessages({ reset: true, filter: 'all' });
        }}
      />
    );
  }

  // 3. Authenticated Admin Workspace
  return (
    <div class="admin-shell">
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        unreadCount={messagesStats.unread}
      />

      <main class="admin-main">
        <AdminHeader
          currentUser={currentUser}
          onLogout={handleLogout}
          unreadCount={messagesStats.unread}
          onNavigateMessages={() => handleSelectTab('Messages', 'messages')}
        />

        <div class="admin-content">
          <div class="admin-title-row">
            <div>
              <span class="section-kicker">CONTENT MANAGEMENT</span>
              <h1>{greeting}, {currentUser}.</h1>
              <p>Keep your website fresh. Your changes are saved directly to your content database.</p>
            </div>
            <button
              type="button"
              class="button button-dark save-button"
              onClick={save}
              disabled={saving || loading}
            >
              {saving ? 'Saving…' : 'Save changes'} <span aria-hidden="true">↗</span>
            </button>
          </div>

          <ToastNotice
            message={notice?.message ?? ''}
            isError={notice?.type === 'error'}
          />

          <StatsOverview
            servicesCount={content.services.length}
            projectsCount={content.projects.length}
            messagesStats={messagesStats}
            onNavigateMessages={() => handleSelectTab('Messages', 'messages')}
          />

          {loading && <div class="loading-line">Loading your content…</div>}

          <MessagesManager
            messages={messages}
            stats={messagesStats}
            loading={messagesLoading}
            filter={messageFilter}
            hasMore={messagesHasMore}
            onFilterChange={handleFilterChange}
            onLoadMore={() => void loadMessages()}
            onRefresh={() => void loadMessages({ reset: true })}
            onUpdateStatus={handleUpdateMessageStatus}
            onDeleteMessage={handleDeleteMessage}
          />

          <HeroEditor
            brand={content.brand}
            hero={content.hero}
            onUpdateBrand={(brand) => update((d) => { d.brand = brand; })}
            onUpdateHero={(key, val) => update((d) => { d.hero[key] = val; })}
          />

          <ServicesEditor
            services={content.services}
            onUpdateService={(index, key, val) =>
              update((d) => {
                d.services[index][key] = val;
              })
            }
            onRemoveService={(index) =>
              update((d) => {
                d.services.splice(index, 1);
                renumberServices(d.services);
              })
            }
            onAddService={() =>
              update((d) => {
                d.services.push({
                  number: String(d.services.length + 1).padStart(2, '0'),
                  tag: 'NEW SERVICE',
                  title: 'New service',
                  description: 'Describe this service for your clients.'
                });
                renumberServices(d.services);
              })
            }
          />

          <ProjectsEditor
            projects={content.projects}
            uploadingIndex={uploadingIndex}
            onUpdateProject={(index, key, val) =>
              update((d) => {
                (d.projects[index] as Record<string, string>)[key] = val;
              })
            }
            onRemoveProject={(index) =>
              update((d) => {
                d.projects.splice(index, 1);
              })
            }
            onAddProject={() =>
              update((d) => {
                d.projects.push({
                  name: 'New case study',
                  category: 'YOUR INDUSTRY',
                  description: 'Describe the challenge and the solution.',
                  result: 'A measurable result',
                  tone: d.projects.length % 2 ? 'blue' : 'mint'
                });
              })
            }
            onUploadImage={uploadProjectImage}
          />

          <AboutEditor
            about={content.about}
            onUpdateAbout={(key, val) => update((d) => { d.about[key] = val; })}
          />

          <ContactSeoEditor
            contact={content.contact}
            seo={content.seo}
            onUpdateContact={(key, val) => update((d) => { d.contact[key] = val; })}
            onUpdateSeo={(key, val) => update((d) => { d.seo[key] = val; })}
          />

          <div class="bottom-save">
            <span>Remember to save your changes before leaving.</span>
            <button
              type="button"
              class="button button-dark"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'} <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
