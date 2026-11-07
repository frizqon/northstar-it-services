import type { JSX } from 'preact';
import type { SiteContent } from '../../content/default';
import { StatusDot } from '../ui/StatusDot';

interface HeroSectionProps {
  hero: SiteContent['hero'];
  email: string;
}

export function HeroSection({ hero, email }: HeroSectionProps): JSX.Element {
  return (
    <section class="hero wrap" id="top">
      <div class="hero-copy">
        <div class="eyebrow">
          <StatusDot />
          <span class="eyebrow-text">{hero.eyebrow}</span>
          <span class="eyebrow-pill" aria-hidden="true">OPEN FOR ENGAGEMENT</span>
        </div>

        <h1>
          {hero.title}
          <br />
          <span class="hero-highlight">{hero.highlight}</span>
        </h1>

        <p class="hero-description">{hero.description}</p>

        <div class="hero-actions">
          <a class="button button-lime" href={`mailto:${encodeURIComponent(email)}`}>
            {hero.primaryCta}
            <span aria-hidden="true">↗</span>
          </a>
          <a class="button button-ghost" href="#services">
            {hero.secondaryCta}
            <span aria-hidden="true">↓</span>
          </a>
        </div>

        <div class="hero-proof">
          <div class="avatar-stack" aria-hidden="true">
            <i>J</i>
            <i>A</i>
            <i>M</i>
            <b>+</b>
          </div>
          <div class="proof-copy">
            <span>Practical systems engineering.</span>
            <strong>Trusted by ambitious teams across APAC.</strong>
          </div>
          <div class="proof-metrics" aria-hidden="true">
            <span class="metric-chip">99.9% SLA</span>
            <span class="metric-chip">0-Downtime</span>
          </div>
        </div>
      </div>

      <div class="hero-art" aria-label="Northstar systems architecture telemetry">
        <div class="art-glow" />
        <div class="orbit orbit-one" />
        <div class="orbit orbit-two" />
        <div class="art-core">
          <span>NS</span>
          <i aria-hidden="true">✳</i>
        </div>

        <div class="float-card card-top">
          <span class="mini-icon" aria-hidden="true">⌘</span>
          <div>
            <b>Systems operational</b>
            <small>Latency 18ms · Multi-region</small>
          </div>
          <span class="status-dot" aria-hidden="true" />
        </div>

        <div class="float-card card-bottom">
          <span class="mini-bars" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
          <div>
            <b>Engineered for scale</b>
            <small>Resilient · Audited · Cloud-native</small>
          </div>
        </div>

        <span class="art-caption">NORTHSTAR TELEMETRY CORE · REF 2026.04</span>
      </div>

      <div class="hero-bottom" aria-hidden="true">
        <span>SCROLL TO EXPLORE</span>
        <span class="scroll-line" />
        <span>01 / 04</span>
      </div>
    </section>
  );
}
