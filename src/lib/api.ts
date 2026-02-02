import axios, { type AxiosInstance, type AxiosError } from "axios";
import type {
  User,
  Wallet,
  Transaction,
  AuthResponse,
  PaginatedResponse,
  AdminStats,
  LoginRequest,
  RegisterRequest,
  TransferRequest,
  FundWalletRequest,
} from "./types";
import { useAuthStore } from "./store";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const token = useAuthStore.getState().token;

    // 🔐 Only logout if user WAS logged in
    if (status === 401 && token) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/login", data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },
};

// Wallet API
export const walletApi = {
  getWallet: async (): Promise<Wallet> => {
    const response = await apiClient.get<Wallet>("/wallet");
    return response.data;
  },

  fund: async (data: FundWalletRequest): Promise<Wallet> => {
    const response = await apiClient.post<Wallet>("/wallet/fund", data);
    return response.data;
  },
};

// Transactions API
export const transactionsApi = {
  transfer: async (data: TransferRequest): Promise<Transaction> => {
    const response = await apiClient.post<Transaction>(
      "/transactions/send",
      data,
    );
    return response.data;
  },

  getHistory: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    filter?: string;
  }): Promise<PaginatedResponse<Transaction>> => {
    const response = await apiClient.get<PaginatedResponse<Transaction>>(
      "/transactions",
      {
        params,
      },
    );
    return response.data;
  },

  getById: async (id: string): Promise<Transaction> => {
    const response = await apiClient.get<Transaction>(`/transactions/${id}`);
    return response.data;
  },
};

// User API
export const userApi = {
  updateHandle: async (handle: string): Promise<User> => {
    const response = await apiClient.patch<User>("/user/handle", { handle });
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>("/user/profile");
    return response.data;
  },
};

// Admin API
export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const response = await apiClient.get<AdminStats>("/admin/stats");
    return response.data;
  },

  getUsers: async (params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>(
      "/admin/users",
      {
        params,
      },
    );
    return response.data;
  },

  blockUser: async (userId: string): Promise<User> => {
    const response = await apiClient.post<User>(`/admin/users/${userId}/block`);
    return response.data;
  },

  unblockUser: async (userId: string): Promise<User> => {
    const response = await apiClient.post<User>(
      `/admin/users/${userId}/unblock`,
    );
    return response.data;
  },
};

export default apiClient;
