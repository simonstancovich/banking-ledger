'use client';

import { ClipLoader, BeatLoader, PulseLoader, RingLoader } from 'react-spinners';

export type SpinnerType = 'clip' | 'beat' | 'pulse' | 'ring';

interface LoadingSpinnerProps {
  type?: SpinnerType;
  size?: number;
  color?: string;
  className?: string;
}

export function LoadingSpinner({
  type = 'clip',
  size = 20,
  color = '#000000',
  className = '',
}: LoadingSpinnerProps) {
  const spinnerProps = {
    size,
    color,
    className,
  };

  switch (type) {
    case 'beat':
      return <BeatLoader {...spinnerProps} />;
    case 'pulse':
      return <PulseLoader {...spinnerProps} />;
    case 'ring':
      return <RingLoader {...spinnerProps} />;
    case 'clip':
    default:
      return <ClipLoader {...spinnerProps} />;
  }
}
