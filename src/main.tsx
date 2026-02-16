import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initializeApiClient } from "./lib/api";
import { useAuthStore } from "./lib/store";
import "./index.css";

// Initialize the API client with the auth store
const { getState } = useAuthStore;

initializeApiClient({
  getToken: () => getState().token,
  getRefreshToken: () => getState().refreshToken,
  isTokenValid: () => getState().isTokenValid(),
  logout: () => getState().logout(),
  updateTokens: (tokens) => getState().updateTokens(tokens),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
