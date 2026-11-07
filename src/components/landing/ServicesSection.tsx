import type { JSX } from 'preact';
import type { Service } from '../../content/default';

interface ServicesSectionProps {
  services: Service[];
  email: string;
}

function getServiceSymbol(number: string): string {
  if (number === '01') return '◈';
  if (number === '02') return '⌘';
  return '⟡';
}

function getServiceDeliverables(number: string): string[] {
  if (number === '01') {
    return ['Cloud Architecture (AWS/GCP)', 'Kubernetes & Containerization', 'Zero-Downtime Migrations', 'Terraform & CI/CD Pipelines'];
  }
  if (number === '02') {
    return ['Full-Stack Web & Mobile Engineering', 'High-Throughput Edge APIs', 'Legacy Modernization', 'Custom Enterprise Portals'];
  }
  return ['Security Posture Assessments', 'Endpoint & Infrastructure Hardening', 'Compliance Prep (ISO/SOC2)', 'Proactive 24/7 Incident Response'];
}

export function ServicesSection({ services, email }: ServicesSectionProps): JSX.Element {
  return (
    <section class="services section-pad" id="services">
      <div class="wrap">
        <div class="section-heading">
          <div>
            <span class="section-kicker">02 / CORE CAPABILITIES</span>
            <h2>
              Engineering that makes
              <br />
              technology your advantage.
            </h2>
          </div>
          <p>
            From architecture design to continuous delivery and defensive security, we build systems that remain fast, dependable, and easy to maintain.
          </p>
        </div>

        <div class="service-grid">
          {services.map((service, index) => {
            const deliverables = getServiceDeliverables(service.number);

            return (
              <article class="service-card" key={index}>
                <div class="service-top">
                  <span class="service-number">{service.number}</span>
                  <span class="service-tag">{service.tag}</span>
                </div>

                <div class="service-symbol" aria-hidden="true">
                  {getServiceSymbol(service.number)}
                </div>

                <h3>{service.title}</h3>
                <p>{service.description}</p>

                <ul class="service-deliverables" aria-label={`Deliverables for ${service.title}`}>
                  {deliverables.map((item) => (
                    <li key={item}>
                      <span class="bullet-dash" aria-hidden="true">—</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={`mailto:${encodeURIComponent(email)}?subject=Inquiry%20regarding%20${encodeURIComponent(service.title)}`}
                  aria-label={`Ask about ${service.title}`}
                  class="arrow-link"
                >
                  <span class="arrow-text">Consult team</span>
                  <span class="arrow-glyph" aria-hidden="true">↗</span>
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
