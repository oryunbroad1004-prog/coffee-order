import React, { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 2500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="bg-stone-900/95 text-white px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-2.5 text-xs font-semibold border border-stone-700/50">
        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="leading-snug">{message}</span>
      </div>
    </div>
  );
};
