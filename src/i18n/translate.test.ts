import { describe, expect, it } from 'vitest';
import { en, type MessageKey } from './en.ts';
import { fr } from './fr.ts';
import { detectLocale, format, isLocale, translate } from './translate.ts';

describe('format', () => {
  it('substitutes params and leaves unknown placeholders', () => {
    expect(format('{a} and {b}', { a: 1, b: 'two' })).toBe('1 and two');
    expect(format('{a} and {b}', { a: 1 })).toBe('1 and {b}');
    expect(format('plain')).toBe('plain');
  });
});

describe('translate', () => {
  it('translates in both locales', () => {
    expect(translate('en', 'status.win', { player: 'X' })).toBe('X wins!');
    expect(translate('fr', 'status.win', { player: 'X' })).toBe('X gagne !');
  });

  it('French covers every English key with the same placeholders', () => {
    for (const key of Object.keys(en) as MessageKey[]) {
      expect(fr[key], key).toBeTruthy();
      const enParams = (en[key].match(/\{\w+\}/g) ?? []).sort();
      const frParams = (fr[key].match(/\{\w+\}/g) ?? []).sort();
      expect(frParams, key).toEqual(enParams);
    }
  });
});

describe('detectLocale', () => {
  it('prefers the first supported language', () => {
    expect(detectLocale(['de', 'fr-CA', 'en'])).toBe('fr');
    expect(detectLocale(['en-US'])).toBe('en');
    expect(detectLocale(['de'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });

  it('isLocale', () => {
    expect(isLocale('fr')).toBe(true);
    expect(isLocale('es')).toBe(false);
  });
});
