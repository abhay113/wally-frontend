import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  token: string | null;
  tokenExpiry: number | null;
  setAuth: (user: User, token: string, expiresIn?: number) => void;
  setUser: (user: User) => void;
  logout: () => void;
  isTokenValid: () => boolean;
}

type PersistedAuthState = Pick<AuthState, "user" | "token" | "tokenExpiry">;

function isPersistedAuthState(value: unknown): value is PersistedAuthState {
  if (typeof value !== "object" || value === null) return false;

  const v = value as Record<string, unknown>;

  return "user" in v && "token" in v && "tokenExpiry" in v;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      tokenExpiry: null,

      setAuth: (user, token, expiresIn = 86_400_000) => {
        // Default: 24h
        set({
          user,
          token,
          tokenExpiry: Date.now() + expiresIn,
        });
      },

      setUser: (user) => set({ user }),

      logout: () =>
        set({
          user: null,
          token: null,
          tokenExpiry: null,
        }),

      isTokenValid: () => {
        const { token, tokenExpiry } = get();
        return Boolean(token && tokenExpiry && Date.now() < tokenExpiry);
      },
    }),
    {
      name: "wally-auth-storage",
      version: 1,

      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          // SSR / restricted environments
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
      }),

      partialize: (state): PersistedAuthState => ({
        user: state.user,
        token: state.token,
        tokenExpiry: state.tokenExpiry,
      }),

      onRehydrateStorage: () => (state) => {
        if (state && !state.isTokenValid()) {
          state.logout();
        }
      },

      migrate: (
        persistedState: unknown,
        version: number,
      ): PersistedAuthState => {
        // Corrupted or missing storage
        if (!isPersistedAuthState(persistedState)) {
          return {
            user: null,
            token: null,
            tokenExpiry: null,
          };
        }

        // Example future migration
        if (version === 0) {
          return {
            ...persistedState,
            tokenExpiry: null,
          };
        }

        return persistedState;
      },
    },
  ),
);
