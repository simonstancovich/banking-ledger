/** Auth/me and user profile */
export interface Me {
  user: {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
    createdAt: string;
    updatedAt: string;
  };
  created: boolean;
}

/** Account (user view) */
export interface Account {
  id: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'OTHER';
  name: string;
  balanceCents: number;
  createdAt: string;
  updatedAt: string;
}

/** Account with owner (admin list) */
export interface AccountWithUser extends Account {
  user: { id: string; email: string };
}

/** Paginated accounts (admin) */
export interface GetAllAccountsResponse {
  data: AccountWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Transaction list item (single or list) */
export interface TransactionListItem {
  id: string;
  accountId: string;
  amountCents: number;
  transferId: string;
  transactionDate: string;
  transactionNote: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'OTHER';
  createdAt: string;
}

/** Paginated transactions */
export interface GetTransactionsResponse {
  data: TransactionListItem[];
  nextCursor?: string;
  hasMore: boolean;
}

/** Transfer request */
export interface CreateTransferBody {
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  transactionNote?: string;
}

/** Deposit request */
export interface CreateDepositBody {
  accountId: string;
  amountCents: number;
  transactionNote?: string;
}

/** Withdrawal request */
export interface CreateWithdrawalBody {
  accountId: string;
  amountCents: number;
  transactionNote?: string;
}

/** Create account request */
export interface CreateAccountBody {
  name: string;
  type?: Account['type'];
  balanceCents?: number;
}

/** User (admin list) */
export interface UserListItem {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

/** Paginated users (admin) */
export interface GetAllUsersResponse {
  data: UserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
