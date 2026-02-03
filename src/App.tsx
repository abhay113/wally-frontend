import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NetworkStatus } from "@/components/NetworkStatus";
import AuthLayout from "@/layouts/AuthLayout";
import ProtectedLayout from "@/layouts/ProtectedLayout";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import DashboardPage from "@/pages/Dashboard";
import SendPage from "@/pages/Send";
import HistoryPage from "@/pages/History";
import TransactionDetailPage from "@/pages/TransactionDetail";
import ProfilePage from "@/pages/Profile";
import AdminPage from "@/pages/Admin";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, isTokenValid, logout } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token && !isTokenValid()) {
        console.log("Token expired, logging out");
        logout();
      }
      setIsChecking(false);
    };

    checkAuth();
  }, [token, isTokenValid, logout]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!token || !isTokenValid()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, isTokenValid } = useAuthStore();

  if (token && isTokenValid()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, token, isTokenValid } = useAuthStore();

  if (!token || !isTokenValid()) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <NetworkStatus />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          classNames: {
            error: "border-destructive",
            success: "border-success",
            warning: "border-yellow-500",
            info: "border-blue-500",
          },
        }}
      />
      <Routes>
        {/* Redirect root to dashboard or login */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Navigate to="/dashboard" replace />
            </PrivateRoute>
          }
        />

        {/* Public Routes */}
        <Route
          element={
            <PublicRoute>
              <AuthLayout />
            </PublicRoute>
          }
        >
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected Routes */}
        <Route
          element={
            <PrivateRoute>
              <ProtectedLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/send" element={<SendPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<TransactionDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <ProtectedLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminPage />} />
        </Route>

        {/* 404 Route */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-background">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-muted-foreground mb-4">Page not found</p>
                <a href="/dashboard" className="text-primary hover:underline">
                  Go to Dashboard
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}
