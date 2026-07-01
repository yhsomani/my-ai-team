import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '../shared/AuraButton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isServiceDown: boolean;
}

const decorativeIconProps = {
  'aria-hidden': true,
  focusable: 'false' as const,
};

// Heuristic: detect connectivity/service errors
function detectServiceError(error: Error): boolean {
  const msg = error.message?.toLowerCase() || '';
  return (
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('network error') ||
    msg.includes('failed to fetch') ||
    msg.includes('econnrefused')
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isServiceDown: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      isServiceDown: detectServiceError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    if (this.props.onRetry) {
      this.props.onRetry();
      return;
    }

    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const title = this.state.isServiceDown ? 'Service unavailable' : 'Something went wrong';
      const description = this.state.isServiceDown
        ? 'A required service did not respond. Reload the page to retry the same workflow.'
        : 'The current screen could not continue safely. Reload the page to restore the application shell.';
      const Icon = this.state.isServiceDown ? WifiOff : AlertTriangle;

      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4 py-10">
          <section
            aria-labelledby="application-error-title"
            className="w-full max-w-xl rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] p-6 text-center shadow-[var(--shadow-sm)] sm:p-8"
          >
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-warning/25 bg-warning/10 text-warning">
              <Icon {...decorativeIconProps} className="h-6 w-6" />
            </div>
            <p className="mb-2 text-xs font-medium uppercase text-[var(--text-muted)]">
              Application recovery
            </p>
            <h1 id="application-error-title" className="text-2xl font-semibold text-[var(--text-primary)]">
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
              {description}
            </p>
            <p className="mx-auto mt-3 max-w-md text-xs leading-5 text-[var(--text-muted)]">
              Diagnostic details were logged for developers. Internal error messages are not shown here.
            </p>
            <div className="mt-6 flex justify-center">
              <Button type="button" onClick={this.handleRetry}>
                <RefreshCw {...decorativeIconProps} className="h-4 w-4" />
                Reload page
              </Button>
            </div>
          </section>
        </div>
      );
    }
    return this.props.children;
  }
}
