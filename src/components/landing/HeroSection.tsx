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
          {hero.eyebrow}
        </div>
        <h1>
          {hero.title}
          <br />
          <em>{hero.highlight}</em>
        </h1>
        <p class="hero-description">{hero.description}</p>
        <div class="hero-actions">
          <a class="button button-lime" href={`mailto:${encodeURIComponent(email)}`}>
            {hero.primaryCta}
            <span aria-hidden="true">↗</span>
          </a>
          <a class="text-link" href="#services">
            {hero.secondaryCta} <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div class="hero-proof">
          <div class="avatar-stack">
            <i>J</i>
            <i>A</i>
            <i>M</i>
            <b>+</b>
          </div>
          <span>
            Practical expertise.
            <br />
            <strong>People-first delivery.</strong>
          </span>
        </div>
      </div>

      <div class="hero-art" aria-label="Abstract technology illustration">
        <div class="art-glow" />
        <div class="orbit orbit-one" />
        <div class="orbit orbit-two" />
        <div class="art-core">
          <span>NS</span>
          <i aria-hidden="true">✳</i>
        </div>
        <div class="float-card card-top">
          <span class="mini-icon" aria-hidden="true">⌘</span>
          <span>
            <b>Systems online</b>
            <small>Everything in sync</small>
          </span>
          <span class="status-dot" aria-hidden="true" />
        </div>
        <div class="float-card card-bottom">
          <span class="mini-bars" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
          <span>
            <b>Built for what’s next</b>
            <small>Stable · Secure · Scalable</small>
          </span>
        </div>
        <span class="art-caption">TECH THAT WORKS FOR YOU · 01—04</span>
      </div>

      <div class="hero-bottom">
        <span>SCROLL TO EXPLORE</span>
        <span class="scroll-line" />
        <span>01 / 04</span>
      </div>
    </section>
  );
}
