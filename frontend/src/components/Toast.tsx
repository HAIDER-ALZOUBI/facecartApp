import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-gray-800',
  };

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg text-white text-sm shadow-lg transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${colors[type]}`}
      role="alert"
    >
      {message}
    </div>
  );
}
