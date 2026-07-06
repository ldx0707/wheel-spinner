import { useState, useEffect, useCallback } from 'react';
import type { SpinHistoryEntry } from '../types';

const STORAGE_KEY = 'wheel_history';
const PAGE_SIZE = 10;

function load(): SpinHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* corrupt data */
  }
  return [];
}

function save(entries: SpinHistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 500)));
  } catch {
    /* quota exceeded */
  }
}

let idCounter = Date.now();
function nextId(): string {
  return (++idCounter).toString(36) + Math.random().toString(36).slice(2, 6);
}

export function useHistory() {
  const [entries, setEntries] = useState<SpinHistoryEntry[]>(load);
  const [page, setPage] = useState(0);

  useEffect(() => {
    save(entries);
  }, [entries]);

  const add = useCallback(
    (entry: Omit<SpinHistoryEntry, 'id'>) => {
      const item: SpinHistoryEntry = { ...entry, id: nextId() };
      setEntries((prev) => [item, ...prev]);
    },
    []
  );

  const clear = useCallback(() => {
    setEntries([]);
    setPage(0);
  }, []);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const paged = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return { entries, paged, page, totalPages, setPage, add, clear };
}
