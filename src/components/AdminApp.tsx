import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_CONTENT, type SiteContent } from '../content/default';
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

export default function AdminApp() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');

  // Messages State
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesStats, setMessagesStats] = useState<ContactMessageStats>({
    total: 0,
    unread: 0,
    read: 0,
    replied: 0
  });
  const [messagesLoading, setMessagesLoading] = useState(false);

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

  const loadContent = () => {
    setLoading(true);
    fetch('/api/content')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setContent(data);
      })
      .catch((err) => {
        console.warn('Failed to load content', err);
      })
      .finally(() => setLoading(false));
  };

  const loadMessages = async () => {
    setMessagesLoading(true);
    try {
      const res = await fetch('/api/admin/messages');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
        if (data.stats) {
          setMessagesStats(data.stats);
        }
      }
    } catch (err) {
      console.warn('Failed to load messages', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    checkAuth().then((isAuth) => {
      setAuthChecking(false);
      if (isAuth) {
        loadContent();
        loadMessages();
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
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Could not save changes.');
      }
      setNotice('Changes saved. Your live site will reflect the updated content.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setSaving(false);
      window.setTimeout(() => setNotice(''), 5000);
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
        // Update local state and recount
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? (data.message as ContactMessage) : m))
        );

        // Recalculate stats
        setMessagesStats((prev) => {
          const updatedMessages = messages.map((m) =>
            m.id === id ? (data.message as ContactMessage) : m
          );
          let unread = 0;
          let read = 0;
          let replied = 0;
          for (const m of updatedMessages) {
            if (m.status === 'unread') unread++;
            else if (m.status === 'read') read++;
            else if (m.status === 'replied') replied++;
          }
          return { total: updatedMessages.length, unread, read, replied };
        });

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
      setMessagesStats((prev) => {
        const remaining = messages.filter((m) => m.id !== id);
        let unread = 0;
        let read = 0;
        let replied = 0;
        for (const m of remaining) {
          if (m.status === 'unread') unread++;
          else if (m.status === 'read') read++;
          else if (m.status === 'replied') replied++;
        }
        return { total: remaining.length, unread, read, replied };
      });

      return true;
    } catch {
      return false;
    }
  };

  const uploadProjectImage = async (index: number, file: File) => {
    setUploadingIndex(index);
    setNotice('');
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

      update((d) => {
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

  const handleSelectTab = (tabName: string, elementId: string) => {
    setActiveTab(tabName);
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' });
  };

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
          loadContent();
          loadMessages();
        }}
      />
    );
  }

  const isNoticeError =
    notice.includes('required') ||
    notice.includes('Could not') ||
    notice.includes('failed') ||
    notice.includes('expired');

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
              <h1>Good morning, {currentUser}.</h1>
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

          <ToastNotice message={notice} isError={isNoticeError} />

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
            onRefresh={loadMessages}
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
