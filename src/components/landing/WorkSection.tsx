import type { JSX } from 'preact';
import type { Project } from '../../content/default';
import { isSafeImageUrl } from '../../utils/url';

interface WorkSectionProps {
  projects: Project[];
}

function MockWindowVisual({ category }: { category: string }): JSX.Element {
  return (
    <>
      <div class="visual-window" aria-hidden="true">
        <div class="window-head">
          <i /><i /><i />
          <span class="window-tab-label">{category.toLowerCase()} — sys/metrics</span>
          <span class="window-pulse-dot" />
        </div>
        <div class="visual-content">
          <div class="visual-sidebar">
            <b /><b /><b /><b />
          </div>
          <div class="visual-main">
            <div class="visual-label">OBSERVABILITY TELEMETRY</div>
            <div class="visual-chart">
              <i /><i /><i /><i /><i /><i /><i /><i /><i />
            </div>
            <div class="visual-pills">
              <b /><b /><b />
            </div>
          </div>
        </div>
      </div>
      <span class="visual-orb" aria-hidden="true">✳</span>
    </>
  );
}

export function WorkSection({ projects }: WorkSectionProps): JSX.Element {
  return (
    <section class="work section-pad" id="work">
      <div class="wrap">
        <div class="section-heading work-heading">
          <div>
            <span class="section-kicker">03 / PROVEN TRACK RECORD</span>
            <h2>
              Good engineering.
              <br />
              <span>Measurable outcomes.</span>
            </h2>
          </div>
          <p>
            We measure success not by lines of code or architectural hype, but by tangible business stability and performance acceleration.
          </p>
        </div>

        <div class="project-grid">
          {projects.map((project, i) => {
            const hasValidImage = isSafeImageUrl(project.imageUrl);

            return (
              <article class={`project-card ${project.tone}`} key={i}>
                <div class="project-visual">
                  <span class="project-index">CASE REF · 0{i + 1}</span>
                  {hasValidImage ? (
                    <img
                      class="project-real-image"
                      src={project.imageUrl}
                      alt={project.name}
                      loading="lazy"
                    />
                  ) : (
                    <MockWindowVisual category={project.category} />
                  )}
                </div>

                <div class="project-copy">
                  <div class="project-header-meta">
                    <span class="project-category-tag">{project.category}</span>
                    <span class="project-status-dot" title="Delivered & Active" aria-hidden="true" />
                  </div>

                  <h3>{project.name}</h3>
                  <p>{project.description}</p>

                  <div class="project-result">
                    <span class="result-icon" aria-hidden="true">↗</span>
                    <div>
                      <strong class="result-val">{project.result}</strong>
                      <span class="result-sub">Verified delivery outcome</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
