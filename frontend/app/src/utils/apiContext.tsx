import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ApiClient, apiClient, AuthStatus } from './apiConfig';
import { useAuth } from '@clerk/react-router';

// Create context for the API client
const ApiContext = createContext<{
  apiClient: ApiClient;
  isAuthReady: boolean;
  isAuthenticated: boolean;
  authError: Error | null;
} | null>(null);

// Custom provider component
export function ApiProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded: isClerkLoaded, isSignedIn } = useAuth();
  // Initialize with "optimistic" values for quick startup
  // BUT we need to be careful about assuming authentication on first render
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing token immediately on component initialization
  React.useEffect(() => {
    try {
      const hasPersistedToken = sessionStorage.getItem('rentdaddy_auth_token') !== null;

      // Only set optimistic auth if Clerk also thinks we're signed in
      // This fixes a race condition where session storage has a token but Clerk isn't ready
      if (hasPersistedToken && isClerkLoaded && isSignedIn) {
        console.log('🔑 Using cached authentication token');
        setIsAuthReady(true);
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.warn('Failed to check session storage for auth token', e);
    }
  }, [isClerkLoaded, isSignedIn]);
  const [authError, setAuthError] = useState<Error | null>(null);

  // Initialize auth when Clerk is loaded
  useEffect(() => {
    // Only show loading message on the first load, not on refreshes
    const isFirstLoad = sessionStorage.getItem('has_loaded_before') !== 'true';

    if (!isClerkLoaded) {
      if (isFirstLoad) {
        console.log('🕒 Waiting for Clerk to load...');
      }
      return;
    }

    // Mark that we've loaded at least once
    sessionStorage.setItem('has_loaded_before', 'true');

    if (!isSignedIn) {
      console.log('👤 User is not signed in');
      setIsAuthReady(true);
      setIsAuthenticated(false);
      return;
    }

    // Check if we already have a valid token in session storage
    try {
      const cachedToken = sessionStorage.getItem('rentdaddy_auth_token');
      const tokenTimestamp = sessionStorage.getItem('rentdaddy_auth_timestamp');
      const now = Date.now();

      // If we have a cached token that's less than 55 minutes old (tokens typically last 1hr)
      // We can skip the getToken() call which triggers a network request
      if (cachedToken && tokenTimestamp && (now - parseInt(tokenTimestamp, 10)) < 55 * 60 * 1000) {
        console.log('✅ Using cached token (still valid)');

        // Set auth state using cached token
        apiClient.setCachedAuthState(cachedToken);
        setIsAuthenticated(true);
        setAuthError(null);
        setIsAuthReady(true);
        return;
      }
    } catch (e) {
      console.warn('Failed to check cached token validity', e);
    }

    // If we don't have a valid cached token, initialize auth
    console.log('🔄 Initializing API authentication (cached token expired or missing)');

    // Set up API client with authentication
    const initAuth = async () => {
      try {
        await apiClient.initializeAuth(getToken);

        // Update auth state based on client status
        const status = apiClient.getAuthStatus();
        setIsAuthenticated(status.status === AuthStatus.AUTHENTICATED);
        setAuthError(status.error);
        setIsAuthReady(true);

        // Store token timestamp for future validity checks
        if (status.status === AuthStatus.AUTHENTICATED && status.token) {
          sessionStorage.setItem('rentdaddy_auth_timestamp', Date.now().toString());
        }

        console.log(`✅ API authentication initialized: ${status.status}`);
      } catch (error) {
        console.error('❌ Failed to initialize API authentication:', error);
        setAuthError(error instanceof Error ? error : new Error(String(error)));
        setIsAuthReady(true);
        setIsAuthenticated(false);
      }
    };

    initAuth();

    // Set up listener for auth status changes
    const unsubscribe = apiClient.onAuthStatusChange(() => {
      const status = apiClient.getAuthStatus();
      setIsAuthenticated(status.status === AuthStatus.AUTHENTICATED);
      setAuthError(status.error);
    });

    return () => unsubscribe();
  }, [isClerkLoaded, isSignedIn, getToken, isAuthenticated]);

  // Provide API client and auth state to children
  return (
    <ApiContext.Provider value={{ apiClient, isAuthReady, isAuthenticated, authError }}>
      {children}
    </ApiContext.Provider>
  );
}

// Custom hook to use the API client
export function useApi() {
  const context = useContext(ApiContext);

  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }

  return context;
}

// Convenience hook that provides the raw client
export function useApiClient() {
  return useApi().apiClient;
}

// Convenience hook for accessing auth-related states
export function useApiAuth() {
  const { isAuthReady, isAuthenticated, authError } = useApi();
  return { isAuthReady, isAuthenticated, authError };
}