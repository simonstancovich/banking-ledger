'use client';

import { LoadingSpinner } from './LoadingSpinner';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  spinnerType?: 'clip' | 'beat' | 'pulse' | 'ring';
  spinnerSize?: number;
}

export function LoadingButton({
  loading = false,
  loadingText,
  spinnerType = 'clip',
  spinnerSize = 16,
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`${className} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
      {...props}
    >
      {loading && (
        <LoadingSpinner type={spinnerType} size={spinnerSize} color="currentColor" />
      )}
      {loading ? loadingText || children : children}
    </button>
  );
}
