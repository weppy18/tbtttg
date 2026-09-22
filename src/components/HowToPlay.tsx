import { VARIANT_IDS } from '../engine/index.ts';
import { useT } from '../i18n/index.ts';
import { Dialog } from './Dialog.tsx';

/** Rules for every variant plus the controls, in one dialog. */
export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Dialog open={open} onClose={onClose} title={t('action.howToPlay')} testId="how-to-play">
      <dl className="rules">
        {VARIANT_IDS.map((v) => (
          <div key={v} className="rules__item">
            <dt>{t(`variant.${v}`)}</dt>
            <dd>{t(`variant.${v}.rules`)}</dd>
          </div>
        ))}
      </dl>
      <h3>{t('help.controls')}</h3>
      <ul className="rules__list">
        <li>{t('help.controls.mouse')}</li>
        <li>{t('keyboard.help')}</li>
        <li>{t('help.controls.shortcuts')}</li>
      </ul>
      <h3>{t('help.features')}</h3>
      <ul className="rules__list">
        <li>{t('help.features.hint')}</li>
        <li>{t('help.features.analysis')}</li>
        <li>{t('help.features.share')}</li>
        <li>{t('help.features.offline')}</li>
      </ul>
    </Dialog>
  );
}
