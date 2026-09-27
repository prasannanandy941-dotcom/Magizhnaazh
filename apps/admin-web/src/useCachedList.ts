import { useCallback, useEffect, useRef, useState } from 'react';

// Cached list for admin tabs ("stale-while-revalidate"):
//  - The last result for each tab is kept in memory, so re-opening a tab shows
//    its rows instantly instead of an empty table + spinner.
//  - It still refreshes in the background every time the tab opens.
//  - `loading` is only true when there is nothing to show yet (first ever
//    visit); later refreshes set `refreshing` and keep the rows on screen.
//  - `setItems` updates one row locally (e.g. after delete / suspend) and keeps
//    the cache in sync, so a single-row action never reloads the whole table.
const cache = new Map<string, unknown[]>();

export function useCachedList<T>(key: string, loader: () => Promise<T[]>) {
  const [items, setItemsState] = useState<T[]>(() => (cache.get(key) as T[] | undefined) || []);
  const [loading, setLoading] = useState(() => !cache.has(key));
  const [refreshing, setRefreshing] = useState(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    if (cache.has(key)) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await loaderRef.current();
      cache.set(key, data);
      setItemsState(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [key]);

  useEffect(() => { reload(); }, [reload]);

  const setItems = useCallback((next: T[] | ((prev: T[]) => T[])) => {
    setItemsState((prev) => {
      const value = typeof next === 'function' ? (next as (p: T[]) => T[])(prev) : next;
      cache.set(key, value);
      return value;
    });
  }, [key]);

  return { items, setItems, loading, refreshing, reload };
}
