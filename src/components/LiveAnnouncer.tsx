/**
 * A visually hidden polite live region. Pass a `nonce` that changes with each
 * message so identical consecutive announcements are still read out.
 */
export function LiveAnnouncer({ message, nonce }: { message: string; nonce: number }) {
  return (
    <div
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="announcer"
    >
      <span key={nonce}>{message}</span>
    </div>
  );
}
