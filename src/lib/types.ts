export interface User {
  id: string
  email: string
  handle: string
  role: 'user' | 'admin'
  status: 'active' | 'blocked'
  createdAt: string
}

export interface Wallet {
  id: string
  userId: string
  balance: number
  currency: string
  updatedAt: string
}

export interface Transaction {
  id: string
  senderId: string
  senderHandle: string
  receiverId: string
  receiverHandle: string
  amount: number
  currency: string
  note?: string
  status: 'pending' | 'completed' | 'failed'
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface ApiError {
  message: string
  code?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminStats {
  totalUsers: number
  totalTransactions: number
  totalVolume: number
  activeUsers: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  handle: string
}

export interface TransferRequest {
  recipientHandle: string
  amount: number
  note?: string
  idempotencyKey: string
}

export interface FundWalletRequest {
  amount: number
}
