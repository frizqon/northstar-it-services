import type { JSX } from 'preact';
import { StatusDot } from '../ui/StatusDot';

export const ADMIN_NAV_ITEMS = [
  { name: 'Overview', icon: '◫', id: 'overview' },
  { name: 'Hero', icon: '✳', id: 'hero' },
  { name: 'Services', icon: '◈', id: 'services' },
  { name: 'Projects', icon: '▧', id: 'projects' },
  { name: 'About', icon: '◎', id: 'about' },
  { name: 'Contact & SEO', icon: '⚙', id: 'contact-seo' }
] as const;

interface AdminSidebarProps {
  activeTab: string;
  onSelectTab: (tabName: string, elementId: string) => void;
}

export function AdminSidebar({ activeTab, onSelectTab }: AdminSidebarProps): JSX.Element {
  return (
    <aside class="admin-sidebar">
      <a class="admin-brand" href="/">
        <span class="brand-mark" aria-hidden="true">✳</span>
        <span>
          NORTHSTAR<small>CONTENT STUDIO</small>
        </span>
      </a>

      <div class="sidebar-label">WORKSPACE</div>

      <nav>
        {ADMIN_NAV_ITEMS.map((item) => (
          <button
            key={item.name}
            type="button"
            class={activeTab === item.name ? 'active' : ''}
            onClick={() => onSelectTab(item.name, item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.name}
          </button>
        ))}
      </nav>

      <div class="sidebar-bottom">
        <StatusDot /> All systems operational
        <a href="/">↗ View live website</a>
      </div>
    </aside>
  );
}
