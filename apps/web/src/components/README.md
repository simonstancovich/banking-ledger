# Loading Components

This directory contains reusable loading components for the application.

## Components

### LoadingSpinner

A flexible spinner component with multiple animation types.

```tsx
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Basic usage
<LoadingSpinner />

// With custom props
<LoadingSpinner 
  type="beat" 
  size={30} 
  color="#3b82f6" 
  className="my-4"
/>
```

**Props:**
- `type`: `'clip' | 'beat' | 'pulse' | 'ring'` (default: `'clip'`)
- `size`: `number` (default: `20`)
- `color`: `string` (default: `'#000000'`)
- `className`: `string` (optional)

### LoadingButton

A button component that shows a loading spinner when loading.

```tsx
import { LoadingButton } from '@/components/LoadingButton';

<LoadingButton
  loading={isLoading}
  loadingText="Submitting..."
  spinnerType="beat"
  className="w-full rounded bg-blue-500 text-white p-2"
  onClick={handleSubmit}
>
  Submit
</LoadingButton>
```

**Props:**
- `loading`: `boolean` - Shows spinner when true
- `loadingText`: `string` - Text to show while loading (defaults to children)
- `spinnerType`: `'clip' | 'beat' | 'pulse' | 'ring'` (default: `'clip'`)
- `spinnerSize`: `number` (default: `16`)
- All standard button HTML attributes are supported

### PageLoader

Automatically shows a progress bar at the top of the page during route transitions. Already integrated into the root layout.

The progress bar is automatically configured and styled in `globals.css`.

## Installation

The required packages are already added to `package.json`:
- `react-spinners` - For spinner animations
- `nprogress` - For page-level progress bar

Run `pnpm install` to install the dependencies.
