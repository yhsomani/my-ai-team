import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { AuraButton } from './AuraButton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-Aurora-dark/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              'relative w-full bg-Aurora-surface border border-Aurora-border rounded-[2rem] shadow-2xl overflow-hidden flex flex-col',
              sizes[size]
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-Aurora-border bg-white/2">
              <h3 className="text-xl font-bold font-display text-white">{title}</h3>
              <AuraButton variant="ghost" size="icon" aria-label="Close modal" onClick={onClose} className="rounded-full">
                <X size={20} />
              </AuraButton>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto max-h-[70vh] no-scrollbar">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="p-6 border-t border-Aurora-border bg-white/2 flex items-center justify-end gap-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
