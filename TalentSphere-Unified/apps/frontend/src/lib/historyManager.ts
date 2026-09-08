// Shared primitives for draft/export history managers.
// Each domain module supplies its own type guard, snapshot compare, and coalesce merge.

export const compact = (value?: string | null) => (value || '').trim();

export const createHistoryId = () => crypto.randomUUID();

export interface HistoryItem {
  id: string;
  createdAt?: string;
  updatedAt: string;
}

export interface SanitizeHistoryOptions<T extends HistoryItem> {
  isItem: (value: unknown) => value is T;
  filters?: Array<(item: T) => boolean>;
  maxItems?: number;
  dedupe?: boolean;
  normalize?: (item: T) => T;
}

export const sanitizeHistory = <T extends HistoryItem>(
  value: unknown,
  { isItem, filters = [], maxItems, dedupe = true, normalize }: SanitizeHistoryOptions<T>
): T[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  let items = value.filter(isItem);
  if (normalize) items = items.map(normalize);

  for (const filter of filters) {
    items = items.filter(filter);
  }

  if (dedupe) {
    items = items.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  items = [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return maxItems ? items.slice(0, maxItems) : items;
};

export const mergeHistories = <T extends HistoryItem>(
  primary: T[],
  fallback: T[],
  options: Omit<SanitizeHistoryOptions<T>, 'maxItems'> & { maxItems?: number }
) => sanitizeHistory([...primary, ...fallback], options);

export interface AppendHistoryOptions<T extends HistoryItem> {
  isItem: (value: unknown) => value is T;
  filters?: Array<(item: T) => boolean>;
  maxItems?: number;
  isSameSnapshot: (latest: T, next: T) => boolean;
  coalesce: (latest: T, next: T) => T;
  autosaveCoalesceMs?: number;
  isAutosave?: (item: T) => boolean;
}

// Returns the next history list after appending `next`, coalescing consecutive
// autosaves within the window and dropping exact snapshot duplicates.
export const appendHistory = <T extends HistoryItem>(
  history: T[],
  next: T,
  {
    isItem,
    filters = [],
    maxItems,
    isSameSnapshot,
    coalesce,
    autosaveCoalesceMs = 60_000,
    isAutosave = item => (item as { reason?: string }).reason === 'autosave',
  }: AppendHistoryOptions<T>
): T[] => {
  const current = sanitizeHistory(history, { isItem, filters, maxItems });
  const [latest, ...rest] = current;

  if (latest && isSameSnapshot(latest, next)) {
    return current;
  }

  if (
    latest &&
    isAutosave(latest) &&
    isAutosave(next) &&
    new Date(next.updatedAt).getTime() - new Date(latest.createdAt ?? latest.updatedAt).getTime() < autosaveCoalesceMs
  ) {
    return [coalesce(latest, next), ...rest].slice(0, maxItems);
  }

  return [next, ...current].slice(0, maxItems);
};
