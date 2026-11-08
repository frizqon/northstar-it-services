import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { ContactMessage, ContactMessageStats, MessageStatus } from '../../worker/types';

interface MessagesManagerProps {
  messages: ContactMessage[];
  stats: ContactMessageStats;
  loading: boolean;
  filter: 'all' | MessageStatus;
  hasMore: boolean;
  onFilterChange: (filter: 'all' | MessageStatus) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onUpdateStatus: (id: number, status: MessageStatus, replyNotes?: string | null) => Promise<boolean>;
  onDeleteMessage: (id: number) => Promise<boolean>;
}

export function MessagesManager({
  messages,
  stats,
  loading,
  filter,
  hasMore,
  onFilterChange,
  onLoadMore,
  onRefresh,
  onUpdateStatus,
  onDeleteMessage
}: MessagesManagerProps): JSX.Element {
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [managerNotice, setManagerNotice] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const handleOpenDetail = async (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setReplyText(msg.reply_notes || '');

    // If message is unread, mark it as read upon opening
    if (msg.status === 'unread') {
      try {
        const ok = await onUpdateStatus(msg.id, 'read');
        if (!ok) return;
        const now = new Date().toISOString();
        setSelectedMessage((prev) =>
          prev && prev.id === msg.id
            ? { ...prev, status: 'read', read_at: prev.read_at || now }
            : prev
        );
      } catch {
        // Silent catch on read transition
      }
    }
  };

  const handleCloseDetail = () => {
    setSelectedMessage(null);
    setReplyText('');
  };

  useEffect(() => {
    if (!selectedMessage) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedMessage(null);
        setReplyText('');
        return;
      }

      if (event.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [selectedMessage?.id]);

  const handleQuickStatusChange = async (msg: ContactMessage, newStatus: MessageStatus) => {
    setActionInProgress(true);
    try {
      const ok = await onUpdateStatus(msg.id, newStatus);
      if (ok) {
        setManagerNotice(`Message marked as ${newStatus}`);
        const now = new Date().toISOString();
        if (selectedMessage && selectedMessage.id === msg.id) {
          setSelectedMessage((prev) =>
            prev
              ? {
                  ...prev,
                  status: newStatus,
                  read_at:
                    newStatus === 'read'
                      ? prev.read_at || now
                      : newStatus === 'unread'
                      ? null
                      : prev.read_at
                }
              : null
          );
        }
      }
    } finally {
      setActionInProgress(false);
      setTimeout(() => setManagerNotice(''), 3000);
    }
  };

  const handleReplyViaEmail = async () => {
    if (!selectedMessage) return;

    setActionInProgress(true);
    try {
      const subject = `Re: Inquiry from ${selectedMessage.name} - Northstar IT Services`;
      const bodyPrefix = replyText.trim()
        ? `${replyText.trim()}\n\n---\nOriginal Message from ${selectedMessage.name}:\n"${selectedMessage.message}"`
        : `Hi ${selectedMessage.name},\n\nThank you for reaching out to Northstar IT Services.\n\n---\nOriginal Message:\n"${selectedMessage.message}"`;

      const mailtoUrl = `mailto:${encodeURIComponent(selectedMessage.email)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(bodyPrefix)}`;

      // Update backend status to 'replied' before opening the mail client.
      const updated = await onUpdateStatus(
        selectedMessage.id,
        'replied',
        replyText.trim() || 'Replied via email client'
      );

      if (!updated) {
        setManagerNotice('Could not update status to replied.');
        return;
      }

      // Open email client
      window.location.href = mailtoUrl;

      setSelectedMessage((prev) =>
        prev
          ? {
              ...prev,
              status: 'replied',
              reply_notes: replyText.trim() || 'Replied via email client',
              replied_at: new Date().toISOString()
            }
          : null
      );

      setManagerNotice('Status marked as replied and email client opened.');
    } catch {
      setManagerNotice('Could not update status to replied.');
    } finally {
      setActionInProgress(false);
      setTimeout(() => setManagerNotice(''), 4000);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this message? This cannot be undone.')) {
      return;
    }

    setActionInProgress(true);
    try {
      const ok = await onDeleteMessage(id);
      if (ok) {
        if (selectedMessage?.id === id) {
          handleCloseDetail();
        }
        setManagerNotice('Message deleted successfully.');
      }
    } finally {
      setActionInProgress(false);
      setTimeout(() => setManagerNotice(''), 3000);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <section class="editor-panel messages-panel" id="messages">
      <div class="panel-heading">
        <div>
          <span class="section-kicker">INBOX & INQUIRIES</span>
          <h2>Client Inquiries & Messages</h2>
          <p>Review contact form submissions, reply directly to clients, and track read/response timestamps.</p>
        </div>
        <div class="panel-actions">
          <button
            type="button"
            class="refresh-button"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh messages list"
          >
            ↻ {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {managerNotice && <div class="notice">{managerNotice}</div>}

      {/* Status Counters / Filter Tabs */}
      <div class="messages-status-tabs">
        <button
          type="button"
          class={`status-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          <span class="tab-label">All Messages</span>
          <span class="tab-badge">{stats.total}</span>
        </button>

        <button
          type="button"
          class={`status-tab ${filter === 'unread' ? 'active' : ''} ${stats.unread > 0 ? 'needs-attention' : ''}`}
          onClick={() => onFilterChange('unread')}
        >
          <span class="tab-label">
            {stats.unread > 0 && <span class="attention-dot" aria-hidden="true" />}
            Unread / Need Response
          </span>
          <span class="tab-badge tab-badge-unread">{stats.unread}</span>
        </button>

        <button
          type="button"
          class={`status-tab ${filter === 'read' ? 'active' : ''}`}
          onClick={() => onFilterChange('read')}
        >
          <span class="tab-label">Read</span>
          <span class="tab-badge">{stats.read}</span>
        </button>

        <button
          type="button"
          class={`status-tab ${filter === 'replied' ? 'active' : ''}`}
          onClick={() => onFilterChange('replied')}
        >
          <span class="tab-label">Replied</span>
          <span class="tab-badge tab-badge-replied">{stats.replied}</span>
        </button>
      </div>

      {/* Messages Table */}
      {messages.length === 0 ? (
        <div class="empty-messages-state">
          <p>
            {filter === 'all'
              ? 'No contact messages yet. When visitors submit the contact form, their inquiries will appear here.'
              : `No messages with status "${filter}".`}
          </p>
        </div>
      ) : (
        <div class="messages-table-wrap">
          <table class="messages-table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Status</th>
                <th style={{ width: '220px' }}>Sender</th>
                <th>Message</th>
                <th style={{ width: '160px' }}>Received</th>
                <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr
                  key={msg.id}
                  class={`message-row ${msg.status === 'unread' ? 'is-unread' : ''}`}
                  onClick={() => handleOpenDetail(msg)}
                  tabIndex={0}
                  aria-label={`View message from ${msg.name}`}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      void handleOpenDetail(msg);
                    }
                  }}
                >
                  <td>
                    <div class="status-col-wrapper">
                      <span class={`msg-badge badge-${msg.status}`}>
                        {msg.status === 'unread' && <span class="badge-dot" aria-hidden="true" />}
                        {msg.status === 'unread'
                          ? 'Unread'
                          : msg.status === 'read'
                          ? 'Read'
                          : 'Replied ✓'}
                      </span>
                      {msg.read_at && (
                        <span class="status-timestamp" title={`Read on ${formatDate(msg.read_at)}`}>
                          Read {formatDate(msg.read_at)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div class="sender-info">
                      <strong class="sender-name">{msg.name}</strong>
                      <span class="sender-email">{msg.email}</span>
                    </div>
                  </td>
                  <td>
                    <div class="msg-snippet">
                      <p>{msg.message}</p>
                    </div>
                  </td>
                  <td>
                    <span class="msg-date">{formatDate(msg.created_at)}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div class="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        class="action-link-btn"
                        onClick={() => handleOpenDetail(msg)}
                      >
                        View & Reply
                      </button>
                      <button
                        type="button"
                        class="action-delete-btn"
                        onClick={() => handleDelete(msg.id)}
                        title="Delete inquiry"
                        aria-label="Delete message"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div class="messages-load-more">
              <button
                type="button"
                class="button button-dark"
                onClick={onLoadMore}
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Load more messages'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail & Reply Modal */}
      {selectedMessage && (
        <div class="msg-modal-backdrop" onClick={handleCloseDetail}>
          <div
            class="msg-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="message-detail-title"
            ref={modalRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div class="msg-modal-header">
              <div>
                <span class="section-kicker">MESSAGE DETAILS</span>
                <h3 id="message-detail-title">{selectedMessage.name}</h3>
                <a
                  href={`mailto:${encodeURIComponent(selectedMessage.email)}`}
                  class="modal-sender-email"
                >
                  {selectedMessage.email} ↗
                </a>
              </div>
              <button
                type="button"
                class="modal-close-btn"
                onClick={handleCloseDetail}
                aria-label="Close message details"
              >
                ✕
              </button>
            </div>

            <div class="msg-modal-body">
              <div class="modal-meta-row">
                <div class="modal-meta-dates">
                  <div>
                    <span class="meta-label">Received:</span>
                    <strong>{formatDate(selectedMessage.created_at)}</strong>
                  </div>
                  {selectedMessage.read_at && (
                    <div>
                      <span class="meta-label">Read at:</span>
                      <strong class="text-read-highlight">{formatDate(selectedMessage.read_at)}</strong>
                    </div>
                  )}
                  {selectedMessage.replied_at && (
                    <div>
                      <span class="meta-label">Replied at:</span>
                      <strong class="text-replied-highlight">{formatDate(selectedMessage.replied_at)}</strong>
                    </div>
                  )}
                </div>
                <div class="status-toggle-group">
                  <span class="meta-label">Status:</span>
                  <div class="status-button-pills">
                    <button
                      type="button"
                      class={`status-pill ${selectedMessage.status === 'unread' ? 'active unread' : ''}`}
                      disabled={actionInProgress}
                      onClick={() => handleQuickStatusChange(selectedMessage, 'unread')}
                    >
                      Unread
                    </button>
                    <button
                      type="button"
                      class={`status-pill ${selectedMessage.status === 'read' ? 'active read' : ''}`}
                      disabled={actionInProgress}
                      onClick={() => handleQuickStatusChange(selectedMessage, 'read')}
                    >
                      Read
                    </button>
                    <button
                      type="button"
                      class={`status-pill ${selectedMessage.status === 'replied' ? 'active replied' : ''}`}
                      disabled={actionInProgress}
                      onClick={() => handleQuickStatusChange(selectedMessage, 'replied')}
                    >
                      Replied
                    </button>
                  </div>
                </div>
              </div>

              {selectedMessage.read_at && selectedMessage.status === 'read' && (
                <div class="read-notice-box">
                  <span class="badge-dot dot-read" aria-hidden="true" />
                  <div>
                    <strong>Message was read on {formatDate(selectedMessage.read_at)}</strong>
                  </div>
                </div>
              )}

              {selectedMessage.status === 'replied' && selectedMessage.replied_at && (
                <div class="replied-notice-box">
                  <span class="badge-dot dot-replied" aria-hidden="true" />
                  <div>
                    <strong>Replied on {formatDate(selectedMessage.replied_at)}</strong>
                    {selectedMessage.reply_notes && (
                      <p class="replied-notes-text">Notes: {selectedMessage.reply_notes}</p>
                    )}
                  </div>
                </div>
              )}

              <div class="msg-full-content">
                <span class="meta-label">Inquiry Content:</span>
                <div class="msg-text-box">{selectedMessage.message}</div>
              </div>

              <div class="reply-composer-section">
                <span class="meta-label">Reply via Email:</span>
                <p class="reply-caption">
                  Draft your reply notes or response below. Clicking "Send via Email Client" will launch your
                  default mail app pre-filled with the recipient and subject, and mark this inquiry as Replied.
                </p>

                <textarea
                  class="reply-textarea"
                  rows={4}
                  placeholder="Type your response or internal notes here…"
                  value={replyText}
                  onInput={(e) => setReplyText((e.target as HTMLTextAreaElement).value)}
                  disabled={actionInProgress}
                />

                <div class="reply-action-buttons">
                  <button
                    type="button"
                    class="button button-lime reply-send-btn"
                    onClick={handleReplyViaEmail}
                    disabled={actionInProgress}
                  >
                    Open Mail Client & Mark Replied <span aria-hidden="true">↗</span>
                  </button>

                  {selectedMessage.status !== 'replied' && (
                    <button
                      type="button"
                      class="button button-dark"
                      onClick={() => handleQuickStatusChange(selectedMessage, 'replied')}
                      disabled={actionInProgress}
                    >
                      Mark as Replied Only
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
