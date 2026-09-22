import {
  DIFFICULTIES,
  PERSONALITIES,
  VARIANT_IDS,
  type Difficulty,
  type Personality,
  type Player,
} from '../engine/index.ts';
import { useT } from '../i18n/index.ts';
import { MODES, type MatchConfig, type Mode } from '../state/match.ts';
import { Segmented } from './Segmented.tsx';

interface Props {
  config: MatchConfig;
  onChange: (patch: Partial<MatchConfig>) => void;
  hotSeat: boolean;
  onHotSeat: (on: boolean) => void;
}

/** Mode / variant / side / difficulty pickers. Any change starts a fresh game. */
export function SetupPanel({ config, onChange, hotSeat, onHotSeat }: Props) {
  const t = useT();
  const difficultyOptions = DIFFICULTIES.map((d) => ({
    value: d,
    label: t(`difficulty.${d}`),
    hint: t(`difficulty.${d}.hint`),
  }));
  const personalityOptions = PERSONALITIES.map((p) => ({
    value: p,
    label: t(`personality.${p}`),
    hint: t(`personality.${p}.hint`),
  }));
  // Personalities only shape searched moves, so they're moot on Ultimate (own engine) and Easy.
  const showPersonality = config.variant !== 'ultimate';

  return (
    <div className="setup" data-testid="setup">
      <Segmented<Mode>
        label={t('mode.label')}
        value={config.mode}
        options={MODES.map((m) => ({ value: m, label: t(`mode.${m}`) }))}
        onChange={(mode) => onChange({ mode })}
      />
      <Segmented
        label={t('variant.label')}
        value={config.variant}
        options={VARIANT_IDS.map((v) => ({
          value: v,
          label: t(`variant.${v}`),
          hint: t(`variant.${v}.rules`),
        }))}
        onChange={(variant) => onChange({ variant })}
      />
      {config.mode === 'hvh' && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={hotSeat}
            onChange={(e) => onHotSeat(e.target.checked)}
            data-testid="hot-seat"
          />
          <span>{t('setup.hotSeat')}</span>
        </label>
      )}
      {config.mode === 'hva' && (
        <>
          <Segmented<Player>
            label={t('side.label')}
            value={config.humanSide}
            options={[
              { value: 'X', label: t('side.x') },
              { value: 'O', label: t('side.o') },
            ]}
            onChange={(humanSide) => onChange({ humanSide })}
          />
          <Segmented<Difficulty>
            label={t('difficulty.label')}
            value={config.difficulty}
            options={difficultyOptions}
            onChange={(difficulty) => onChange({ difficulty })}
          />
          {showPersonality && config.difficulty !== 'easy' && (
            <Segmented<Personality>
              label={t('personality.label')}
              value={config.personality}
              options={personalityOptions}
              onChange={(personality) => onChange({ personality })}
            />
          )}
        </>
      )}
      {config.mode === 'ava' && (
        <>
          <Segmented<Difficulty>
            label={t('difficulty.x')}
            value={config.difficulty}
            options={difficultyOptions}
            onChange={(difficulty) => onChange({ difficulty })}
          />
          <Segmented<Difficulty>
            label={t('difficulty.o')}
            value={config.difficultyO}
            options={difficultyOptions}
            onChange={(difficultyO) => onChange({ difficultyO })}
          />
          {showPersonality && (
            <>
              <Segmented<Personality>
                label={t('personality.x')}
                value={config.personality}
                options={personalityOptions}
                onChange={(personality) => onChange({ personality })}
              />
              <Segmented<Personality>
                label={t('personality.o')}
                value={config.personalityO}
                options={personalityOptions}
                onChange={(personalityO) => onChange({ personalityO })}
              />
            </>
          )}
        </>
      )}
      <p className="setup__rules">{t(`variant.${config.variant}.rules`)}</p>
    </div>
  );
}
