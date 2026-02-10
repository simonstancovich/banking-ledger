'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { AuthGuard } from '@/components/AuthGuard';
import { AppNav } from '@/components/AppNav';
import { getMe } from '@/lib/api/requests';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setReady(true);
        setIsAdmin(false);
        return;
      }
      getMe()
        .then((me) => {
          setIsAdmin(me.user.role === 'ADMIN');
        })
        .catch(() => setIsAdmin(false))
        .finally(() => setReady(true));
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthGuard>
      {ready && <AppNav isAdmin={isAdmin} />}
      <div className="min-h-[calc(100vh-56px)]">{children}</div>
    </AuthGuard>
  );
}
