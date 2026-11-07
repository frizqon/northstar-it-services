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

export function ServicesSection({ services, email }: ServicesSectionProps): JSX.Element {
  return (
    <section class="services section-pad" id="services">
      <div class="wrap">
        <div class="section-heading">
          <div>
            <span class="section-kicker">WHAT WE DO</span>
            <h2>
              Make technology
              <br />
              your advantage.
            </h2>
          </div>
          <p>
            From strategy to ongoing support, we bring the right expertise to your most
            important technology challenges.
          </p>
        </div>

        <div class="service-grid">
          {services.map((service) => (
            <article class="service-card" key={service.number}>
              <div class="service-top">
                <span>{service.number}</span>
                <span class="service-tag">{service.tag}</span>
              </div>
              <div class="service-symbol" aria-hidden="true">
                {getServiceSymbol(service.number)}
              </div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <a
                href={`mailto:${encodeURIComponent(email)}`}
                aria-label={`Ask about ${service.title}`}
                class="arrow-link"
              >
                ↗
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
