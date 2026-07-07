import { useState, useRef, useEffect, useCallback } from 'react';
import type { SpinOption } from '../types';
import { ColorPicker } from './ColorPicker';
import { t } from '../i18n';

interface OptionPanelProps {
  options: SpinOption[];
  onAdd: (opt: Omit<SpinOption, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<Omit<SpinOption, 'id'>>) => void;
  onRemove: (id: string) => void;
}

type EditTarget = { id: string; field: 'name' | 'weight' | 'color' } | null;

function fmtPercent(weight: number, total: number): string {
  if (total === 0) return '0.00%';
  return (Math.floor((weight / total) * 10000) / 100).toFixed(2) + '%';
}

export function OptionPanel({ options, onAdd, onUpdate, onRemove }: OptionPanelProps) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editing, setEditing] = useState<EditTarget>(null);
  const totalWeight = options.reduce((s, o) => s + o.weight, 0);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{t('optTitle')}</h2>
        <button className="btn btn-sm btn-primary" onClick={() => setShowAddSheet(true)}>
          {t('optAdd')}
        </button>
      </div>

      {options.length === 0 && !showAddSheet && (
        <div className="empty">{t('optEmpty')}</div>
      )}

      <div className="option-list">
        {options.map((opt) => (
          <OptionRow
            key={opt.id}
            option={opt}
            totalWeight={totalWeight}
            editing={editing}
            onStartEdit={setEditing}
            onEndEdit={() => setEditing(null)}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </div>

      {showAddSheet && (
        <BottomSheet onClose={() => setShowAddSheet(false)}>
          <AddOptionForm
            options={options}
            onSave={(opt) => {
              onAdd(opt);
              setShowAddSheet(false);
            }}
            onCancel={() => setShowAddSheet(false)}
          />
        </BottomSheet>
      )}
    </div>
  );
}

interface OptionRowProps {
  option: SpinOption;
  totalWeight: number;
  editing: EditTarget;
  onStartEdit: (et: EditTarget) => void;
  onEndEdit: () => void;
  onUpdate: (id: string, patch: Partial<Omit<SpinOption, 'id'>>) => void;
  onRemove: (id: string) => void;
}

function OptionRow({ option, totalWeight, editing, onStartEdit, onEndEdit, onUpdate, onRemove }: OptionRowProps) {
  const isEditingThis = editing?.id === option.id;
  const editField = isEditingThis ? editing!.field : null;
  const dotRef = useRef<HTMLSpanElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerBelow, setPickerBelow] = useState(true);

  const handleColorClick = useCallback(() => {
    if (dotRef.current) {
      const rect = dotRef.current.getBoundingClientRect();
      setPickerBelow(rect.bottom + 210 < window.innerHeight);
    }
    onStartEdit({ id: option.id, field: 'color' });
  }, [option.id, onStartEdit]);

  useEffect(() => {
    if (editField !== 'color') return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onEndEdit();
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editField, onEndEdit]);

  return (
    <div className="option-row">
      <span
        ref={dotRef}
        className="color-dot"
        style={{ backgroundColor: option.color }}
        onClick={handleColorClick}
      />

      {editField === 'name' ? (
        <InlineInput
          value={option.name}
          autoFocus
          onSave={(v) => { onUpdate(option.id, { name: v }); onEndEdit(); }}
          onCancel={onEndEdit}
          className="option-name"
        />
      ) : (
        <span className="option-name" onClick={() => onStartEdit({ id: option.id, field: 'name' })}>
          {option.name}
        </span>
      )}

      {editField === 'weight' ? (
        <InlineInput
          value={String(option.weight)}
          autoFocus
          type="number"
          onSave={(v) => {
            const w = Math.max(1, Math.min(10000, Number(v) || 1));
            onUpdate(option.id, { weight: w });
            onEndEdit();
          }}
          onCancel={onEndEdit}
          className="option-weight"
        />
      ) : (
        <span className="option-weight" onClick={() => onStartEdit({ id: option.id, field: 'weight' })}>
          {t('optWeight')} {option.weight}
        </span>
      )}

      <span className="option-percent">
        {fmtPercent(option.weight, totalWeight)}
      </span>

      {editField === 'color' && (
        <div
          ref={pickerRef}
          className={`inline-color-picker${pickerBelow ? ' below' : ' above'}`}
        >
          <ColorPicker
            value={option.color}
            onChange={(c) => { onUpdate(option.id, { color: c }); onEndEdit(); }}
          />
        </div>
      )}

      <button
        className="btn btn-sm btn-danger"
        onClick={() => onRemove(option.id)}
      >
        {t('optDelete')}
      </button>
    </div>
  );
}

interface InlineInputProps {
  value: string;
  autoFocus?: boolean;
  type?: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  className?: string;
}

function InlineInput({ value, autoFocus, type, onSave, onCancel, className }: InlineInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  return (
    <input
      ref={ref}
      className={`inline-input ${className ?? ''}`}
      type={type ?? 'text'}
      defaultValue={value}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSave(e.currentTarget.value);
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={(e) => onSave(e.target.value)}
    />
  );
}

interface AddOptionFormProps {
  options: SpinOption[];
  onSave: (opt: Omit<SpinOption, 'id'>) => void;
  onCancel: () => void;
}

function AddOptionForm({ options, onSave, onCancel }: AddOptionFormProps) {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState(10);
  const [color, setColor] = useState('#FF6B6B');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError(t('optErrName')); return; }
    if (options.some((o) => o.name === trimmed)) { setError(t('optErrDup')); return; }
    if (weight < 1 || weight > 10000) { setError(t('optErrWeight')); return; }
    setError('');
    onSave({ name: trimmed, weight: Math.round(weight), color });
  };

  return (
    <div className="add-form">
      <h3 className="add-title">{t('addTitle')}</h3>
      <div className="form-field">
        <label>{t('optName')}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('optNamePlaceholder')} maxLength={20} autoFocus />
      </div>
      <div className="form-field">
        <label>{t('optWeightRange')}</label>
        <input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} min={1} max={10000} />
      </div>
      <div className="form-field">
        <label>{t('optColor')}</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSubmit}>{t('addConfirm')}</button>
        <button className="btn btn-ghost" onClick={onCancel}>{t('optCancel')}</button>
      </div>
    </div>
  );
}

interface BottomSheetProps {
  children: React.ReactNode;
  onClose: () => void;
}

function BottomSheet({ children, onClose }: BottomSheetProps) {
  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        {children}
      </div>
    </>
  );
}
