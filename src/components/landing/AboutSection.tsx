import type { JSX } from 'preact';
import type { SiteContent } from '../../content/default';

interface AboutSectionProps {
  about: SiteContent['about'];
}

export function AboutSection({ about }: AboutSectionProps): JSX.Element {
  return (
    <section class="about section-pad" id="about">
      <div class="wrap about-layout">
        <div class="about-stamp">
          <span>BUILT ON</span>
          <strong>
            TRUST
            <br />
            & CLARITY
          </strong>
          <i aria-hidden="true">✳</i>
          <small>THE NORTHSTAR WAY</small>
        </div>

        <div class="about-copy">
          <span class="section-kicker">A PARTNER IN YOUR CORNER</span>
          <h2>{about.title}</h2>
          <p>{about.description}</p>
          <div class="about-stat">
            <strong>{about.stat}</strong>
            <span>{about.statLabel}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
