import React, { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { triggerHapticFeedback } from '../../utils/communication';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    triggerHapticFeedback(30);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-emerald-900/20 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b-2 border-stone-200 mb-6">
          <h2 id="modal-title" className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
            {title}
          </h2>
          <button
            onClick={handleClose}
            className="p-3 rounded-2xl hover:bg-stone-100 text-stone-600 hover:text-stone-900 min-h-[52px] min-w-[52px] flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-emerald-700/30 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-8 h-8" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
