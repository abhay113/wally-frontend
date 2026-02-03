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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      tokenExpiry: null,

      setAuth: (user, token, expiresIn = 86400000) => {
        // Default 24 hours in milliseconds
        const expiry = Date.now() + expiresIn;
        set({ user, token, tokenExpiry: expiry });
      },

      setUser: (user) => set({ user }),

      logout: () => set({ user: null, token: null, tokenExpiry: null }),

      isTokenValid: () => {
        const { token, tokenExpiry } = get();
        if (!token || !tokenExpiry) return false;
        return Date.now() < tokenExpiry;
      },
    }),
    {
      name: "wally-auth-storage",
      version: 1,
      storage: createJSONStorage(() => {
        // Safe localStorage access with fallback
        try {
          return localStorage;
        } catch {
          // Fallback for environments without localStorage (e.g., SSR, private browsing)
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
      }),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        tokenExpiry: state.tokenExpiry,
      }),
      onRehydrateStorage: () => (state) => {
        // Clean up expired tokens on app load
        if (state && !state.isTokenValid()) {
          console.log("Token expired on rehydration, logging out");
          state.logout();
        }
      },

      migrate: (persistedState: any, version: number) => {
        // Handle migrations if storage version changes
        if (version === 0) {
          // Migrate from version 0 to 1 (add tokenExpiry)
          return {
            ...persistedState,
            tokenExpiry: null,
          };
        }
        return persistedState as AuthState;
      },
    },
  ),
);
