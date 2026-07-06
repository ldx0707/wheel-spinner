import { useState, useRef, useCallback } from 'react';
import { Wheel } from './components/Wheel';
import { OptionPanel } from './components/OptionPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useOptions } from './hooks/useOptions';
import { useHistory } from './hooks/useHistory';
import { useSettings } from './hooks/useSettings';
import { useI18n } from './hooks/useI18n';
import { selectWeighted } from './utils/random';
import { playWin, isMuted, toggleMute } from './utils/sound';
import type { SpinOption, WeightedOption } from './types';
import './App.css';

type Tab = 'wheel' | 'options' | 'history' | 'settings';

export default function App() {
  const { t, lang, toggle: toggleLang } = useI18n();
  const { options, add, update, remove } = useOptions();
  const { paged, page, totalPages, setPage, add: addHistory, clear: clearHistory } = useHistory();

  const { settings, setNoRepeat, setBoostFactor } = useSettings();
  const [tab, setTab] = useState<Tab>('wheel');
  const [spinning, setSpinning] = useState(false);
  const [spinTargetId, setSpinTargetId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SpinOption | null>(null);
  const [muted, setMuted] = useState(isMuted);

  const boostRef = useRef<Map<string, number>>(new Map());
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const lastSelectedRef = useRef<string | null>(null);
  const canSpin = options.length >= 2 && !spinning;

  const handleSpinStart = useCallback(() => {}, []);
  const handleAngleChange = useCallback((_angle: number) => {}, []);

  const handleSpin = useCallback(() => {
    if (!canSpin) return;
    setSpinning(true);

    const currentOptions = optionsRef.current;
    const weighted: WeightedOption[] = currentOptions.map((o) => ({
      id: o.id,
      weight: o.weight,
      boost: boostRef.current.get(o.id) || 0,
    }));

    const { selectedId, updatedOptions } = selectWeighted(weighted, {
      boostFactor: settings.boostFactor,
      noRepeat: settings.noRepeat,
      lastSelectedId: lastSelectedRef.current,
    });
    lastSelectedRef.current = selectedId;
    updatedOptions.forEach((o) => boostRef.current.set(o.id, o.boost));

    if (!currentOptions.find((o) => o.id === selectedId)) {
      setSpinning(false);
      return;
    }

    setSelected(null);
    setSpinTargetId(selectedId);
  }, [canSpin, settings]);

  const handleSpinEnd = useCallback(
    (optionId: string) => {
      setSpinning(false);
      setSpinTargetId(null);

      const currentOptions = optionsRef.current;
      const opt = currentOptions.find((o) => o.id === optionId);
      if (opt) {
        setSelected(opt);
        addHistory({
          optionName: opt.name,
          optionColor: opt.color,
          weight: opt.weight,
          timestamp: Date.now(),
        });
        playWin();
      }
    },
    [addHistory]
  );

  const handleMute = () => {
    const now = toggleMute();
    setMuted(now);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('appTitle')}</h1>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className={`btn-icon mute-btn${muted ? ' muted' : ''}`}
            onClick={handleMute}
            aria-label={muted ? t('muteOn') : t('muteOff')}
          >
            {muted ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
          </button>
          <button
            className="btn-icon mute-btn"
            onClick={toggleLang}
            aria-label="Language"
            style={{ fontSize: 12, fontWeight: 700, width: 32 }}
          >
            {lang === 'zh' ? 'EN' : '中'}
          </button>
        </div>
      </header>

      <main className="app-main">
        {tab === 'wheel' && (
          <div className="wheel-page">
            <Wheel
              options={options}
              spinTargetId={spinTargetId}
              onSpinStart={handleSpinStart}
              onSpinEnd={handleSpinEnd}
              onAngleChange={handleAngleChange}
            />

            <div className={`result-area${selected ? ' visible' : ''}`}>
              {selected && (
                <>
                  <span
                    className="result-dot"
                    style={{ backgroundColor: selected.color }}
                  />
                  <span className="result-text">
                    {t('resultSelected')}<strong>{selected.name}</strong>
                    <span className="result-weight">{t('resultWeight')} {selected.weight}</span>
                  </span>
                </>
              )}
            </div>

            <button
              className={`spin-btn${spinning ? ' spinning' : ''}`}
              disabled={!canSpin}
              onClick={handleSpin}
            >
              {spinning ? t('spinBtnSpinning') : options.length < 2 ? t('spinBtnNeedMore') : t('spinBtnGo')}
            </button>
          </div>
        )}

        {tab === 'options' && (
          <OptionPanel
            options={options}
            onAdd={add}
            onUpdate={update}
            onRemove={remove}
          />
        )}

        {tab === 'history' && (
          <HistoryPanel
            paged={paged}
            page={page}
            totalPages={totalPages}
            onPage={setPage}
            onClear={clearHistory}
          />
        )}

        {tab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onNoRepeatChange={setNoRepeat}
            onBoostFactorChange={setBoostFactor}
          />
        )}
      </main>

      <nav className="tab-bar">
        <button
          className={`tab-btn${tab === 'wheel' ? ' active' : ''}`}
          onClick={() => setTab('wheel')}
        >
          <WheelIcon />
          <span>{t('tabWheel')}</span>
        </button>
        <button
          className={`tab-btn${tab === 'options' ? ' active' : ''}`}
          onClick={() => setTab('options')}
        >
          <ListIcon />
          <span>{t('tabOptions')}</span>
        </button>
        <button
          className={`tab-btn${tab === 'history' ? ' active' : ''}`}
          onClick={() => setTab('history')}
        >
          <ClockIcon />
          <span>{t('tabHistory')}</span>
        </button>
        <button
          className={`tab-btn${tab === 'settings' ? ' active' : ''}`}
          onClick={() => setTab('settings')}
        >
          <GearIcon />
          <span>{t('tabSettings')}</span>
        </button>
      </nav>
    </div>
  );
}

function SpeakerOnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function WheelIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="2" x2="12" y2="12" />
      <line x1="12" y1="12" x2="18" y2="6" />
      <line x1="12" y1="12" x2="6" y2="6" />
      <line x1="12" y1="12" x2="20" y2="14" />
      <line x1="12" y1="12" x2="4" y2="14" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}






