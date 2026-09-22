import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROFILES,
  cleanColor,
  cleanMark,
  cleanName,
  isStrokeMark,
  parseProfiles,
} from './profiles.ts';

describe('profiles', () => {
  it('cleans names, colours and marks', () => {
    expect(cleanName('  Alice  ')).toBe('Alice');
    expect(cleanName('a'.repeat(40))).toHaveLength(16);
    expect(cleanName(5)).toBe('');
    expect(cleanColor('#ABCDEF')).toBe('#abcdef');
    expect(cleanColor('red')).toBe('');
    expect(cleanColor(null)).toBe('');
    expect(cleanMark('🐱', 'X')).toBe('🐱');
    expect(cleanMark(' Z ', 'X')).toBe('Z');
    expect(cleanMark('', 'X')).toBe('X');
    expect(cleanMark('abc', 'O')).toBe('O');
    expect(cleanMark(1, 'O')).toBe('O');
  });

  it('parses persisted profiles with fallbacks', () => {
    expect(parseProfiles(null)).toBeNull();
    expect(parseProfiles({})).toEqual(DEFAULT_PROFILES);
    expect(parseProfiles({ X: { name: 'Al', color: '#112233', mark: '★' }, O: 'bad' })).toEqual({
      X: { name: 'Al', color: '#112233', mark: '★' },
      O: DEFAULT_PROFILES.O,
    });
  });

  it('isStrokeMark', () => {
    expect(isStrokeMark('X')).toBe(true);
    expect(isStrokeMark('🐱')).toBe(false);
  });
});
