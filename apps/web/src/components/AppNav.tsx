'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/transfer', label: 'Transfer' },
  { href: '/deposit', label: 'Deposit' },
  { href: '/withdrawal', label: 'Withdrawal' },
  { href: '/transactions', label: 'Transactions' },
];

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[var(--border-default)] bg-[var(--bg-card)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-[var(--text-primary)]"
          >
            Banking Ledger
          </Link>
          <div className="flex gap-1">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'bg-[var(--color-bank-accent)]/10 text-[var(--color-bank-accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--border-default)] hover:text-[var(--text-primary)]'
                }`}
              >
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === '/admin'
                    ? 'bg-[var(--color-bank-accent)]/10 text-[var(--color-bank-accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--border-default)] hover:text-[var(--text-primary)]'
                }`}
              >
                Admin
              </Link>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut(auth)}
          className="bank-btn-secondary text-sm"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
