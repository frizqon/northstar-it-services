import type { JSX } from 'preact';
import type { SiteContent } from '../../content/default';

interface AboutSectionProps {
  about: SiteContent['about'];
}

export function AboutSection({ about }: AboutSectionProps): JSX.Element {
  return (
    <section class="about section-pad" id="about">
      <div class="wrap about-layout">
        <div class="about-stamp-wrapper">
          <div class="about-stamp" aria-label="Northstar Quality Seal: Built on Trust & Clarity">
            <span class="stamp-top">BUILT ON</span>
            <strong>
              TRUST
              <br />
              & CLARITY
            </strong>
            <i aria-hidden="true">✳</i>
            <small>THE NORTHSTAR WAY · EST. 2014</small>
          </div>
          <div class="stamp-annotation" aria-hidden="true">
            <span>VERIFIED INDEPENDENT CONSULTANCY</span>
          </div>
        </div>

        <div class="about-copy">
          <span class="section-kicker">04 / THE NORTHSTAR STANDARD</span>
          <h2>{about.title}</h2>
          <p>{about.description}</p>

          <div class="about-stats-grid">
            <div class="about-stat-item">
              <strong>{about.stat}</strong>
              <span>{about.statLabel}</span>
            </div>
            <div class="about-stat-item">
              <strong>99.98%</strong>
              <span>historical SLA reliability across managed client nodes</span>
            </div>
            <div class="about-stat-item">
              <strong>&lt; 15m</strong>
              <span>mean critical response time for retained partners</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
