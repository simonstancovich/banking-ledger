'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import { LoadingButton } from '@/components/LoadingButton';

export default function RegisterPage() {
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to register user in database');
      }
      toastSuccess('Account created successfully!', { description: 'Redirecting...' });
      r.push('/app');
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        toastError('Email already registered', { description: 'Please use a different email or try logging in' });
      } else if (firebaseError.code === 'auth/weak-password') {
        toastWarning('Password should be at least 6 characters');
      } else if (firebaseError.code === 'auth/invalid-email') {
        toastError('Invalid email address');
      } else {
        toastError(firebaseError.message || 'Registration failed', { description: 'Please try again' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Register</h1>
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
    </main>
  );
}
