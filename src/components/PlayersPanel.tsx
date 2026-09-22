import type { Player } from '../engine/index.ts';
import { useT } from '../i18n/index.ts';
import {
  COLOR_PRESETS,
  MARK_PRESETS,
  MAX_NAME,
  cleanMark,
  isStrokeMark,
} from '../state/profiles.ts';
import { useProfiles } from '../state/profilesContext.ts';
import { Mark } from './Mark.tsx';

/** Names, colours and marks for X and O. Persisted. */
export function PlayersPanel() {
  const t = useT();
  const { profiles, update, reset } = useProfiles();
  const players: Player[] = ['X', 'O'];
  return (
    <details className="panel players" data-testid="players">
      <summary>
        <h2>{t('players.title')}</h2>
      </summary>
      <div className="panel__head">
        <span className="muted small">
          {profiles.X.name || 'X'} · {profiles.O.name || 'O'}
        </span>
        <button type="button" className="btn btn--ghost btn--small" onClick={reset}>
          {t('players.reset')}
        </button>
      </div>
      {players.map((p) => {
        const profile = profiles[p];
        return (
          <fieldset key={p} className="player">
            <legend className="player__legend">
              <span className={`player__preview cell--${p.toLowerCase()}`}>
                <Mark player={p} />
              </span>
              {t('players.player', { player: p })}
            </legend>
            <label className="field">
              <span>{t('players.name')}</span>
              <input
                type="text"
                value={profile.name}
                maxLength={MAX_NAME}
                placeholder={p}
                onChange={(e) => update(p, { name: e.target.value.slice(0, MAX_NAME) })}
                data-testid={`name-${p}`}
              />
            </label>
            <div className="field">
              <span id={`color-${p}`}>{t('players.color')}</span>
              <div className="swatches" role="group" aria-labelledby={`color-${p}`}>
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`swatch${profile.color === c ? ' swatch--on' : ''}`}
                    style={{ background: c }}
                    aria-label={c}
                    aria-pressed={profile.color === c}
                    onClick={() => update(p, { color: profile.color === c ? '' : c })}
                  />
                ))}
              </div>
            </div>
            <div className="field">
              <span id={`mark-${p}`}>{t('players.mark')}</span>
              <div className="swatches" role="group" aria-labelledby={`mark-${p}`}>
                {MARK_PRESETS.map((mk) => (
                  <button
                    key={mk}
                    type="button"
                    className={`swatch swatch--glyph${profile.mark === mk ? ' swatch--on' : ''}`}
                    aria-label={mk}
                    aria-pressed={profile.mark === mk}
                    onClick={() => update(p, { mark: mk })}
                  >
                    {mk}
                  </button>
                ))}
                <input
                  type="text"
                  className="swatch swatch--custom"
                  aria-label={t('players.customMark')}
                  placeholder="…"
                  maxLength={4}
                  value={
                    isStrokeMark(profile.mark) || MARK_PRESETS.includes(profile.mark)
                      ? ''
                      : profile.mark
                  }
                  onChange={(e) => update(p, { mark: cleanMark(e.target.value, profile.mark) })}
                />
              </div>
            </div>
          </fieldset>
        );
      })}
    </details>
  );
}
