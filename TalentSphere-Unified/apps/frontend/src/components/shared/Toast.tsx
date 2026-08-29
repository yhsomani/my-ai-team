import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);

    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div
        data-ui="toast-stack"
        data-slot="toast-stack"
        role="region"
        aria-label="Toast notifications"
        className="pointer-events-none fixed bottom-20 left-4 right-4 z-50 flex max-h-32 flex-col gap-2 overflow-y-auto sm:bottom-4 sm:left-auto sm:w-[min(24rem,calc(100vw-2rem))] sm:max-h-[calc(100vh-2rem)]"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: () => void }> = ({ toast, onRemove }) => {
  const typeLabels = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
  };

  const icons = {
    success: <CheckCircle className="text-success" size={20} aria-hidden="true" focusable="false" />,
    error: <AlertCircle className="text-destructive" size={20} aria-hidden="true" focusable="false" />,
    warning: <AlertTriangle className="text-warning" size={20} aria-hidden="true" focusable="false" />,
    info: <Info className="text-accent" size={20} aria-hidden="true" focusable="false" />,
  };

  const bgs = {
    success: 'border-success/20',
    error: 'border-destructive/20',
    warning: 'border-warning/20',
    info: 'border-accent/20',
  };

  return (
    <div
      data-ui="toast"
      data-slot="toast"
      data-toast-type={toast.type}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      aria-label={`${typeLabels[toast.type]} notification: ${toast.title}`}
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border ${bgs[toast.type]} bg-[var(--bg-panel)]/95 p-4 shadow-lg backdrop-blur-md animate-in slide-in-from-right fade-in duration-300`}
    >
      <div data-ui="toast-icon" data-slot="toast-icon" className="shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div data-ui="toast-content" data-slot="toast-content" className="flex-1 min-w-0">
        <h4 data-ui="toast-title" data-slot="toast-title" className="text-sm font-medium">{toast.title}</h4>
        {toast.message && <p data-ui="toast-message" data-slot="toast-message" className="text-xs text-[var(--text-muted)] mt-1">{toast.message}</p>}
      </div>
      <button
        data-ui="toast-dismiss"
        data-slot="toast-dismiss"
        type="button"
        onClick={onRemove}
        aria-label={`Dismiss ${toast.title} notification`}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-panel)]"
      >
        <X size={16} aria-hidden="true" focusable="false" />
      </button>
    </div>
  );
};
