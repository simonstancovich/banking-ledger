'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={true}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
          title: 'text-gray-900 dark:text-gray-100',
          description: 'text-gray-600 dark:text-gray-400',
          actionButton: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
          cancelButton: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
          success: 'border-green-500',
          error: 'border-red-500',
          warning: 'border-yellow-500',
          info: 'border-blue-500',
        },
      }}
    />
  );
}
