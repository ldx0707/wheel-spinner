import type { SpinHistoryEntry } from '../types';
import { useI18n } from '../hooks/useI18n';

interface HistoryPanelProps {
  paged: SpinHistoryEntry[];
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  onClear: () => void;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function HistoryPanel({
  paged,
  page,
  totalPages,
  onPage,
  onClear,
}: HistoryPanelProps) {
  const { t } = useI18n();

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{t('histTitle')}</h2>
        {paged.length > 0 && (
          <button className="btn btn-sm btn-danger" onClick={onClear}>
            {t('histClear')}
          </button>
        )}
      </div>

      {paged.length === 0 && (
        <div className="empty">{t('histEmpty')}</div>
      )}

      <div className="history-list">
        {paged.map((h) => (
          <div key={h.id} className="history-row">
            <span
              className="color-dot"
              style={{ backgroundColor: h.optionColor }}
            />
            <span className="history-name">{h.optionName}</span>
            <span className="history-weight">{t('histWeight')} {h.weight}</span>
            <span className="history-time">{fmtTime(h.timestamp)}</span>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-sm btn-ghost"
            disabled={page === 0}
            onClick={() => onPage(page - 1)}
          >
            {t('histPrev')}
          </button>
          <span className="page-info">
            {page + 1} / {totalPages}
          </span>
          <button
            className="btn btn-sm btn-ghost"
            disabled={page >= totalPages - 1}
            onClick={() => onPage(page + 1)}
          >
            {t('histNext')}
          </button>
        </div>
      )}
    </div>
  );
}
