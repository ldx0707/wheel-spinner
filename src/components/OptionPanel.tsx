import { useState } from 'react';
import type { SpinOption } from '../types';
import { ColorPicker } from './ColorPicker';
import { useI18n } from '../hooks/useI18n';

interface OptionPanelProps {
  options: SpinOption[];
  onAdd: (opt: Omit<SpinOption, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<Omit<SpinOption, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function OptionPanel({
  options,
  onAdd,
  onUpdate,
  onRemove,
}: OptionPanelProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{t('optTitle')}</h2>
        <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(true)}>
          {t('optAdd')}
        </button>
      </div>

      {showAdd && (
        <OptionForm
          onSave={(opt) => {
            onAdd(opt);
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {options.length === 0 && !showAdd && (
        <div className="empty">{t('optEmpty')}</div>
      )}

      <div className="option-list">
        {options.map((opt) =>
          editing === opt.id ? (
            <OptionForm
              key={opt.id}
              initial={opt}
              onSave={(patch) => {
                onUpdate(opt.id, patch);
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div key={opt.id} className="option-row">
              <span
                className="color-dot"
                style={{ backgroundColor: opt.color }}
              />
              <span className="option-name">{opt.name}</span>
              <span className="option-weight">{t('optWeight')} {opt.weight}</span>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setEditing(opt.id)}
              >
                {t('optEdit')}
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => onRemove(opt.id)}
              >
                {t('optDelete')}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

interface OptionFormProps {
  initial?: SpinOption;
  onSave: (opt: Omit<SpinOption, 'id'>) => void;
  onCancel: () => void;
}

function OptionForm({ initial, onSave, onCancel }: OptionFormProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? '');
  const [weight, setWeight] = useState(initial?.weight ?? 10);
  const [color, setColor] = useState(initial?.color ?? '#FF6B6B');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('optErrName'));
      return;
    }
    if (weight < 1 || weight > 10000) {
      setError(t('optErrWeight'));
      return;
    }
    setError('');
    onSave({ name: trimmed, weight: Math.round(weight), color });
  };

  return (
    <div className="option-form">
      <div className="form-field">
        <label>{t('optName')}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('optNamePlaceholder')}
          maxLength={20}
          autoFocus
        />
      </div>
      <div className="form-field">
        <label>{t('optWeightRange')}</label>
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          min={1}
          max={10000}
        />
      </div>
      <div className="form-field">
        <label>{t('optColor')}</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSubmit}>
          {t('optSave')}
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>
          {t('optCancel')}
        </button>
      </div>
    </div>
  );
}
