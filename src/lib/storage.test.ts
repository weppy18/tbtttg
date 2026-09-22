import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRecord, oneOf, readJson, removeKey, writeJson } from './storage.ts';

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

const parseNumber = (raw: unknown) => (typeof raw === 'number' ? raw : null);

describe('storage with localStorage', () => {
  let store: MemoryStorage;
  beforeEach(() => {
    store = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: store });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('round-trips JSON under a prefix', () => {
    writeJson('n', 42);
    expect(store.getItem('tttg:n')).toBe('42');
    expect(readJson('n', parseNumber, 0)).toBe(42);
    removeKey('n');
    expect(readJson('n', parseNumber, 7)).toBe(7);
  });

  it('falls back on missing, corrupt, or rejected values', () => {
    expect(readJson('missing', parseNumber, 1)).toBe(1);
    store.setItem('tttg:bad', '{not json');
    expect(readJson('bad', parseNumber, 2)).toBe(2);
    store.setItem('tttg:wrong', '"a string"');
    expect(readJson('wrong', parseNumber, 3)).toBe(3);
  });

  it('swallows storage errors', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('nope');
        },
        setItem: () => {
          throw new Error('quota');
        },
        removeItem: () => {
          throw new Error('nope');
        },
      },
    });
    expect(readJson('x', parseNumber, 5)).toBe(5);
    expect(() => writeJson('x', 1)).not.toThrow();
    expect(() => removeKey('x')).not.toThrow();
  });

  it('handles an inaccessible localStorage getter', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('blocked');
      },
    });
    expect(readJson('x', parseNumber, 9)).toBe(9);
    expect(() => writeJson('x', 1)).not.toThrow();
    expect(() => removeKey('x')).not.toThrow();
  });
});

describe('storage without window', () => {
  it('is a no-op', () => {
    expect(readJson('x', parseNumber, 4)).toBe(4);
    expect(() => writeJson('x', 1)).not.toThrow();
    expect(() => removeKey('x')).not.toThrow();
  });
});

describe('guards', () => {
  it('isRecord', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('s')).toBe(false);
  });
  it('oneOf', () => {
    expect(oneOf('a', ['a', 'b'])).toBe('a');
    expect(oneOf('c', ['a', 'b'])).toBeNull();
    expect(oneOf(1, ['a'])).toBeNull();
  });
});
