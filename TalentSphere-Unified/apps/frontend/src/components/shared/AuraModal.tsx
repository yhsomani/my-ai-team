import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { AuraButton } from './AuraButton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let activeBodyScrollLocks = 0;
let bodyOverflowBeforeModal: string | null = null;

const lockBodyScroll = () => {
  if (activeBodyScrollLocks === 0) {
    bodyOverflowBeforeModal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  activeBodyScrollLocks += 1;

  return () => {
    activeBodyScrollLocks = Math.max(activeBodyScrollLocks - 1, 0);

    if (activeBodyScrollLocks === 0) {
      document.body.style.overflow = bodyOverflowBeforeModal ?? '';
      bodyOverflowBeforeModal = null;
    }
  };
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AuraModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  const titleId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlockBodyScroll = lockBodyScroll();
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const focusFirstElement = () => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
        .filter(element => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
      (focusable[0] || dialog).focus();
    };

    const frame = window.requestAnimationFrame(focusFirstElement);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
        .filter(element => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      unlockBodyScroll();
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div data-ui="modal-root" data-slot="modal-root" className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            data-ui="modal-backdrop"
            data-slot="modal-backdrop"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            ref={dialogRef}
            data-ui="modal-dialog"
            data-slot="modal-dialog"
            data-size={size}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              'surface-modal relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden text-[var(--text-primary)]',
              sizes[size]
            )}
          >
            {/* Header */}
            <div data-ui="modal-header" data-slot="modal-header" className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
              <h3 id={titleId} className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
              <AuraButton type="button" variant="ghost" size="icon" aria-label="Close modal" onClick={onClose} className="shrink-0">
                <X size={20} aria-hidden="true" focusable="false" />
              </AuraButton>
            </div>

            {/* Body */}
            <div data-ui="modal-body" data-slot="modal-body" className="max-h-[min(70vh,calc(100vh-12rem))] overflow-y-auto p-5 sm:p-6">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div data-ui="modal-footer" data-slot="modal-footer" className="flex flex-col-reverse gap-2 border-t border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 sm:flex-row sm:items-center sm:justify-end">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
