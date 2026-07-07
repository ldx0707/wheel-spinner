import { useState } from 'react';
import { t } from '../i18n';
import type { SpinHistoryEntry } from '../types';

interface HistoryPanelProps {
  paged: SpinHistoryEntry[];
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  onClear: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  const lang = (() => { try { return localStorage.getItem('wheel_lang') || 'zh'; } catch { return 'zh'; } })();
  if (lang === 'en') {
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtPercent(v: number): string {
  return Math.floor(v * 10000) / 100 + '%';
}

export function HistoryPanel({ paged, page, totalPages, onPage, onClear }: HistoryPanelProps) {

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{t('histTitle')}</h2>
        <button className="btn btn-sm btn-danger" onClick={onClear}>{t('histClear')}</button>
      </div>
      {paged.length === 0 ? (
        <div className="empty">{t('histEmpty')}</div>
      ) : (
        <>
          <div className="history-list">
            {paged.map((h) => (
              <div className="history-row" key={h.id}>
                <span className="color-dot" style={{ backgroundColor: h.optionColor }} />
                <span className="history-name">{h.optionName}</span>
                <span className="history-weight">{t('histWeight')}: {h.weight} ({fmtPercent(h.percentage)})</span>
                <span className="history-time">{formatTime(h.timestamp)}</span>
              </div>
            ))}
          </div>
          <div className="pagination">
            <button className="btn btn-sm btn-primary" disabled={page <= 0} onClick={() => onPage(page - 1)}>
              {t('histPrev')}
            </button>
            <span className="page-info">{page + 1} / {totalPages}</span>
            <button className="btn btn-sm btn-primary" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>
              {t('histNext')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
