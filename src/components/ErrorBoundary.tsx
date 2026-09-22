import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Last line of defence: shows a reset button instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app" role="alert">
        <main className="main error-screen">
          <h1>Something went wrong.</h1>
          <p className="muted">{this.state.error.message}</p>
          <div className="controls">
            <button type="button" className="btn" onClick={() => location.reload()}>
              Reload
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {
                  // ignore
                }
                location.reload();
              }}
            >
              Reset saved data and reload
            </button>
          </div>
        </main>
      </div>
    );
  }
}
