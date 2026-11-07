import type { JSX } from 'preact';
import { StatCard } from '../ui/StatCard';

interface StatsOverviewProps {
  servicesCount: number;
  projectsCount: number;
}

export function StatsOverview({ servicesCount, projectsCount }: StatsOverviewProps): JSX.Element {
  return (
    <section class="stats-row" id="overview">
      <StatCard
        label="CONTENT AREAS"
        value="06"
        caption="Ready to customize"
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
