import { useEffect, useRef } from 'react';
import { useT } from '../i18n/index.ts';

interface Props {
  playerName: string;
  onContinue: () => void;
}

/** Hot-seat overlay: hides the board until the next player taps to continue. */
export function TurnShield({ playerName, onContinue }: Props) {
  const t = useT();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div
      className="shield"
      role="dialog"
      aria-modal="true"
      aria-label={t('shield.title')}
      data-testid="shield"
    >
      <p className="shield__title">{t('shield.pass', { player: playerName })}</p>
      <button
        ref={ref}
        type="button"
        className="btn"
        onClick={onContinue}
        data-testid="shield-continue"
      >
        {t('shield.continue')}
      </button>
    </div>
  );
}
