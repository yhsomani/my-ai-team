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
    const id = Math.random().toString(36).substring(2, 9);
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
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: () => void }> = ({ toast, onRemove }) => {
  const icons = {
    success: <CheckCircle className="text-success" size={20} />,
    error: <AlertCircle className="text-destructive" size={20} />,
    warning: <AlertTriangle className="text-warning" size={20} />,
    info: <Info className="text-accent" size={20} />,
  };

  const bgs = {
    success: 'border-success/20',
    error: 'border-destructive/20',
    warning: 'border-warning/20',
    info: 'border-accent/20',
  };

  return (
    <div className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border ${bgs[toast.type]} bg-[var(--bg-primary)]/95 backdrop-blur-md max-w-sm w-full animate-in slide-in-from-right fade-in duration-300`}>
      <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium">{toast.title}</h4>
        {toast.message && <p className="text-xs text-[var(--text-muted)] mt-1">{toast.message}</p>}
      </div>
      <button onClick={onRemove} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};
