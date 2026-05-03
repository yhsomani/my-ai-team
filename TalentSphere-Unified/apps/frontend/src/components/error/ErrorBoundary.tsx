import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isServiceDown: boolean;
}

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });

    if (import.meta.env.MODE === 'production') {
      this.reportToErrorTracking(error, errorInfo);
    }
  }

  private reportToErrorTracking(_error: Error, _errorInfo: ErrorInfo): void {
    // Placeholder for Sentry or similar integration
  }

  private handleReload = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, isServiceDown: false });
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = '/dashboard';
  };

  private handleReport = (): void => {
    const { error, errorInfo } = this.state;
    const subject = encodeURIComponent(`Error Report: ${error?.message || 'Unknown Error'}`);
    const body = encodeURIComponent(
      `Error: ${error?.message}\n\nStack Trace:\n${error?.stack}\n\nComponent Stack:\n${errorInfo?.componentStack}`
    );
    window.open(`mailto:support@talentsphere.com?subject=${subject}&body=${body}`);
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const { isServiceDown, error } = this.state;

    return (
      <div className="min-h-screen bg-[var(--bg-primary,#0f1117)] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full rounded-2xl shadow-2xl border border-[var(--border-default,#2a2d3a)] overflow-hidden">

          {/* Header */}
          <div className={`p-6 ${isServiceDown ? 'bg-gradient-to-r from-amber-600 to-orange-600' : 'bg-gradient-to-r from-red-600 to-rose-600'}`}>
            <div className="flex items-center gap-3">
              {isServiceDown ? (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 6.343a9 9 0 000 12.728m2.829-2.829a5 5 0 000-7.072M12 12h.01" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <div>
                <h1 className="text-xl font-bold text-white">
                  {isServiceDown ? 'Service Unavailable' : 'System Error'}
                </h1>
                <p className="text-white/80 text-sm">
                  {isServiceDown ? 'One or more backend services are unreachable (502/503)' : 'An unexpected application error occurred'}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 bg-[var(--bg-secondary,#161b27)]">
            {isServiceDown ? (
              <div className="mb-5 space-y-2">
                <p className="text-[var(--text-secondary,#a0aec0)] text-sm">
                  TalentSphere cannot reach one of its microservices right now. This is usually a temporary issue.
                </p>
                <ul className="text-xs text-[var(--text-muted,#718096)] space-y-1 list-disc list-inside">
                  <li>Check your internet connection</li>
                  <li>The service may be restarting — try again in 30 seconds</li>
                  <li>If using Docker, ensure all containers are running: <code className="bg-black/30 px-1 rounded">docker compose ps</code></li>
                </ul>
              </div>
            ) : (
              <p className="text-[var(--text-secondary,#a0aec0)] text-sm mb-5">
                An unexpected error occurred. Our team has been notified.
              </p>
            )}

            {import.meta.env.MODE !== 'production' && error && (
              <div className="mb-5">
                <h3 className="text-xs font-semibold text-[var(--text-muted,#718096)] mb-2 uppercase tracking-wider">Error Details</h3>
                <pre className="bg-black/40 text-red-400 p-3 rounded-lg text-xs overflow-x-auto max-h-40 scrollbar-thin">
                  {error.message}
                  {'\n'}
                  {error.stack}
                </pre>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary,#1e2433)] hover:bg-[var(--bg-hover,#252b3b)] text-white text-sm rounded-lg border border-[var(--border-default,#2a2d3a)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Go to Dashboard
              </button>

              <button
                onClick={this.handleReport}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary,#1e2433)] hover:bg-[var(--bg-hover,#252b3b)] text-white text-sm rounded-lg border border-[var(--border-default,#2a2d3a)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Report Issue
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-black/30 px-6 py-3 border-t border-[var(--border-default,#2a2d3a)]">
            <p className="text-xs text-[var(--text-muted,#718096)] text-center">
              {isServiceDown ? 'HTTP 502/503' : `Error: ${error?.name || 'UNKNOWN'}`} · {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
