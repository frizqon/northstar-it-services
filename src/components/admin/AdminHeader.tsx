import type { JSX } from 'preact';

interface AdminHeaderProps {
  currentUser: string;
  onLogout: () => void;
}

export function AdminHeader({ currentUser, onLogout }: AdminHeaderProps): JSX.Element {
  const avatarInitials = currentUser.slice(0, 2).toUpperCase();

  return (
    <header class="admin-topbar">
      <div class="crumb">
        Northstar <span>/</span> Content Studio
      </div>
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
    </header>
  );
}
