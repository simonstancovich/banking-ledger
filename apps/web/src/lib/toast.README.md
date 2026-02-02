# Toast Notification System

A dynamic toast notification system with support for multiple modes, messages, and actions.

## Installation

The toast system uses `sonner` library. Install dependencies:

```bash
pnpm install
```

## Usage

### Basic Usage

```tsx
import { toast } from '@/lib/toast';

// Simple toast
toast('Hello world');

// With mode
toast('User created successfully', { mode: 'success' });
toast('Failed to save', { mode: 'error' });
toast('Session expiring soon', { mode: 'warning' });
toast('New update available', { mode: 'info' });
```

### Convenience Functions

```tsx
import { toastSuccess, toastError, toastWarning, toastInfo } from '@/lib/toast';

toastSuccess('Operation completed!');
toastError('Something went wrong');
toastWarning('Please check your input');
toastInfo('New message received');
```

### Advanced Usage

```tsx
import { toast } from '@/lib/toast';

// With description
toast('Payment processed', {
  mode: 'success',
  description: 'Your order will arrive in 3-5 business days',
});

// With custom duration (in milliseconds)
toast('Auto-dismissing message', {
  mode: 'info',
  duration: 5000, // 5 seconds
});

// With action button
toast('File uploaded', {
  mode: 'success',
  action: {
    label: 'View',
    onClick: () => router.push('/files'),
  },
});

// With cancel button
toast('Are you sure?', {
  mode: 'warning',
  cancel: {
    label: 'Cancel',
    onClick: () => console.log('Cancelled'),
  },
});
```

### Promise-based Toasts

Automatically shows loading, then success/error states:

```tsx
import { toastPromise } from '@/lib/toast';

const saveData = async () => {
  // Your async operation
  return await api.post('/data', data);
};

toastPromise(
  saveData(),
  {
    loading: 'Saving data...',
    success: 'Data saved successfully!',
    error: 'Failed to save data',
  }
);

// With dynamic messages
toastPromise(
  fetchUser(),
  {
    loading: 'Loading user...',
    success: (data) => `Welcome back, ${data.name}!`,
    error: (error) => `Error: ${error.message}`,
  }
);
```

## Toast Modes

- **`success`** - Green toast for successful operations
- **`error`** - Red toast for errors
- **`warning`** - Yellow toast for warnings
- **`info`** - Blue toast for informational messages
- **`default`** - Neutral toast (default)

## Options

```typescript
interface ToastOptions {
  mode?: 'success' | 'error' | 'warning' | 'info' | 'default';
  duration?: number; // Auto-dismiss time in milliseconds
  description?: string; // Secondary message below the title
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick?: () => void;
  };
}
```

## Examples in Codebase

- **Login page**: Shows success toast on login, error toast on failure
- **Register page**: Shows validation warnings, success on registration, errors for various failure cases

## Customization

The toast component is configured in `src/components/Toaster.tsx`. You can customize:
- Position (top-right, top-left, bottom-right, bottom-left, top-center, bottom-center)
- Colors and styling
- Animation behavior
- Default duration
