import { toast as sonnerToast } from 'sonner';

export type ToastMode = 'success' | 'error' | 'warning' | 'info' | 'default';

export interface ToastOptions {
  mode?: ToastMode;
  duration?: number;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick?: () => void;
  };
}

/**
 * Dynamic toast function that supports different modes and messages
 * 
 * @example
 * toast('User created successfully', { mode: 'success' });
 * toast('Failed to save', { mode: 'error', description: 'Please try again' });
 * toast('Session expiring soon', { mode: 'warning', duration: 5000 });
 */
export function toast(message: string, options?: ToastOptions) {
  const { mode = 'default', duration, description, action, cancel } = options || {};

  const toastOptions = {
    duration,
    description,
    action: action
      ? {
          label: action.label,
          onClick: action.onClick,
        }
      : undefined,
    cancel: cancel
      ? {
          label: cancel.label,
          onClick: cancel.onClick,
        }
      : undefined,
  };

  switch (mode) {
    case 'success':
      return sonnerToast.success(message, toastOptions);
    case 'error':
      return sonnerToast.error(message, toastOptions);
    case 'warning':
      return sonnerToast.warning(message, toastOptions);
    case 'info':
      return sonnerToast.info(message, toastOptions);
    case 'default':
    default:
      return sonnerToast(message, toastOptions);
  }
}

// Convenience functions for each mode
export const toastSuccess = (message: string, options?: Omit<ToastOptions, 'mode'>) =>
  toast(message, { ...options, mode: 'success' });

export const toastError = (message: string, options?: Omit<ToastOptions, 'mode'>) =>
  toast(message, { ...options, mode: 'error' });

export const toastWarning = (message: string, options?: Omit<ToastOptions, 'mode'>) =>
  toast(message, { ...options, mode: 'warning' });

export const toastInfo = (message: string, options?: Omit<ToastOptions, 'mode'>) =>
  toast(message, { ...options, mode: 'info' });

// Promise-based toast (shows loading, then success/error)
export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  },
) {
  return sonnerToast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
}
