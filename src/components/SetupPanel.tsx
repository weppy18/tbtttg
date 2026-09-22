import { DIFFICULTIES, VARIANT_IDS, type Difficulty, type Player } from '../engine/index.ts';
import { useT } from '../i18n/index.ts';
import { MODES, type MatchConfig, type Mode } from '../state/match.ts';
import { Segmented } from './Segmented.tsx';

interface Props {
  config: MatchConfig;
  onChange: (patch: Partial<MatchConfig>) => void;
}

/** Mode / variant / side / difficulty pickers. Any change starts a fresh game. */
export function SetupPanel({ config, onChange }: Props) {
  const t = useT();
  const difficultyOptions = DIFFICULTIES.map((d) => ({
    value: d,
    label: t(`difficulty.${d}`),
    hint: t(`difficulty.${d}.hint`),
  }));

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
        </>
      )}
      <p className="setup__rules">{t(`variant.${config.variant}.rules`)}</p>
    </div>
  );
}
