'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import { LoadingButton } from '@/components/LoadingButton';

/** Firebase succeeded but our API (DB) call failed or was never completed */
const DB_SYNC_FAILED = 'DB_SYNC_FAILED';

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function RegisterPage() {
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  /** User is signed in to Firebase but not yet in our DB — show "Go to login" / "Retry" */
  const [firebaseOkDbPending, setFirebaseOkDbPending] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const MIN_LENGTH = 8;
  const PASSWORD_REQUIREMENTS =
    'Use at least 8 characters with an uppercase letter, lowercase letter, number and symbol.';

  function validatePassword(
    password: string,
  ): { valid: true } | { valid: false; message: string } {
    if (password.length < MIN_LENGTH) {
      return {
        valid: false,
        message: 'Password must be at least 8 characters.',
      };
    }
    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must include an uppercase letter.',
      };
    }
    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must include a lowercase letter.',
      };
    }
    if (!/\d/.test(password)) {
      return { valid: false, message: 'Password must include a number.' };
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return {
        valid: false,
        message: 'Password must include a symbol (e.g. !@#$%).',
      };
    }
    return { valid: true };
  }

  /** Call our API to create/update user (used after Firebase sign-in and for retry) */
  async function syncUserToDb(): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;
    const token = await user.getIdToken();
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';
    const res = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFirebaseOkDbPending(false);

    if (!validateEmail(email)) {
      toastError('Invalid email address');
      return;
    }
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      toastWarning(passwordCheck.message, {
        description: PASSWORD_REQUIREMENTS,
      });
      return;
    }
    if (password !== confirmPassword) {
      toastError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const token = await userCredential.user.getIdToken();

      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1'
        }/auth/register`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        throw new Error(DB_SYNC_FAILED);
      }
      toastSuccess('Account created successfully!', {
        description: 'Redirecting...',
      });
      r.replace('/dashboard');
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.message === DB_SYNC_FAILED) {
        // Firebase succeeded, our DB sync failed — user can retry or go to login (login/me will create user)
        setFirebaseOkDbPending(true);
        toastError('Account created, but we couldn’t finish setup', {
          description: 'Go to login or retry below.',
        });
      } else if (err.code === 'auth/email-already-in-use') {
        toastError('Email already registered', {
          description: 'Please use a different email or try logging in',
        });
      } else if (err.code === 'auth/weak-password') {
        toastWarning('Password too weak', {
          description: PASSWORD_REQUIREMENTS,
        });
      } else if (err.code === 'auth/invalid-email') {
        toastError('Invalid email address');
      } else {
        toastError(err.message || 'Registration failed', {
          description: 'Please try again',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function onRetrySync() {
    setLoading(true);
    try {
      const ok = await syncUserToDb();
      if (ok) {
        toastSuccess('Setup complete!', { description: 'Redirecting...' });
        setFirebaseOkDbPending(false);
        r.replace('/dashboard');
      } else {
        toastError('Still couldn’t complete setup. Try going to login.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Register</h1>

      {firebaseOkDbPending ? (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Your account was created in Firebase, but we couldn’t finish syncing
            with our server (e.g. network issue or you closed the page).
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            You can either go to login (we’ll complete setup there) or retry
            below.
          </p>
          <div className="flex flex-col gap-2">
            <LoadingButton
              type="button"
              className="w-full rounded bg-black text-white p-2"
              loading={loading}
              loadingText="Retrying..."
              onClick={onRetrySync}
            >
              Retry sync
            </LoadingButton>
            <a
              className="block rounded border text-center border-gray-300 bg-white p-2 text-center text-sm dark:border-gray-600 dark:bg-gray-800"
              href="/login"
            >
              Go to login
            </a>
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              className="w-full rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="relative">
              <input
                className="w-full rounded border border-gray-300 p-2 pr-10 dark:border-gray-600 dark:bg-gray-800"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="8+ chars, upper, lower, number, symbol"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <div className="relative">
              <input
                className="w-full rounded border border-gray-300 p-2 pr-10 dark:border-gray-600 dark:bg-gray-800"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label={
                  showConfirmPassword ? 'Hide password' : 'Show password'
                }
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            <LoadingButton
              className="w-full rounded bg-black text-white p-2"
              loading={loading}
              loadingText="Creating account..."
            >
              Create account
            </LoadingButton>
          </form>
          <a className="text-sm underline" href="/login">
            Back to login
          </a>
        </>
      )}
    </main>
  );
}
