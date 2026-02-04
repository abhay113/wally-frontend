interface EnvConfig {
  apiUrl: string;
  apiTimeout: number;
  enableMockData: boolean;
  enableAnalytics: boolean;
  appName: string;
  appVersion: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

function validateEnv(): EnvConfig {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    console.error("VITE_API_URL is not defined in environment variables");
    // Fallback to localhost for development
    if (import.meta.env.DEV) {
      console.warn("Using fallback API URL: http://localhost:3000/api/v1");
    } else {
      throw new Error("VITE_API_URL is required in production");
    }
  }

  return {
    apiUrl: apiUrl || "http://localhost:3000/api/v1",
    apiTimeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
    enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === "true",
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === "true",
    appName: import.meta.env.VITE_APP_NAME || "Wally",
    appVersion: import.meta.env.VITE_APP_VERSION || "1.0.0",
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
  };
}

export const env = validateEnv();

// Log configuration in development
if (env.isDevelopment) {
  console.log("Environment configuration:", {
    apiUrl: env.apiUrl,
    enableMockData: env.enableMockData,
    appVersion: env.appVersion,
  });
}
