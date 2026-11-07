import type { JSX } from 'preact';
import { ThemeToggle } from '../ui/ThemeToggle';

interface AdminHeaderProps {
  currentUser: string;
  onLogout: () => void;
  unreadCount?: number;
  onNavigateMessages?: () => void;
}

export function AdminHeader({
  currentUser,
  onLogout,
  unreadCount = 0,
  onNavigateMessages
}: AdminHeaderProps): JSX.Element {
  const avatarInitials = currentUser.slice(0, 2).toUpperCase();

  return (
    <header class="admin-topbar">
      <div class="crumb">
        Northstar <span>/</span> Content Studio
      </div>

      <div class="admin-topbar-right">
        <ThemeToggle compact className="admin-theme-switch" />

        {unreadCount > 0 && (
          <button
            type="button"
            class="header-notif-btn"
            onClick={onNavigateMessages}
            title={`${unreadCount} inquiry message(s) need response`}
          >
            <span class="notif-icon" aria-hidden="true">✉</span>
            <span class="notif-pill">{unreadCount} need response</span>
          </button>
        )}

        <div class="admin-user">
          <span class="user-avatar" aria-hidden="true">{avatarInitials}</span>
          <div>
            <span>{currentUser}</span>
            <small>Administrator</small>
          </div>
          <button
            type="button"
            class="logout-button"
            onClick={onLogout}
            title="Sign out of Content Studio"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
