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
        <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950 p-6 text-center space-y-4">
          <div className="bg-rose-950/40 p-4 rounded-full border border-rose-900/60">
            <AlertTriangle className="h-10 w-10 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Something went wrong</h2>
            <p className="text-xs text-slate-400 max-w-sm">
              An unexpected error occurred in the extension interface. Please try reloading the extension or checking the system logs.
            </p>
          </div>
          {this.state.error && (
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg mt-4 w-full text-left overflow-auto max-h-32">
              <pre className="text-[9px] text-rose-400 font-mono">
                {this.state.error.toString()}
              </pre>
            </div>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium px-4 py-2 rounded-lg mt-4 transition"
          >
            Reload Extension
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
