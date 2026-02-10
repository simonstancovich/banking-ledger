'use client';

import { useEffect, useState } from 'react';
import { getAccounts, createWithdrawal } from '@/lib/api/requests';
import type { Account, CreateWithdrawalBody } from '@/lib/api/types';
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

export default function WithdrawalPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateWithdrawalBody>({
    accountId: '',
    amountCents: 0,
    transactionNote: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getAccounts()
      .then((res) => {
        const list = Array.isArray(res) ? res : res.data;
        setAccounts(list);
        if (list.length > 0 && !form.accountId)
          setForm((f) => ({ ...f, accountId: list[0].id }));
      })
      .catch(() => toastError('Failed to load accounts'))
      .finally(() => setLoading(false));
  }, []);

  const fromAccount = accounts.find((a) => a.id === form.accountId);
  const insufficient =
    fromAccount &&
    form.amountCents > 0 &&
    fromAccount.balanceCents < form.amountCents;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.accountId) e.accountId = 'Select an account';
    const amount = Number(form.amountCents);
    if (!Number.isInteger(amount) || amount < 1)
      e.amountCents = 'Amount must be at least 1 cent';
    if (insufficient)
      e.amountCents = `Insufficient balance. Max: ${formatCents(
        fromAccount!.balanceCents,
      )}`;
    if ((form.transactionNote?.length ?? 0) > 255)
      e.transactionNote = 'Note must be 255 characters or less';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || submitting || insufficient) return;
    setSubmitting(true);
    const idempotencyKey = crypto.randomUUID();
    try {
      await createWithdrawal(
        {
          accountId: form.accountId,
          amountCents: Number(form.amountCents),
          transactionNote: form.transactionNote?.trim() || undefined,
        },
        idempotencyKey,
      );
      toastSuccess('Withdrawal completed');
      setForm((f) => ({ ...f, amountCents: 0, transactionNote: '' }));
      getAccounts().then((res) => {
        const list = Array.isArray(res) ? res : res.data;
        setAccounts(list);
      });
    } catch {
      toastError('Withdrawal failed');
    } finally {
      setSubmitting(false);
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
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
        Withdrawal
      </h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Debit an account (fails if insufficient balance)
      </p>

      {accounts.length === 0 ? (
        <p className="mt-6 text-[var(--text-muted)]">
          Create an account first from the dashboard.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 bank-card p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                From account
              </label>
              <select
                className="bank-input mt-1"
                value={form.accountId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountId: e.target.value }))
                }
              >
                <option value="">Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {formatCents(a.balanceCents)}
                  </option>
                ))}
              </select>
              {errors.accountId && (
                <p className="mt-1 text-sm text-[var(--color-bank-error)]">
                  {errors.accountId}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Amount (cents)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                className="bank-input mt-1"
                value={form.amountCents || ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    amountCents:
                      e.target.value === '' ? 0 : Number(e.target.value),
                  }))
                }
              />
              {errors.amountCents && (
                <p className="mt-1 text-sm text-[var(--color-bank-error)]">
                  {errors.amountCents}
                </p>
              )}
              {insufficient && !errors.amountCents && (
                <p className="mt-1 text-sm text-[var(--color-bank-error)]">
                  Insufficient balance. Max:{' '}
                  {formatCents(fromAccount!.balanceCents)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Note (optional)
              </label>
              <input
                type="text"
                maxLength={255}
                className="bank-input mt-1"
                placeholder="e.g. ATM withdrawal"
                value={form.transactionNote ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, transactionNote: e.target.value }))
                }
              />
              {errors.transactionNote && (
                <p className="mt-1 text-sm text-[var(--color-bank-error)]">
                  {errors.transactionNote}
                </p>
              )}
            </div>
          </div>
          <div className="mt-6">
            <LoadingButton
              type="submit"
              loading={submitting}
              disabled={insufficient}
              className="bank-btn-primary w-full"
            >
              Withdraw
            </LoadingButton>
          </div>
        </form>
      )}
    </main>
  );
}
