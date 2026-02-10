import { api } from '@/lib/api/client';
import type {
  Me,
  Account,
  GetAllAccountsResponse,
  GetTransactionsResponse,
  TransactionListItem,
  CreateTransferBody,
  CreateDepositBody,
  CreateWithdrawalBody,
  CreateAccountBody,
  GetAllUsersResponse,
} from '@/lib/api/types';

/** Paths are relative to API baseURL (e.g. /api/v1) */
const BASE = '';

/** Auth: get or create current user (after Firebase login) */
export async function getMe(): Promise<Me> {
  return api.get<Me>(`${BASE}/auth/me`);
}

/** Accounts: list mine (or as admin paginated list) */
export async function getAccounts(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<Account[] | GetAllAccountsResponse> {
  return api.get<Account[] | GetAllAccountsResponse>(`${BASE}/accounts`, {
    params,
  });
}

/** Accounts: get one by id */
export async function getAccount(id: string): Promise<Account> {
  return api.get<Account>(`${BASE}/accounts/${id}`);
}

/** Accounts: create */
export async function createAccount(body: CreateAccountBody): Promise<Account> {
  return api.post<Account>(`${BASE}/accounts`, body);
}

/** Transactions: list mine (cursor pagination). Uses raw client so we get full { data, nextCursor, hasMore } (default extractor would return only the inner data array). */
export async function getTransactions(params?: {
  limit?: number;
  cursor?: string;
  accountIds?: string[];
  since?: string;
  until?: string;
}): Promise<GetTransactionsResponse> {
  const res = await api.client.get<GetTransactionsResponse>(
    `${BASE}/transactions`,
    {
      params: params?.accountIds?.length
        ? { ...params, accountIds: params.accountIds.join(',') }
        : params,
    },
  );
  return res.data;
}

/** Transactions: get one by id */
export async function getTransaction(id: string): Promise<TransactionListItem> {
  return api.get<TransactionListItem>(`${BASE}/transactions/${id}`);
}

/** Transactions: transfer (requires Idempotency-Key header) */
export async function createTransfer(
  body: CreateTransferBody,
  idempotencyKey: string,
): Promise<{
  result: unknown;
  idempotencyStatus: 'CREATED' | 'COMPLETED';
}> {
  return api.client
    .post(`${BASE}/transactions/transfer`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    .then((res) => res.data);
}

/** Transactions: deposit */
export async function createDeposit(
  body: CreateDepositBody,
  idempotencyKey: string,
): Promise<{ result: unknown; idempotencyStatus: 'CREATED' | 'COMPLETED' }> {
  return api.client
    .post(`${BASE}/transactions/deposit`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    .then((res) => res.data);
}

/** Transactions: withdrawal */
export async function createWithdrawal(
  body: CreateWithdrawalBody,
  idempotencyKey: string,
): Promise<{ result: unknown; idempotencyStatus: 'CREATED' | 'COMPLETED' }> {
  return api.client
    .post(`${BASE}/transactions/withdrawal`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    .then((res) => res.data);
}

/** Users: list all (admin only) */
export async function getUsers(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<GetAllUsersResponse> {
  return api.get<GetAllUsersResponse>(`${BASE}/users`, { params });
}

/** Transactions: by userId (admin only) */
export async function getTransactionsByUserId(
  userId: string,
  params?: { limit?: number; cursor?: string; since?: string; until?: string },
): Promise<GetTransactionsResponse> {
  return api.get<GetTransactionsResponse>(
    `${BASE}/transactions/admin/by-user/${userId}`,
    { params },
  );
}

/** Transactions: all (admin only) */
export async function getTransactionsAdmin(params?: {
  limit?: number;
  cursor?: string;
  since?: string;
  until?: string;
}): Promise<GetTransactionsResponse> {
  return api.get<GetTransactionsResponse>(`${BASE}/transactions/admin/all`, {
    params,
  });
}
