import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_CONTENT, type SiteContent } from '../content/default';
import { Navbar } from './landing/Navbar';
import { HeroSection } from './landing/HeroSection';
import { ServicesSection } from './landing/ServicesSection';
import { WorkSection } from './landing/WorkSection';
import { AboutSection } from './landing/AboutSection';
import { ContactSection } from './landing/ContactSection';
import { Footer } from './landing/Footer';

export default function LandingPage() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);

  useEffect(() => {
    fetch('/api/content', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setContent(data);
      })
      .catch((err) => {
        console.warn('Failed to load dynamic content, using defaults', err);
      });
  }, []);

  useEffect(() => {
    document.title = content.seo.title;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute('content', content.seo.description);
  }, [content.seo.title, content.seo.description]);

  return (
    <main class="site-shell">
      <Navbar brand={content.brand} email={content.contact.email} />
      <HeroSection hero={content.hero} email={content.contact.email} />
      <ServicesSection services={content.services} email={content.contact.email} />
      <WorkSection projects={content.projects} />
      <AboutSection about={content.about} />
      <ContactSection contact={content.contact} />
      <Footer brand={content.brand} />
    </main>
  );
}
