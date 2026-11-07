export type Service = { title: string; description: string; number: string; tag: string };
export type Project = { name: string; category: string; description: string; result: string; tone: string; imageUrl?: string };
export type SiteContent = {
  brand: string;
  hero: { eyebrow: string; title: string; highlight: string; description: string; primaryCta: string; secondaryCta: string };
  services: Service[];
  projects: Project[];
  about: { title: string; description: string; stat: string; statLabel: string };
  contact: { email: string; location: string; availability: string };
  seo: { title: string; description: string };
};

export const DEFAULT_CONTENT: SiteContent = {
  brand: 'NORTHSTAR',
  hero: {
    eyebrow: 'Independent IT services · Jakarta & beyond',
    title: 'Technology that moves',
    highlight: 'business forward.',
    description: 'We help ambitious teams modernize their systems, protect what matters, and build digital products that make work better.',
    primaryCta: 'Talk to our team',
    secondaryCta: 'Explore our services'
  },
  services: [
    { number: '01', tag: 'MODERNIZE', title: 'Cloud & infrastructure', description: 'Cloud strategy, migration, and managed infrastructure designed for reliability, security, and room to grow.' },
    { number: '02', tag: 'BUILD', title: 'Software & product engineering', description: 'From a focused MVP to enterprise platforms, we turn complex requirements into useful, dependable software.' },
    { number: '03', tag: 'PROTECT', title: 'Cybersecurity & IT support', description: 'Practical security assessments, endpoint protection, and responsive IT support for your people and systems.' }
  ],
  projects: [
    { name: 'A clearer view of operations', category: 'CLOUD TRANSFORMATION', description: 'Unified reporting and a more resilient cloud foundation for a fast-growing logistics team.', result: '42% faster reporting', tone: 'mint', imageUrl: '' },
    { name: 'A better way to serve customers', category: 'DIGITAL PRODUCT', description: 'A streamlined customer portal that brought essential services into one simple experience.', result: '2.4× more self-service', tone: 'blue', imageUrl: '' }
  ],
  about: {
    title: 'Your technology partner, not just another vendor.',
    description: 'Good IT should feel clear, dependable, and aligned with the way your business works. We combine thoughtful engineering with practical advice—so every investment has a purpose.',
    stat: '12+',
    statLabel: 'years solving real-world IT challenges'
  },
  contact: { email: 'hello@northstar.example', location: 'Jakarta, Indonesia · Working across APAC', availability: 'Have a project in mind? Let’s build something great together.' },
  seo: { title: 'Northstar IT Services — Technology that moves business forward', description: 'Cloud, software engineering, cybersecurity and IT support for ambitious businesses in Jakarta and across APAC.' }
};
