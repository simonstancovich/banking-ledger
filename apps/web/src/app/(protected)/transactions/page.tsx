'use client';

import { useEffect, useState } from 'react';
import { getTransactions } from '@/lib/api/requests';
import type { TransactionListItem } from '@/lib/api/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toastError } from '@/lib/toast';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    signDisplay: 'always',
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function TransactionsPage() {
  const [data, setData] = useState<TransactionListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async (cursor?: string, append = false) => {
    if (append) setLoadingMore(true);
    try {
      const res = await getTransactions({
        limit: 20,
        cursor,
      });
      const list = Array.isArray(res?.data) ? res.data : [];
      if (append) {
        setData((prev) => [...prev, ...list]);
      } else {
        setData(list);
      }
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch {
      if (!append) setData([]);
      toastError('Failed to load transactions');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
        Transactions
      </h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Your recent activity (newest first)
      </p>

      {(data ?? []).length === 0 ? (
        <p className="mt-6 text-[var(--text-muted)]">No transactions yet.</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-left text-sm text-[var(--text-muted)]">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-[var(--border-default)]"
                  >
                    <td className="py-3 pr-4 text-sm text-[var(--text-secondary)]">
                      {formatDate(tx.transactionDate)}
                    </td>
                    <td className="py-3 pr-4 font-medium">{tx.type}</td>
                    <td
                      className={`py-3 pr-4 font-mono ${
                        tx.amountCents >= 0
                          ? 'text-[var(--color-bank-success)]'
                          : 'text-[var(--color-bank-error)]'
                      }`}
                    >
                      {formatCents(tx.amountCents)}
                    </td>
                    <td className="py-3 pr-4 text-sm">{tx.status}</td>
                    <td className="py-3 text-sm text-[var(--text-muted)]">
                      {tx.transactionNote || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && nextCursor && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => load(nextCursor, true)}
                disabled={loadingMore}
                className="bank-btn-secondary"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
