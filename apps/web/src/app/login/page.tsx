'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { toastError, toastSuccess } from '@/lib/toast';
import { LoadingButton } from '@/components/LoadingButton';

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toastSuccess('Login successful!', { description: 'Redirecting...' });
      r.push('/app');
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string };
      const errorMessage =
        firebaseError.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : firebaseError.code === 'auth/user-not-found'
            ? 'User not found'
            : firebaseError.code === 'auth/wrong-password'
              ? 'Incorrect password'
              : 'Login failed. Please try again.';
      toastError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>
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
          loadingText="Logging in..."
        >
          Login
        </LoadingButton>
      </form>
      <div className="text-sm flex gap-3">
        <a className="underline" href="/register">
          Register
        </a>
        <a className="underline" href="/forgot-password">
          Forgot password
        </a>
      </div>
    </main>
  );
}
