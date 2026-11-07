import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_CONTENT, type SiteContent } from '../content/default';

export default function LandingPage() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  useEffect(() => {
    fetch('/api/content', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => data && setContent(data)).catch(() => {});
  }, []);
  useEffect(() => {
    document.title = content.seo.title;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute('content', content.seo.description);
  }, [content.seo.title, content.seo.description]);
  const c = content;
  return (
    <main class="site-shell">
      <nav class="site-nav wrap">
        <a class="brand" href="#top" aria-label={`${c.brand} home`}><span class="brand-mark">✳</span>{c.brand}</a>
        <div class="nav-links"><a href="#services">Services</a><a href="#work">Our work</a><a href="#about">About</a></div>
        <a class="nav-cta" href={`mailto:${c.contact.email}`}>Let’s talk <span>↗</span></a>
      </nav>

      <section class="hero wrap" id="top">
        <div class="hero-copy">
          <div class="eyebrow"><span class="status-dot" />{c.hero.eyebrow}</div>
          <h1>{c.hero.title}<br /><em>{c.hero.highlight}</em></h1>
          <p class="hero-description">{c.hero.description}</p>
          <div class="hero-actions"><a class="button button-lime" href={`mailto:${c.contact.email}`}>{c.hero.primaryCta}<span>↗</span></a><a class="text-link" href="#services">{c.hero.secondaryCta} <span>↓</span></a></div>
          <div class="hero-proof"><div class="avatar-stack"><i>J</i><i>A</i><i>M</i><b>+</b></div><span>Practical expertise.<br /><strong>People-first delivery.</strong></span></div>
        </div>
        <div class="hero-art" aria-label="Abstract technology illustration">
          <div class="art-glow" />
          <div class="orbit orbit-one" /><div class="orbit orbit-two" />
          <div class="art-core"><span>NS</span><i>✳</i></div>
          <div class="float-card card-top"><span class="mini-icon">⌘</span><span><b>Systems online</b><small>Everything in sync</small></span><i class="status-dot" /></div>
          <div class="float-card card-bottom"><span class="mini-bars"><i /><i /><i /><i /><i /></span><span><b>Built for what’s next</b><small>Stable · Secure · Scalable</small></span></div>
          <span class="art-caption">TECH THAT WORKS FOR YOU · 01—04</span>
        </div>
        <div class="hero-bottom"><span>SCROLL TO EXPLORE</span><span class="scroll-line" /><span>01 / 04</span></div>
      </section>

      <section class="services section-pad" id="services">
        <div class="wrap">
          <div class="section-heading"><div><span class="section-kicker">WHAT WE DO</span><h2>Make technology<br />your advantage.</h2></div><p>From strategy to ongoing support, we bring the right expertise to your most important technology challenges.</p></div>
          <div class="service-grid">
            {c.services.map((service) => <article class="service-card" key={service.number}><div class="service-top"><span>{service.number}</span><span class="service-tag">{service.tag}</span></div><div class="service-symbol">{service.number === '01' ? '◈' : service.number === '02' ? '⌘' : '⟡'}</div><h3>{service.title}</h3><p>{service.description}</p><a href={`mailto:${c.contact.email}`} aria-label={`Ask about ${service.title}`} class="arrow-link">↗</a></article>)}
          </div>
        </div>
      </section>

      <section class="work section-pad" id="work">
        <div class="wrap">
          <div class="section-heading work-heading"><div><span class="section-kicker">SELECTED IMPACT</span><h2>Good work.<br /><span>Real outcomes.</span></h2></div><p>We measure success by what changes for your team—not by the tools we use.</p></div>
          <div class="project-grid">{c.projects.map((project, i) => <article class={`project-card ${project.tone}`} key={project.name}><div class="project-visual"><span class="project-index">0{i + 1}</span>{project.imageUrl ? <img class="project-real-image" src={project.imageUrl} alt={project.name} loading="lazy" /> : <><div class="visual-window"><div class="window-head"><i /><i /><i /><span>{project.category.toLowerCase()}</span></div><div class="visual-content"><div class="visual-sidebar"><b /><b /><b /><b /></div><div class="visual-main"><div class="visual-label">PERFORMANCE OVERVIEW</div><div class="visual-chart"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div class="visual-pills"><b /><b /><b /></div></div></div></div><span class="visual-orb">✳</span></>}</div><div class="project-copy"><span class="section-kicker">{project.category}</span><h3>{project.name}</h3><p>{project.description}</p><div class="project-result"><span>↗</span>{project.result}</div></div></article>)}</div>
        </div>
      </section>

      <section class="about section-pad" id="about"><div class="wrap about-layout"><div class="about-stamp"><span>BUILT ON</span><strong>TRUST<br />& CLARITY</strong><i>✳</i><small>THE NORTHSTAR WAY</small></div><div class="about-copy"><span class="section-kicker">A PARTNER IN YOUR CORNER</span><h2>{c.about.title}</h2><p>{c.about.description}</p><div class="about-stat"><strong>{c.about.stat}</strong><span>{c.about.statLabel}</span></div></div></div></section>

      <section class="contact section-pad" id="contact"><div class="wrap contact-inner"><span class="section-kicker">LET’S GET STARTED</span><h2>Big plans?<br /><em>Let’s talk tech.</em></h2><p>{c.contact.availability}</p><a class="button button-lime" href={`mailto:${c.contact.email}`}>Start a conversation <span>↗</span></a><div class="contact-meta"><a href={`mailto:${c.contact.email}`}>{c.contact.email}</a><span>{c.contact.location}</span></div><div class="contact-spark">✳</div></div></section>
      <footer class="site-footer wrap"><a class="brand" href="#top"><span class="brand-mark">✳</span>{c.brand}</a><span>© {new Date().getFullYear()} {c.brand}. Thoughtful technology, built together.</span><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
