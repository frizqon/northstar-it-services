import type { JSX } from 'preact';
import { StatCard } from '../ui/StatCard';
import type { ContactMessageStats } from '../../worker/types';

interface StatsOverviewProps {
  servicesCount: number;
  projectsCount: number;
  messagesStats?: ContactMessageStats;
  onNavigateMessages?: () => void;
}

export function StatsOverview({
  servicesCount,
  projectsCount,
  messagesStats,
  onNavigateMessages
}: StatsOverviewProps): JSX.Element {
  const unreadCount = messagesStats?.unread ?? 0;
  const totalCount = messagesStats?.total ?? 0;

  return (
    <section class="stats-row" id="overview">
      <StatCard
        label="CLIENT INBOX"
        value={unreadCount}
        caption={`${unreadCount} need response · ${totalCount} total ↗`}
        href="#messages"
        onClick={(e) => {
          if (onNavigateMessages) {
            e.preventDefault();
            onNavigateMessages();
          }
        }}
      />
      <StatCard
        label="SERVICES"
        value={servicesCount}
        caption="Published on your site"
      />
      <StatCard
        label="CASE STUDIES"
        value={projectsCount}
        caption="Showing real impact"
      />
      <StatCard
        label="WEBSITE STATUS"
        value="Live"
        caption="Open your public website ↗"
        isLive={true}
        href="/"
      />
    </section>
  );
}
