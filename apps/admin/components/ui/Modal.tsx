import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidthClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, maxWidthClassName = 'max-w-lg' }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Modal Content */}
      <div className={`relative w-full rounded-xl bg-white shadow-2xl ${maxWidthClassName} animate-fade-in-up mx-4 max-h-[90vh] overflow-y-auto`}>
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-xl leading-none text-gray-400 hover:text-gray-600">
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
