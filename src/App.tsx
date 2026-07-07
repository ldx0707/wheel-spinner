import { useState, useRef, useCallback } from "react";
import { Wheel } from "./components/Wheel";
import { OptionPanel } from "./components/OptionPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { WheelDrawer } from "./components/WheelDrawer";
import { useWheels } from "./hooks/useWheels";
import { getLang, toggleLang, t } from "./i18n";
import { selectWeighted } from "./utils/random";
import { playWin, isMuted, toggleMute } from "./utils/sound";
import type { SpinOption, WeightedOption, SpinHistoryEntry } from "./types";
import "./App.css";

type Tab = "wheel" | "options" | "history" | "settings";

const PAGE_SIZE = 10;

let histIdCounter = Date.now();
function nextHistId(): string {
  return (++histIdCounter).toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function App() {
  const [, setI18nTick] = useState(0);
  const lang = getLang();
  const handleToggleLang = () => { toggleLang(); setI18nTick(n => n + 1); };
  const { wheels, activeId, activeWheel, updateWheel, addWheel, removeWheel, switchWheel } = useWheels();

  const [tab, setTab] = useState<Tab>("wheel");
  const [spinning, setSpinning] = useState(false);
  const [spinTargetId, setSpinTargetId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SpinOption | null>(null);
  const [muted, setMuted] = useState(isMuted);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [historyPage, setHistoryPage] = useState(0);

  const boostMapRef = useRef<Map<string, Map<string, number>>>(new Map());
  const optionsRef = useRef(activeWheel.options);
  optionsRef.current = activeWheel.options;
  const lastSelectedRef = useRef<string | null>(null);

  const canSpin = activeWheel.options.length >= 2 && !spinning;

  const updateSettings = useCallback(
    (patch: Partial<typeof activeWheel.settings>) => {
      updateWheel(activeWheel.id, {
        settings: { ...activeWheel.settings, ...patch },
      });
      setHistoryPage(0);
    },
    [activeWheel, updateWheel]
  );

  const addOption = useCallback(
    (opt: Omit<SpinOption, "id">) => {
      const newOpt: SpinOption = { ...opt, id: nextHistId() };
      updateWheel(activeWheel.id, {
        options: [...activeWheel.options, newOpt],
      });
    },
    [activeWheel, updateWheel]
  );

  const updateOption = useCallback(
    (id: string, patch: Partial<Omit<SpinOption, "id">>) => {
      updateWheel(activeWheel.id, {
        options: activeWheel.options.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      });
    },
    [activeWheel, updateWheel]
  );

  const removeOption = useCallback(
    (id: string) => {
      updateWheel(activeWheel.id, {
        options: activeWheel.options.filter((o) => o.id !== id),
      });
    },
    [activeWheel, updateWheel]
  );

  const addHistoryEntry = useCallback(
    (entry: Omit<SpinHistoryEntry, "id">) => {
      const item: SpinHistoryEntry = { ...entry, id: nextHistId() };
      const hist = [item, ...activeWheel.history].slice(0, 500);
      updateWheel(activeWheel.id, { history: hist });
    },
    [activeWheel, updateWheel]
  );

  const clearHistory = useCallback(() => {
    updateWheel(activeWheel.id, { history: [] });
    setHistoryPage(0);
  }, [activeWheel, updateWheel]);

  const handleRenameWheel = useCallback(
    (id: string, name: string) => {
      updateWheel(id, { name });
    },
    [updateWheel]
  );

  const handleSpin = useCallback(() => {
    if (!canSpin) return;
    setSpinning(true);

    const currentOptions = optionsRef.current;
    const wheelBoost = boostMapRef.current.get(activeWheel.id) ?? new Map();

    const weighted: WeightedOption[] = currentOptions.map((o) => ({
      id: o.id,
      weight: o.weight,
      boost: wheelBoost.get(o.id) || 0,
    }));

    const { selectedId, updatedOptions } = selectWeighted(weighted, {
      boostFactor: activeWheel.settings.boostFactor,
      noRepeat: activeWheel.settings.noRepeat,
      lastSelectedId: lastSelectedRef.current,
    });
    lastSelectedRef.current = selectedId;

    const newBoost = new Map(wheelBoost);
    updatedOptions.forEach((o) => newBoost.set(o.id, o.boost));
    boostMapRef.current.set(activeWheel.id, newBoost);

    if (!currentOptions.find((o) => o.id === selectedId)) {
      setSpinning(false);
      return;
    }

    setSelected(null);
    setSpinTargetId(selectedId);
  }, [canSpin, activeWheel]);

  const handleSpinEnd = useCallback(
    (optionId: string) => {
      setSpinning(false);
      setSpinTargetId(null);

      const currentOptions = optionsRef.current;
      const opt = currentOptions.find((o) => o.id === optionId);
      if (opt) {
        setSelected(opt);
        const totalWeight = currentOptions.reduce((s, o) => s + o.weight, 0);
        addHistoryEntry({
          optionName: opt.name,
          optionColor: opt.color,
          weight: opt.weight,
          percentage: totalWeight > 0 ? opt.weight / totalWeight : 0,
          timestamp: Date.now(),
        });
        playWin();
      }
    },
    [addHistoryEntry]
  );

  const handleMute = () => {
    const now = toggleMute();
    setMuted(now);
  };

  const totalPages = Math.max(1, Math.ceil(activeWheel.history.length / PAGE_SIZE));
  const paged = activeWheel.history.slice(
    historyPage * PAGE_SIZE,
    (historyPage + 1) * PAGE_SIZE
  );

  const handleSwitchWheel = useCallback(
    (id: string) => {
      switchWheel(id);
      setHistoryPage(0);
      lastSelectedRef.current = null;
      setSelected(null);
    },
    [switchWheel]
  );

  return (
    <div className="app">
      <header className="app-header">
        <button
          className="btn-icon hamburger-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
        <h1>{activeWheel?.name ?? "Wheel Spinner"}</h1>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            className={`btn-icon mute-btn${muted ? " muted" : ""}`}
            onClick={handleMute}
            aria-label={muted ? t("muteOn") : t("muteOff")}
          >
            {muted ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
          </button>
          <button
            className="btn-icon mute-btn"
            onClick={handleToggleLang}
            aria-label="Language"
            style={{ fontSize: 12, fontWeight: 700, width: 32 }}
          >
            {lang === "zh" ? "EN" : "\u4e2d"}
          </button>
        </div>
      </header>

      <main className="app-main">
        {tab === "wheel" && (
          <div className="wheel-page">
            <Wheel
              options={activeWheel.options}
              spinTargetId={spinTargetId}
              showWeights={activeWheel.settings.showWeights}
              showPercentages={activeWheel.settings.showPercentages}
              onSpinStart={() => {}}
              onSpinEnd={handleSpinEnd}
              onAngleChange={() => {}}
            />

            <div className={`result-area${selected ? " visible" : ""}`}>
              {selected && (
                <>
                  <span className="result-dot" style={{ backgroundColor: selected.color }} />
                  <span className="result-text">
                    {t("resultSelected")}<strong>{selected.name}</strong>
                    <span className="result-weight">{t("resultWeight")} {selected.weight}</span>
                  </span>
                </>
              )}
            </div>

            <button
              className={`spin-btn${spinning ? " spinning" : ""}`}
              disabled={!canSpin}
              onClick={handleSpin}
            >
              {spinning ? t("spinBtnSpinning") : activeWheel.options.length < 2 ? t("spinBtnNeedMore") : t("spinBtnGo")}
            </button>
          </div>
        )}

        {tab === "options" && (
          <OptionPanel
            options={activeWheel.options}
            onAdd={addOption}
            onUpdate={updateOption}
            onRemove={removeOption}
          />
        )}

        {tab === "history" && (
          <HistoryPanel
            paged={paged}
            page={historyPage}
            totalPages={totalPages}
            onPage={setHistoryPage}
            onClear={clearHistory}
          />
        )}

        {tab === "settings" && (
          <SettingsPanel
            settings={activeWheel.settings}
            onNoRepeatChange={(v) => updateSettings({ noRepeat: v })}
            onBoostFactorChange={(v) => updateSettings({ boostFactor: v })}
            onShowWeightsChange={(v) => updateSettings({ showWeights: v })}
            onShowPercentagesChange={(v) => updateSettings({ showPercentages: v })}
          />
        )}
      </main>

      <nav className="tab-bar">
        <button className={`tab-btn${tab === "wheel" ? " active" : ""}`} onClick={() => setTab("wheel")}>
          <WheelIcon />
          <span>{t("tabWheel")}</span>
        </button>
        <button className={`tab-btn${tab === "options" ? " active" : ""}`} onClick={() => setTab("options")}>
          <ListIcon />
          <span>{t("tabOptions")}</span>
        </button>
        <button className={`tab-btn${tab === "history" ? " active" : ""}`} onClick={() => setTab("history")}>
          <ClockIcon />
          <span>{t("tabHistory")}</span>
        </button>
        <button className={`tab-btn${tab === "settings" ? " active" : ""}`} onClick={() => setTab("settings")}>
          <GearIcon />
          <span>{t("tabSettings")}</span>
        </button>
      </nav>

      {drawerOpen && (
        <WheelDrawer
          wheels={wheels}
          activeId={activeId}
          onSwitch={handleSwitchWheel}
          onAdd={addWheel}
          onRemove={removeWheel}
          onRename={handleRenameWheel}
          onClose={() => setDrawerOpen(false)}
        />
      )}
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
