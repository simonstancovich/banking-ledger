'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';

type Me = {
  user: {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
    createdAt: string;
    updatedAt: string;
  };
  created: boolean;
};

export default function AppHome() {
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<'loading' | 'anon' | 'ready' | 'error'>(
    'loading',
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus('anon');
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) throw new Error('bad');
        const data = (await res.json()) as Me;
        setMe(data);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    });

    return () => unsub();
  }, []);

  if (status === 'loading') return <main className="p-6">Loading…</main>;
  if (status === 'anon')
    return (
      <main className="p-6 space-y-2">
        <p>You are not logged in.</p>
        <a className="underline" href="/login">
          Go to login
        </a>
      </main>
    );
  if (status === 'error')
    return (
      <main className="p-6 space-y-2">
        <p>Could not load profile from API.</p>
        <p className="text-sm text-gray-600">
          Check API is running on port 3000 and Firebase Admin env vars are correct.
        </p>
      </main>
    );

  return (
    <main className="p-6 space-y-2">
      <h1 className="text-2xl font-semibold">App</h1>
      {me && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            {me.created ? 'New user created!' : 'Welcome back!'}
          </p>
          <pre className="rounded border p-3 text-sm">
            {JSON.stringify(me.user, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
