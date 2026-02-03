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
import { toast } from "sonner";
import { env } from "@/config/env";

const API_BASE_URL = env.apiUrl;

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: env.apiTimeout,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    const isTokenValid = useAuthStore.getState().isTokenValid;

    if (token && isTokenValid()) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    const status = error.response?.status;
    const token = useAuthStore.getState().token;

    // Extract error message
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "An unexpected error occurred";

    // Handle specific error cases
    if (status === 401 && token) {
      // Unauthorized - token expired or invalid
      useAuthStore.getState().logout();
      toast.error("Session expired. Please login again.");

      // Prevent navigation loops
      if (!window.location.pathname.includes("/login")) {
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      }
    } else if (status === 403) {
      toast.error("Access denied. You do not have permission.");
    } else if (status === 404) {
      // Don't show toast for 404s, let components handle it
      console.warn("Resource not found:", error.config?.url);
    } else if (status === 429) {
      toast.error("Too many requests. Please try again later.");
    } else if (status && status >= 500) {
      toast.error("Server error. Please try again later.");
    } else if (!error.response) {
      // Network error
      toast.error("Network error. Please check your connection.");
    } else if (status && status >= 400 && status < 500) {
      // Other client errors - show the message
      toast.error(errorMessage);
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
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state even if API call fails
    }
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },
};

// Wallet API
export const walletApi = {
  getWallet: async (): Promise<Wallet> => {
    const response = await apiClient.get<Wallet>("/users/me");
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
      "/transactions/history",
      { params },
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
      { params },
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
