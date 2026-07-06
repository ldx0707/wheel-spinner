import { useState, useEffect, useCallback } from 'react';
import type { SpinOption } from '../types';

const STORAGE_KEY = 'wheel_options';

const DEFAULT_OPTIONS: SpinOption[] = [
  { id: 'd1', name: '旅行', weight: 30, color: '#FF6B6B' },
  { id: 'd2', name: '读书', weight: 25, color: '#4ECDC4' },
  { id: 'd3', name: '健身', weight: 20, color: '#45B7D1' },
  { id: 'd4', name: '美食', weight: 15, color: '#96CEB4' },
  { id: 'd5', name: '电影', weight: 10, color: '#FFD93D' },
];

function load(): SpinOption[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* corrupt data, fall through */
  }
  save(DEFAULT_OPTIONS);
  return DEFAULT_OPTIONS;
}

function save(opts: SpinOption[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(opts));
}

let idCounter = Date.now();
function nextId(): string {
  return (++idCounter).toString(36) + Math.random().toString(36).slice(2, 6);
}

export function useOptions() {
  const [options, setOptions] = useState<SpinOption[]>(load);

  useEffect(() => {
    save(options);
  }, [options]);

  const add = useCallback(
    (opt: Omit<SpinOption, 'id'>) => {
      setOptions((prev) => [...prev, { ...opt, id: nextId() }]);
    },
    []
  );

  const update = useCallback(
    (id: string, patch: Partial<Omit<SpinOption, 'id'>>) => {
      setOptions((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
      );
    },
    []
  );

  const remove = useCallback((id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const reset = useCallback(() => {
    setOptions(DEFAULT_OPTIONS);
  }, []);

  return { options, add, update, remove, reset };
}
