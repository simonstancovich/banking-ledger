'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import { LoadingButton } from '@/components/LoadingButton';

/** Firebase succeeded but our API (DB) call failed or was never completed */
const DB_SYNC_FAILED = 'DB_SYNC_FAILED';

export default function RegisterPage() {
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  /** User is signed in to Firebase but not yet in our DB — show "Go to login" / "Retry" */
  const [firebaseOkDbPending, setFirebaseOkDbPending] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

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
    if (!validatePassword(password)) {
      toastWarning('Password should be at least 6 characters');
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
        toastWarning('Password should be at least 6 characters');
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
              className="w-full rounded border p-2"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full rounded border p-2"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

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
