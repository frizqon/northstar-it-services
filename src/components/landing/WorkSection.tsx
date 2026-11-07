import type { JSX } from 'preact';
import type { Project } from '../../content/default';

interface WorkSectionProps {
  projects: Project[];
}

function MockWindowVisual({ category }: { category: string }): JSX.Element {
  return (
    <>
      <div class="visual-window">
        <div class="window-head">
          <i /><i /><i />
          <span>{category.toLowerCase()}</span>
        </div>
        <div class="visual-content">
          <div class="visual-sidebar">
            <b /><b /><b /><b />
          </div>
          <div class="visual-main">
            <div class="visual-label">PERFORMANCE OVERVIEW</div>
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
            <span class="section-kicker">SELECTED IMPACT</span>
            <h2>
              Good work.
              <br />
              <span>Real outcomes.</span>
            </h2>
          </div>
          <p>We measure success by what changes for your team—not by the tools we use.</p>
        </div>

        <div class="project-grid">
          {projects.map((project, i) => (
            <article class={`project-card ${project.tone}`} key={project.name}>
              <div class="project-visual">
                <span class="project-index">0{i + 1}</span>
                {project.imageUrl ? (
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
                <span class="section-kicker">{project.category}</span>
                <h3>{project.name}</h3>
                <p>{project.description}</p>
                <div class="project-result">
                  <span aria-hidden="true">↗</span>
                  {project.result}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
