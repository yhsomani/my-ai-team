import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const getToastStyles = (type: ToastType) => {
  const base = 'px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up border bg-[var(--bg-panel)] text-[var(--text-primary)]';
  const variants = {
    success: 'border-success/20',
    error: 'border-destructive/20',
    info: 'border-accent/20',
    warning: 'border-warning/20',
  };
  return `${base} ${variants[type]}`;
};

const toastTypeLabels: Record<ToastType, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Information',
  warning: 'Warning',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="region"
        aria-label="Realtime toast notifications"
        className="toast-container fixed bottom-4 right-4 z-50 space-y-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            aria-label={`${toastTypeLabels[toast.type]} notification: ${toast.message}`}
            className={`${getToastStyles(toast.type)} cursor-pointer`}
            onClick={() => removeToast(toast.id)}
          >
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              type="button"
              aria-label={`Dismiss ${toast.message} notification`}
              className="ml-auto rounded-md px-1.5 py-0.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={(event) => {
                event.stopPropagation();
                removeToast(toast.id);
              }}
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
