'use client';

import { useEffect, useState } from 'react';
import { getAccounts, createAccount } from '@/lib/api/requests';
import type { Account, CreateAccountBody } from '@/lib/api/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LoadingButton } from '@/components/LoadingButton';
import { toastSuccess, toastError } from '@/lib/toast';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    type: CreateAccountBody['type'];
    balanceCents: string;
  }>({
    name: '',
    type: 'CHECKING',
    balanceCents: '',
  });
  const [formError, setFormError] = useState<Record<string, string>>({});

  const loadAccounts = async () => {
    try {
      const res = await getAccounts();
      const list = Array.isArray(res) ? res : res.data;
      setAccounts(list);
    } catch (e) {
      toastError('Failed to load accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const totalCents = accounts.reduce((sum, a) => sum + a.balanceCents, 0);

  const parseBalanceCents = (s: string): number => {
    const trimmed = s.trim();
    if (trimmed === '') return 0;
    const n = parseInt(trimmed, 10);
    return Number.isNaN(n) ? 0 : Math.max(0, n);
  };

  const validateCreate = (): boolean => {
    const err: Record<string, string> = {};
    const name = form.name?.trim() ?? '';
    if (!name) err.name = 'Account name is required';
    if (name.length > 255) err.name = 'Name is too long';
    if (form.balanceCents.trim() !== '') {
      const n = parseInt(form.balanceCents.trim(), 10);
      if (Number.isNaN(n)) err.balanceCents = 'Enter a valid number';
      else if (n < 0) err.balanceCents = 'Balance cannot be negative';
    }
    setFormError(err);
    return Object.keys(err).length === 0;
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreate() || createSubmitting) return;
    setCreateSubmitting(true);
    try {
      await createAccount({
        name: form.name.trim(),
        type: form.type,
        balanceCents: parseBalanceCents(form.balanceCents),
      });
      toastSuccess('Account created');
      setForm({ name: '', type: 'CHECKING', balanceCents: '' });
      setCreateOpen(false);
      setFormError({});
      loadAccounts();
    } catch {
      toastError('Failed to create account');
    } finally {
      setCreateSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center p-6">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
        Dashboard
      </h1>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="bank-card p-6">
          <h2 className="text-sm font-medium text-[var(--text-muted)]">
            Total balance
          </h2>
          <p className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">
            {formatCents(totalCents)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          My accounts
        </h2>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="bank-btn-primary"
        >
          New account
        </button>
      </div>

      {accounts.length === 0 ? (
        <p className="mt-4 text-[var(--text-muted)]">
          No accounts yet. Create one to start.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {accounts.map((acc) => (
            <li
              key={acc.id}
              className="bank-card flex items-center justify-between p-4"
            >
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {acc.name}
                </p>
                <p className="text-sm text-[var(--text-muted)]">{acc.type}</p>
              </div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {formatCents(acc.balanceCents)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => !createSubmitting && setCreateOpen(false)}
        >
          <div
            className="bank-card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Create account</h3>
            <form onSubmit={handleCreateAccount} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  className="bank-input mt-1"
                  placeholder="e.g. Main Checking"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
                {formError.name && (
                  <p className="mt-1 text-sm text-[var(--color-bank-error)]">
                    {formError.name}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Type
                </label>
                <select
                  id="type"
                  className="bank-input mt-1"
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as Account['type'],
                    }))
                  }
                >
                  <option value="CHECKING">Checking</option>
                  <option value="SAVINGS">Savings</option>
                  <option value="CREDIT_CARD">Credit card</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="balanceCents"
                  className="block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Initial balance (cents, optional)
                </label>
                <input
                  id="balanceCents"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="bank-input mt-1"
                  placeholder="0"
                  value={form.balanceCents}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '');
                    setForm((f) => ({ ...f, balanceCents: digitsOnly }));
                  }}
                />
                {formError.balanceCents && (
                  <p className="mt-1 text-sm text-[var(--color-bank-error)]">
                    {formError.balanceCents}
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <LoadingButton
                  type="submit"
                  loading={createSubmitting}
                  className="bank-btn-primary flex-1"
                >
                  Create
                </LoadingButton>
                <button
                  type="button"
                  className="bank-btn-secondary"
                  onClick={() => setCreateOpen(false)}
                  disabled={createSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
