import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '../types';

const STORAGE_KEY = 'wheel_settings';

const DEFAULTS: AppSettings = {
  noRepeat: false,
  boostFactor: 0.08,
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    /* corrupt, use defaults */
  }
  return { ...DEFAULTS };
}

function save(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(load);

  useEffect(() => {
    save(settings);
  }, [settings]);

  const setNoRepeat = useCallback((v: boolean) => {
    setSettings((prev) => ({ ...prev, noRepeat: v }));
  }, []);

  const setBoostFactor = useCallback((v: number) => {
    setSettings((prev) => ({ ...prev, boostFactor: v }));
  }, []);

  return { settings, setNoRepeat, setBoostFactor };
}
