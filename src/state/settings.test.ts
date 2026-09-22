import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from './settings.ts';

describe('parseSettings', () => {
  it('fills defaults for missing or invalid fields', () => {
    expect(parseSettings(null)).toBeNull();
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ theme: 'dark', locale: 'fr', sound: false, seenTour: true })).toEqual({
      theme: 'dark',
      locale: 'fr',
      sound: false,
      seenTour: true,
    });
    expect(parseSettings({ theme: 'neon', locale: 'es', sound: 'yes', seenTour: 1 })).toEqual(
      DEFAULT_SETTINGS,
    );
  });
});
