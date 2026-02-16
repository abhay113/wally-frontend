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
import { toast } from "sonner";
import { env } from "@/config/env";

const API_BASE_URL = env.apiUrl;

// Store reference to avoid circular dependencies
let getAuthToken: (() => string | null) | null = null;
let getRefreshToken: (() => string | null) | null = null;
// let isTokenValid: (() => boolean) | null = null;
let logoutUser: (() => void) | null = null;
let updateTokens:
  | (({
    token,
    refreshToken,
    expiresIn,
  }: {
    token: string;
    refreshToken: string;
    expiresIn?: number;
  }) => void)
  | null = null;

// Initialize auth store references
export const initializeApiClient = (authStore: {
  getToken: () => string | null;
  getRefreshToken: () => string | null;
  isTokenValid: () => boolean;
  logout: () => void;
  updateTokens: (tokens: {
    token: string;
    refreshToken: string;
    expiresIn?: number;
  }) => void;
}) => {
  getAuthToken = authStore.getToken;
  getRefreshToken = authStore.getRefreshToken;
  // isTokenValid = authStore.isTokenValid;
  logoutUser = authStore.logout;
  updateTokens = authStore.updateTokens;
};

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: env.apiTimeout,
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent multiple simultaneous logout toasts
let isLoggingOut = false;

// Queue for requests waiting for token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (getAuthToken) {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
  async (error: AxiosError<{ message?: string; error?: string }>) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };
    const status = error.response?.status;

    // Extract error message
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "An unexpected error occurred";

    // Handle 401 - Unauthorized (token refresh logic)
    if (status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for the token refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken?.();

      if (refreshToken) {
        try {
          // Attempt to refresh the token
          const response = await axios.post<AuthResponse>(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken },
          );

          const { token, refreshToken: newRefreshToken, expiresIn } = response.data;

          // Update tokens in store
          updateTokens?.({ token, refreshToken: newRefreshToken, expiresIn });

          // Update header for original request
          originalRequest.headers.Authorization = `Bearer ${token}`;

          // Process queued requests
          processQueue(null, token);

          isRefreshing = false;

          // Retry original request
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as Error, null);
          isRefreshing = false;

          // Refresh failed - logout user
          if (!isLoggingOut) {
            isLoggingOut = true;
            logoutUser?.();
            toast.error("Session expired. Please login again.");

            // Navigate to login (only in browser environment)
            if (
              typeof window !== "undefined" &&
              !window.location.pathname.includes("/login")
            ) {
              setTimeout(() => {
                window.location.href = "/login";
                isLoggingOut = false;
              }, 100);
            } else {
              isLoggingOut = false;
            }
          }

          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available - logout
        isRefreshing = false;

        if (!isLoggingOut) {
          isLoggingOut = true;
          logoutUser?.();
          toast.error("Session expired. Please login again.");

          if (
            typeof window !== "undefined" &&
            !window.location.pathname.includes("/login")
          ) {
            setTimeout(() => {
              window.location.href = "/login";
              isLoggingOut = false;
            }, 100);
          } else {
            isLoggingOut = false;
          }
        }

        return Promise.reject(error);
      }
    }

    // Handle other errors
    if (status === 403) {
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
    } else if (
      status &&
      status >= 400 &&
      status < 500 &&
      status !== 401 &&
      status !== 404
    ) {
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
      const refreshToken = getRefreshToken?.();
      if (!refreshToken) {
        console.warn("No refresh token available for logout");
        return;
      }

      await apiClient.post("/auth/logout", { refreshToken });
    } catch (error) {
      // Log the error but don't prevent logout on client side
      console.error("Logout API error:", error);
      // Still allow the error to be handled by caller if needed
      throw error;
    }
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/refresh", {
      refreshToken,
    });
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
