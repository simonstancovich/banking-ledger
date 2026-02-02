'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setStatus('Password reset email sent.');
    } catch {
      setStatus('Could not send reset email.');
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Forgot password</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded border p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="w-full rounded bg-black text-white p-2">
          Send reset email
        </button>
      </form>
      {status && <p className="text-sm">{status}</p>}
      <a className="text-sm underline" href="/login">
        Back to login
      </a>
    </main>
  );
}
