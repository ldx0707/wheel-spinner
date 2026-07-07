import { useState, useRef, useCallback } from 'react';
import type { WheelData } from '../types';
import { t } from '../i18n';

interface WheelDrawerProps {
  wheels: WheelData[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onClose: () => void;
}

export function WheelDrawer({
  wheels,
  activeId,
  onSwitch,
  onAdd,
  onRemove,
  onRename,
  onClose,
}: WheelDrawerProps) {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>{t('wheelListTitle')}</h2>
          <button className="btn btn-sm btn-primary" onClick={() => setShowNewDialog(true)}>
            {t('wheelNew')}
          </button>
        </div>

        <div className="drawer-list">
          {wheels.map((w) => (
            <WheelDrawerItem
              key={w.id}
              wheel={w}
              isActive={w.id === activeId}
              editingId={editingId}
              onSwitch={(id) => { onSwitch(id); onClose(); }}
              onStartEdit={setEditingId}
              onEndEdit={() => setEditingId(null)}
              onRename={onRename}
              onRemove={onRemove}
              canRemove={wheels.length > 1}
            />
          ))}
        </div>
      </div>

      {showNewDialog && (
        <>
          <div className="sheet-overlay" onClick={() => setShowNewDialog(false)} />
          <NewWheelDialog
            onSave={(name) => {
              onAdd(name);
              setShowNewDialog(false);
              onClose();
            }}
            onCancel={() => setShowNewDialog(false)}
          />
        </>
      )}
    </>
  );
}

interface WheelDrawerItemProps {
  wheel: WheelData;
  isActive: boolean;
  editingId: string | null;
  onSwitch: (id: string) => void;
  onStartEdit: (id: string) => void;
  onEndEdit: () => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

function WheelDrawerItem({
  wheel,
  isActive,
  editingId,
  onSwitch,
  onStartEdit,
  onEndEdit,
  onRename,
  onRemove,
  canRemove,
}: WheelDrawerItemProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditing = editingId === wheel.id;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePressStart = useCallback(() => {
    timerRef.current = setTimeout(() => {
      onStartEdit(wheel.id);
    }, 600);
  }, [wheel.id, onStartEdit]);

  return (
    <div className={`drawer-item${isActive ? ' active' : ''}`}>
      <div
        className="drawer-item-main"
        onClick={() => { if (!isEditing) onSwitch(wheel.id); }}
        onMouseDown={handlePressStart}
        onMouseUp={clearTimer}
        onMouseLeave={clearTimer}
        onTouchStart={handlePressStart}
        onTouchEnd={clearTimer}
        onTouchMove={clearTimer}
      >
        <span className="drawer-dot" />
        {isEditing ? (
          <input
            className="drawer-edit-input"
            defaultValue={wheel.name}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = e.currentTarget.value.trim();
                if (v) onRename(wheel.id, v);
                onEndEdit();
              }
              if (e.key === 'Escape') onEndEdit();
            }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v) onRename(wheel.id, v);
              onEndEdit();
            }}
          />
        ) : (
          <span className="drawer-item-name">{wheel.name}</span>
        )}
        <span className="drawer-item-count">{wheel.options.length}</span>
      </div>
      {canRemove && (
        <div className="drawer-item-actions">
          <button
            className="drawer-action-btn btn-sm btn-ghost"
            onClick={() => onStartEdit(wheel.id)}
            title={t('optEdit')}
          >
            ✎
          </button>
          <button
            className="drawer-action-btn btn-sm btn-danger"
            onClick={() => onRemove(wheel.id)}
            title={t('optDelete')}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

interface NewWheelDialogProps {
  onSave: (name: string) => void;
  onCancel: () => void;
}

function NewWheelDialog({ onSave, onCancel }: NewWheelDialogProps) {
  const [name, setName] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <div className="dialog">
      <h3>{t('wheelNewTitle')}</h3>
      <input
        className="dialog-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('wheelNamePlaceholder')}
        maxLength={20}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave}>{t('wheelCreate')}</button>
        <button className="btn btn-ghost" onClick={onCancel}>{t('optCancel')}</button>
      </div>
    </div>
  );
}
