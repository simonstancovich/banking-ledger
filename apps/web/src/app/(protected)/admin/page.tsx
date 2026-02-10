'use client';

import { useEffect, useState } from 'react';
import {
  getUsers,
  getAccounts,
  getTransactionsByUserId,
  getTransactionsAdmin,
} from '@/lib/api/requests';
import type {
  UserListItem,
  TransactionListItem,
  GetAllAccountsResponse,
  GetAllUsersResponse,
} from '@/lib/api/types';
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

type Tab = 'users' | 'accounts' | 'transactions-user' | 'transactions-all';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersRes, setUsersRes] = useState<GetAllUsersResponse | null>(null);
  const [accountsRes, setAccountsRes] = useState<GetAllAccountsResponse | null>(
    null,
  );
  const [emailFilter, setEmailFilter] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [accountEmailFilter, setAccountEmailFilter] = useState('');
  const [transactionsUser, setTransactionsUser] = useState<
    TransactionListItem[]
  >([]);
  const [transactionsAll, setTransactionsAll] = useState<TransactionListItem[]>(
    [],
  );
  const [nextCursorUser, setNextCursorUser] = useState<string | undefined>();
  const [nextCursorAll, setNextCursorAll] = useState<string | undefined>();
  const [hasMoreUser, setHasMoreUser] = useState(false);
  const [hasMoreAll, setHasMoreAll] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingTxUser, setLoadingTxUser] = useState(false);
  const [loadingTxAll, setLoadingTxAll] = useState(false);

  useEffect(() => {
    getUsers({ page: 1, limit: 200 })
      .then((res) => {
        setUsersRes(res);
        setUsers(res.data);
      })
      .catch(() => {
        toastError('Failed to load users');
        setUsers([]);
      })
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    setLoadingAccounts(true);
    getAccounts({ page: 1, limit: 500 })
      .then((res) => {
        if (!Array.isArray(res)) {
          setAccountsRes(res);
        } else {
          setAccountsRes({
            data: [],
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
          });
        }
      })
      .catch(() => {
        toastError('Failed to load accounts');
        setAccountsRes(null);
      })
      .finally(() => setLoadingAccounts(false));
  }, []);

  const filteredUsers = emailFilter.trim()
    ? users.filter((u) =>
        u.email.toLowerCase().includes(emailFilter.trim().toLowerCase()),
      )
    : users;

  const accountsFiltered = accountsRes
    ? accountsRes.data.filter((a) => {
        if (selectedUserId && a.user.id !== selectedUserId) return false;
        if (accountEmailFilter.trim()) {
          return a.user.email
            .toLowerCase()
            .includes(accountEmailFilter.trim().toLowerCase());
        }
        return true;
      })
    : [];

  const loadTransactionsUser = async (cursor?: string, append = false) => {
    if (!selectedUserId) return;
    if (!append) setLoadingTxUser(true);
    try {
      const res = await getTransactionsByUserId(selectedUserId, {
        limit: 30,
        cursor,
      });
      if (append) {
        setTransactionsUser((prev) => [...prev, ...res.data]);
      } else {
        setTransactionsUser(res.data);
      }
      setNextCursorUser(res.nextCursor);
      setHasMoreUser(res.hasMore);
    } catch {
      if (!append) setTransactionsUser([]);
      toastError('Failed to load user transactions');
    } finally {
      setLoadingTxUser(false);
    }
  };

  const loadTransactionsAll = async (cursor?: string, append = false) => {
    if (!append) setLoadingTxAll(true);
    try {
      const res = await getTransactionsAdmin({ limit: 30, cursor });
      if (append) {
        setTransactionsAll((prev) => [...prev, ...res.data]);
      } else {
        setTransactionsAll(res.data);
      }
      setNextCursorAll(res.nextCursor);
      setHasMoreAll(res.hasMore);
    } catch {
      if (!append) setTransactionsAll([]);
      toastError('Failed to load all transactions');
    } finally {
      setLoadingTxAll(false);
    }
  };

  useEffect(() => {
    if (tab === 'transactions-user' && selectedUserId) {
      loadTransactionsUser();
    }
  }, [tab, selectedUserId]);

  useEffect(() => {
    if (tab === 'transactions-all') {
      loadTransactionsAll();
    }
  }, [tab]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
        Admin
      </h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Users, accounts by email, and transactions
      </p>

      <div className="mt-6 flex gap-2 border-b border-[var(--border-default)]">
        {(
          [
            ['users', 'Users'],
            ['accounts', 'Accounts by user'],
            ['transactions-user', 'Transactions (user)'],
            ['transactions-all', 'All transactions'],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'border-[var(--color-bank-accent)] text-[var(--color-bank-accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="mt-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              Filter by email
            </label>
            <input
              type="text"
              className="bank-input mt-1 max-w-xs"
              placeholder="Search email…"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
            />
          </div>
          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-left text-sm text-[var(--text-muted)]">
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Role</th>
                    <th className="pb-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="cursor-pointer border-b border-[var(--border-default)] hover:bg-[var(--border-default)]/50"
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setTab('accounts');
                      }}
                    >
                      <td className="py-3 pr-4 font-medium">{u.email}</td>
                      <td className="py-3 pr-4">{u.role}</td>
                      <td className="py-3 text-sm text-[var(--text-muted)]">
                        {formatDate(u.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {usersRes && (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Showing {filteredUsers.length} of {usersRes.total} users
            </p>
          )}
        </div>
      )}

      {tab === 'accounts' && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Filter by owner email
              </label>
              <input
                type="text"
                className="bank-input mt-1 w-64"
                placeholder="e.g. user@example.com"
                value={accountEmailFilter}
                onChange={(e) => setAccountEmailFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Or select user
              </label>
              <select
                className="bank-input mt-1 w-64"
                value={selectedUserId ?? ''}
                onChange={(e) => setSelectedUserId(e.target.value || null)}
              >
                <option value="">All accounts</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {loadingAccounts ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-left text-sm text-[var(--text-muted)]">
                    <th className="pb-3 pr-4 font-medium">Account</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Balance</th>
                    <th className="pb-3 font-medium">Owner email</th>
                  </tr>
                </thead>
                <tbody>
                  {accountsFiltered.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-[var(--border-default)]"
                    >
                      <td className="py-3 pr-4 font-medium">{a.name}</td>
                      <td className="py-3 pr-4">{a.type}</td>
                      <td className="py-3 pr-4 font-mono">
                        {formatCents(a.balanceCents)}
                      </td>
                      <td className="py-3 text-sm">{a.user.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {accountsRes && (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Showing {accountsFiltered.length} of {accountsRes.data.length}{' '}
              accounts
            </p>
          )}
        </div>
      )}

      {tab === 'transactions-user' && (
        <div className="mt-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              User (select from Users tab first)
            </label>
            <select
              className="bank-input mt-1 max-w-md"
              value={selectedUserId ?? ''}
              onChange={(e) => setSelectedUserId(e.target.value || null)}
            >
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>
          {!selectedUserId ? (
            <p className="text-[var(--text-muted)]">
              Select a user to load their transactions.
            </p>
          ) : loadingTxUser ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-default)] text-left text-sm text-[var(--text-muted)]">
                      <th className="pb-3 pr-4 font-medium">Date</th>
                      <th className="pb-3 pr-4 font-medium">Type</th>
                      <th className="pb-3 pr-4 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionsUser.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-[var(--border-default)]"
                      >
                        <td className="py-3 pr-4 text-sm">
                          {formatDate(tx.transactionDate)}
                        </td>
                        <td className="py-3 pr-4">{tx.type}</td>
                        <td
                          className={`py-3 pr-4 font-mono ${
                            tx.amountCents >= 0
                              ? 'text-[var(--color-bank-success)]'
                              : 'text-[var(--color-bank-error)]'
                          }`}
                        >
                          {formatCents(tx.amountCents)}
                        </td>
                        <td className="py-3">{tx.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMoreUser && nextCursorUser && (
                <button
                  type="button"
                  className="bank-btn-secondary mt-4"
                  onClick={() => loadTransactionsUser(nextCursorUser, true)}
                >
                  Load more
                </button>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'transactions-all' && (
        <div className="mt-6">
          {loadingTxAll ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-default)] text-left text-sm text-[var(--text-muted)]">
                      <th className="pb-3 pr-4 font-medium">Date</th>
                      <th className="pb-3 pr-4 font-medium">Type</th>
                      <th className="pb-3 pr-4 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionsAll.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-[var(--border-default)]"
                      >
                        <td className="py-3 pr-4 text-sm">
                          {formatDate(tx.transactionDate)}
                        </td>
                        <td className="py-3 pr-4">{tx.type}</td>
                        <td
                          className={`py-3 pr-4 font-mono ${
                            tx.amountCents >= 0
                              ? 'text-[var(--color-bank-success)]'
                              : 'text-[var(--color-bank-error)]'
                          }`}
                        >
                          {formatCents(tx.amountCents)}
                        </td>
                        <td className="py-3">{tx.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMoreAll && nextCursorAll && (
                <button
                  type="button"
                  className="bank-btn-secondary mt-4"
                  onClick={() => loadTransactionsAll(nextCursorAll, true)}
                >
                  Load more
                </button>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
