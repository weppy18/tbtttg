import { useState } from 'react';
import { useT } from '../i18n/index.ts';
import { Dialog } from './Dialog.tsx';

const STEPS = ['modes', 'play', 'tools'] as const;

/** Three-step first-run tour. Dismissed for good once finished or skipped. */
export function Tour({ open, onDone }: { open: boolean; onDone: () => void }) {
  const t = useT();
  const [step, setStep] = useState(0);
  const key = STEPS[step]!;
  const last = step === STEPS.length - 1;
  return (
    <Dialog open={open} onClose={onDone} title={t('tour.title')} testId="tour">
      <p className="tour__step muted small">
        {t('tour.progress', { n: step + 1, total: STEPS.length })}
      </p>
      <h3>{t(`tour.${key}.title`)}</h3>
      <p>{t(`tour.${key}.body`)}</p>
      <div className="dialog__actions">
        <button type="button" className="btn btn--ghost" onClick={onDone}>
          {t('tour.skip')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => (last ? onDone() : setStep(step + 1))}
          data-testid="tour-next"
        >
          {last ? t('tour.done') : t('tour.next')}
        </button>
      </div>
    </Dialog>
  );
}
