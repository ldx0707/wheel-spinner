import { useState, useEffect, useCallback } from 'react';
import type { WheelData, SpinOption, SpinHistoryEntry, WheelSettings } from '../types';

const WHEELS_KEY = 'wheel_wheels';
const ACTIVE_KEY = 'wheel_activeId';

const DEFAULT_OPTIONS: SpinOption[] = [
  { id: 'd1', name: '旅行', weight: 30, color: '#FF6B6B' },
  { id: 'd2', name: '读书', weight: 25, color: '#4ECDC4' },
  { id: 'd3', name: '健身', weight: 20, color: '#45B7D1' },
  { id: 'd4', name: '美食', weight: 15, color: '#96CEB4' },
  { id: 'd5', name: '电影', weight: 10, color: '#FFD93D' },
];

const DEFAULT_SETTINGS: WheelSettings = {
  noRepeat: false,
  boostFactor: 0.08,
  showWeights: false,
  showPercentages: false,
};

let idCounter = Date.now();
function nextId(): string {
  return (++idCounter).toString(36) + Math.random().toString(36).slice(2, 6);
}

function makeDefaultWheel(name: string): WheelData {
  const opts = DEFAULT_OPTIONS.map((o) => ({ ...o, id: nextId() }));
  return {
    id: nextId(),
    name,
    options: opts,
    history: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function migrateFromOldKeys(): WheelData[] | null {
  try {
    const rawOpts = localStorage.getItem('wheel_options');
    const rawHist = localStorage.getItem('wheel_history');
    const rawSettings = localStorage.getItem('wheel_settings');
    if (!rawOpts && !rawHist && !rawSettings) return null;
    const options: SpinOption[] = rawOpts ? JSON.parse(rawOpts) : DEFAULT_OPTIONS;
    const history: SpinHistoryEntry[] = rawHist ? JSON.parse(rawHist) : [];
    const oldSettings = rawSettings ? JSON.parse(rawSettings) : {};
    const settings: WheelSettings = {
      noRepeat: oldSettings.noRepeat ?? false,
      boostFactor: oldSettings.boostFactor ?? 0.08,
      showWeights: false,
      showPercentages: false,
    };
    const wheel: WheelData = {
      id: nextId(),
      name: 'My Wheel',
      options,
      history,
      settings,
    };
    localStorage.removeItem('wheel_options');
    localStorage.removeItem('wheel_history');
    localStorage.removeItem('wheel_settings');
    return [wheel];
  } catch {
    return null;
  }
}

function loadWheels(): WheelData[] {
  try {
    const raw = localStorage.getItem(WHEELS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* */ }
  const migrated = migrateFromOldKeys();
  if (migrated) {
    saveWheels(migrated);
    return migrated;
  }
  const def = [makeDefaultWheel('My Wheel')];
  saveWheels(def);
  return def;
}

function saveWheels(wheels: WheelData[]) {
  localStorage.setItem(WHEELS_KEY, JSON.stringify(wheels));
}

export function useWheels() {
  const [wheels, setWheels] = useState<WheelData[]>(loadWheels);
  const [activeId, setActiveId] = useState<string>(() => {
    const saved = localStorage.getItem(ACTIVE_KEY);
    const list = wheels.length > 0 ? wheels : loadWheels();
    if (saved && list.some((w) => w.id === saved)) return saved;
    return list[0]?.id ?? '';
  });

  useEffect(() => {
    saveWheels(wheels);
  }, [wheels]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  const activeWheel = wheels.find((w) => w.id === activeId) ?? wheels[0];

  const updateWheel = useCallback((id: string, patch: Partial<WheelData>) => {
    setWheels((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...patch } as WheelData : w))
    );
  }, []);

  const addWheel = useCallback(
    (name: string) => {
      const w = makeDefaultWheel(name);
      setWheels((prev) => [...prev, w]);
      setActiveId(w.id);
      return w;
    },
    []
  );

  const removeWheel = useCallback(
    (id: string) => {
      setWheels((prev) => {
        const next = prev.filter((w) => w.id !== id);
        if (next.length === 0) {
          const def = makeDefaultWheel('My Wheel');
          setActiveId(def.id);
          return [def];
        }
        if (id === activeId) setActiveId(next[0].id);
        return next;
      });
    },
    [activeId]
  );

  const switchWheel = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  return {
    wheels,
    activeId,
    activeWheel: activeWheel ?? wheels[0],
    updateWheel,
    addWheel,
    removeWheel,
    switchWheel,
  };
}
