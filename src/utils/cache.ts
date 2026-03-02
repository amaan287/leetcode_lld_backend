type Entry = {
  value: any;
  expires: number;
};

const store = new Map<string, Entry>();
const MAX_ENTRIES = 500;

export function setCache(key: string, value: any, ttl = 60000) {
  if (store.size > MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }

  store.set(key, {
    value,
    expires: Date.now() + ttl,
  });
}

export function getCache(key: string) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.value;
}
