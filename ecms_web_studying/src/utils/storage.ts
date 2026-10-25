const PREFIX = '@ecms';

export const storage = {
  get<T = unknown>(key: string): T | null {
    try {
      const raw = localStorage.getItem(`${PREFIX}/${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(`${PREFIX}/${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('[storage] set failed:', e);
    }
  },

  remove(key: string): void {
    localStorage.removeItem(`${PREFIX}/${key}`);
  },

  clear(): void {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(`${PREFIX}/`))
      .forEach((k) => localStorage.removeItem(k));
  },
};