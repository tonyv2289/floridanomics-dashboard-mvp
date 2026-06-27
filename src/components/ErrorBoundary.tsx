import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message?: string };

/**
 * App-level error boundary. A schema drift or a render throw used to white-screen
 * the whole dashboard; this catches it and shows a recoverable state instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unexpected error",
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (typeof console !== "undefined") {
      console.error("Dashboard error boundary caught an error:", error, info);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="v3-root" role="alert">
          <section className="v3-state">
            <p className="v3-kicker">Something went wrong</p>
            <h1>The dashboard hit an unexpected error.</h1>
            <p>Try reloading. If it keeps happening, the data may have changed shape.</p>
            <button
              type="button"
              className="v3-reload-button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
            >
              Reload
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
