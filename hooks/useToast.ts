'use client';

import { useState, useEffect, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

let toastListeners: Array<(toasts: ToastMessage[]) => void> = [];
let toastsMemory: ToastMessage[] = [];

const notifyListeners = () => {
  toastListeners.forEach((listener) => listener([...toastsMemory]));
};

export const showToast = (message: string, type: ToastType = 'info') => {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastMessage = { id, type, message };
  toastsMemory = [...toastsMemory, newToast];
  notifyListeners();

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    toastsMemory = toastsMemory.filter((t) => t.id !== id);
    notifyListeners();
  }, 4000);
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>(toastsMemory);

  useEffect(() => {
    const listener = (newToasts: ToastMessage[]) => {
      setToasts(newToasts);
    };
    toastListeners.push(listener);
    // Sync initial state
    setToasts([...toastsMemory]);
    
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    toastsMemory = toastsMemory.filter((t) => t.id !== id);
    notifyListeners();
  }, []);

  return {
    toasts,
    toast: showToast,
    removeToast,
  };
}
