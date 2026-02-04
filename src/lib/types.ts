export interface User {
  id: string;
  email: string;
  handle: string;
  // Added these fields to fix the error
  firstName?: string;
  lastName?: string;
  role: "user" | "admin";
  status: "active" | "blocked";
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  senderId: string;
  senderHandle: string;
  receiverId: string;
  receiverHandle: string;
  amount: number;
  currency: string;
  note?: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  completedAt: string;
  failureReason?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  activeUsers: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  handle: string;
}

export interface TransferRequest {
  recipientHandle: string;
  amount: number;
  note?: string;
  idempotencyKey: string;
}

export interface FundWalletRequest {
  amount: number;
}

export interface WalletResponse {
  id: string;
  wallet: {
    id: string;
    balance: string;
  };
}

export interface FundWalletResponse {
  wallet: {
    id: string;
    balance: string;
  };
}

export interface TransactionsResponse {
  data: {
    transactions: Transaction[];
  };
}
// 1. Structure for GET /wallet response
export interface WalletApiResponse {
  success: boolean;
  data: {
    id: string; // User ID
    wallet: {
      id: string;
      balance: string;
      status: string;
      publicKey?: string;
    };
  };
}

// 2. Structure for GET /transactions response
export interface HistoryApiResponse {
  success: boolean;
  data: {
    transactions: Array<{
      id: string;
      type: "SENT" | "RECEIVED";
      amount: string;
      status: string; // "SUCCESS", "FAILED", etc.
      createdAt: string;
      note?: string;
      counterparty: {
        handle: string;
      };
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// 3. Interface to handle Axios-like error objects safely
export interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}
