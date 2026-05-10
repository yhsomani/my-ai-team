import React, { Component, ErrorInfo, ReactNode } from 'react';
import { EmptyState } from '../shared/EmptyState';
import { logger } from '../../lib/logger';

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logger.error('ErrorBoundary caught an error', { error: error.message, stack: error.stack, info: errorInfo });
  }

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
          <EmptyState
            title={this.state.isServiceDown ? "Service Unavailable" : "Something went wrong"}
            description={this.state.error?.message || "An unexpected error occurred in the application."}
            action={{ label: "Reload Page", onClick: this.handleRetry }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
