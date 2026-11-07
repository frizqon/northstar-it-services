import type { JSX } from 'preact';
import type { Project } from '../../../content/default';
import { InputField } from '../../ui/InputField';

interface ProjectsEditorProps {
  projects: Project[];
  uploadingIndex: number | null;
  onUpdateProject: (index: number, key: keyof Project, value: string) => void;
  onRemoveProject: (index: number) => void;
  onAddProject: () => void;
  onUploadImage: (index: number, file: File) => void;
}

export function ProjectsEditor({
  projects,
  uploadingIndex,
  onUpdateProject,
  onRemoveProject,
  onAddProject,
  onUploadImage
}: ProjectsEditorProps): JSX.Element {
  return (
    <section class="editor-panel" id="projects">
      <div class="panel-heading">
        <div>
          <span class="section-kicker">03 / PROOF OF IMPACT</span>
          <h2>Selected projects</h2>
          <p>Showcase outcomes and the work behind them.</p>
        </div>
        <span class="panel-icon" aria-hidden="true">▧</span>
      </div>

      {projects.map((project, i) => (
        <div class="repeat-card" key={`project-${project.name}-${i}`}>
          <div class="repeat-title">
            <span class="repeat-number">0{i + 1}</span>
            <strong>Case study {i + 1}</strong>
            <button
              type="button"
              class="remove-button"
              onClick={() => onRemoveProject(i)}
            >
              Remove
            </button>
          </div>

          <div class="field-grid">
            <InputField
              label="Project title"
              value={project.name}
              onValueChange={(v) => onUpdateProject(i, 'name', v)}
            />
            <InputField
              label="Category"
              value={project.category}
              onValueChange={(v) => onUpdateProject(i, 'category', v)}
            />
            <InputField
              label="Summary"
              value={project.description}
              multiline={true}
              rows={3}
              onValueChange={(v) => onUpdateProject(i, 'description', v)}
            />
            <InputField
              label="Key result"
              value={project.result}
              onValueChange={(v) => onUpdateProject(i, 'result', v)}
            />

            <label class="field">
              <span>Project image · JPEG, PNG, WebP or AVIF · max 8 MB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={uploadingIndex === i}
                onChange={(e) => {
                  const file = (e.currentTarget as HTMLInputElement).files?.[0];
                  if (file) {
                    onUploadImage(i, file);
                  }
                }}
              />
              {uploadingIndex === i && <small class="upload-hint">Uploading securely…</small>}
            </label>

            {project.imageUrl && (
              <div class="uploaded-preview">
                <img src={project.imageUrl} alt="Project image preview" />
                <span>Uploaded image ready to publish</span>
                <button
                  type="button"
                  class="remove-button"
                  onClick={() => onUpdateProject(i, 'imageUrl', '')}
                >
                  Remove image
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        class="add-button"
        onClick={onAddProject}
      >
        ＋ Add a case study
      </button>
    </section>
  );
}
