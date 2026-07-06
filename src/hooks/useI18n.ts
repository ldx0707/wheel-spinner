import { useState, useEffect, useCallback } from 'react';
import { getLang, setLang, toggleLang, t } from '../i18n';
import type { Lang } from '../i18n';

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function useI18n() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const toggle = useCallback(() => {
    toggleLang();
    notify();
  }, []);

  return { t, lang: getLang(), toggle } as const;
}

export type { Lang };
