import type { JSX } from 'preact';
import type { Service } from '../../../content/default';
import { InputField } from '../../ui/InputField';

interface ServicesEditorProps {
  services: Service[];
  onUpdateService: (index: number, key: keyof Service, value: string) => void;
  onRemoveService: (index: number) => void;
  onAddService: () => void;
}

export function ServicesEditor({
  services,
  onUpdateService,
  onRemoveService,
  onAddService
}: ServicesEditorProps): JSX.Element {
  return (
    <section class="editor-panel" id="services">
      <div class="panel-heading">
        <div>
          <span class="section-kicker">02 / WHAT YOU OFFER</span>
          <h2>Services</h2>
          <p>Describe the expertise your team brings to clients.</p>
        </div>
        <span class="panel-icon" aria-hidden="true">◈</span>
      </div>

      {services.map((service, i) => (
        <div class="repeat-card" key={`service-${service.number}-${i}`}>
          <div class="repeat-title">
            <span class="repeat-number">{String(i + 1).padStart(2, '0')}</span>
            <strong>Service {i + 1}</strong>
            <button
              type="button"
              class="remove-button"
              onClick={() => onRemoveService(i)}
            >
              Remove
            </button>
          </div>
          <div class="field-grid">
            <InputField
              label="Service name"
              value={service.title}
              onValueChange={(v) => onUpdateService(i, 'title', v)}
            />
            <InputField
              label="Category tag"
              value={service.tag}
              onValueChange={(v) => onUpdateService(i, 'tag', v)}
            />
            <InputField
              label="Short description"
              value={service.description}
              multiline={true}
              rows={3}
              onValueChange={(v) => onUpdateService(i, 'description', v)}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        class="add-button"
        onClick={onAddService}
      >
        ＋ Add a service
      </button>
    </section>
  );
}
