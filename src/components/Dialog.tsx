import { useEffect, useRef, type ReactNode } from 'react';
import { useT } from '../i18n/index.ts';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  testId?: string;
}

/**
 * Native <dialog> modal: focus is trapped by the browser, Esc closes, and the
 * backdrop click closes too. Nothing to reinvent.
 */
export function Dialog({ open, onClose, title, children, testId }: Props) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={`${testId ?? 'dialog'}-title`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      data-testid={testId}
    >
      <div className="dialog__body">
        <div className="dialog__head">
          <h2 id={`${testId ?? 'dialog'}-title`}>{title}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label={t('action.close')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
