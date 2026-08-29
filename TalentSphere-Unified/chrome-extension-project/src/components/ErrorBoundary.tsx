import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex h-full w-full flex-col items-center justify-center space-y-4 bg-[var(--ext-bg)] p-6 text-center text-[var(--ext-text)]">
          <div className="rounded-full border border-[var(--ext-danger)] bg-[var(--ext-danger-muted)] p-4">
            <AlertTriangle className="h-10 w-10 text-[var(--ext-danger)]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[var(--ext-text)]">Something went wrong</h2>
            <p className="max-w-sm text-xs text-[var(--ext-text-secondary)]">
              An unexpected error occurred in the extension interface. Please try reloading the extension or checking the system logs.
            </p>
          </div>
          {this.state.error && (
            <div className="mt-4 max-h-32 w-full overflow-auto rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-3 text-left">
              <pre className="font-mono text-[9px] text-[var(--ext-danger)]">
                {this.state.error.toString()}
              </pre>
            </div>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg border border-[var(--ext-accent)] bg-[var(--ext-accent)] px-4 py-2 text-xs font-medium text-[var(--ext-on-accent)] transition hover:bg-[var(--ext-accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]"
          >
            Reload Extension
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
