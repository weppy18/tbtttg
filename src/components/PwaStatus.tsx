import { useRegisterSW } from 'virtual:pwa-register/react';
import { useOnline } from '../hooks/useOnline.ts';
import { useT } from '../i18n/index.ts';

/** Offline badge and "update available" toast driven by the service worker. */
export function PwaStatus() {
  const t = useT();
  const online = useOnline();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <>
      {!online && (
        <p className="toast toast--muted" role="status" data-testid="offline">
          {t('offline.ready')}
        </p>
      )}
      {needRefresh && (
        <div className="toast" role="status" data-testid="update-toast">
          <span>{t('update.available')}</span>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => void updateServiceWorker(true)}
          >
            {t('update.reload')}
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--small"
            onClick={() => setNeedRefresh(false)}
            aria-label={t('action.close')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </>
  );
}
