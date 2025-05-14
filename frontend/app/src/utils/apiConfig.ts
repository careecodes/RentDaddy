/**
 * Centralized API configuration and client with authentication management
 */

// Environment variables
const DOMAIN_URL = import.meta.env.VITE_DOMAIN_URL || 'localhost';
const PORT = import.meta.env.VITE_PORT || '8080';
const ENV = import.meta.env.ENV || 'development';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const MODE = import.meta.env.MODE;

// Debug environment variables at load time
console.log('API Config Environment:');
console.log('- MODE:', MODE);
console.log('- ENV:', ENV);
console.log('- VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
console.log('- VITE_SERVER_URL:', SERVER_URL);

/**
 * Base URL construction for API endpoints
 * - In production: domain without port 
 * - In development: domain with port
 */
export const getApiBaseUrl = (): string => {
  // Check if we're in production environment
  const isProduction = ENV === 'production';

  // Check if domain already includes protocol
  const hasProtocol = DOMAIN_URL.startsWith('http://') || DOMAIN_URL.startsWith('https://');

  // For production environment
  if (isProduction) {
    if (hasProtocol) {
      return DOMAIN_URL.replace(/\/$/, ''); // Remove trailing slash if present
    }
    return `https://${DOMAIN_URL}`.replace(/\/$/, '');
  }

  // For development environment
  if (hasProtocol) {
    // If the domain already has protocol but doesn't include port, add it
    // This is for URLs like "http://localhost" that need port added
    if (!DOMAIN_URL.includes(':' + PORT) && DOMAIN_URL !== 'http://localhost:' + PORT) {
      return `${DOMAIN_URL}:${PORT}`.replace(/\/$/, '');
    }
    return DOMAIN_URL.replace(/\/$/, '');
  }

  // Local development with port for domains without protocol
  return `http://${DOMAIN_URL}:${PORT}`.replace(/\/$/, '');
};

/**
 * The base API URL for the application
 */
export const API_URL = getApiBaseUrl();

/**
 * Constructs a full API endpoint URL
 */
export const getApiUrl = (path: string): string => {
  // Ensure path starts with a slash
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${formattedPath}`;
};

/**
 * Standard URL for server API endpoints
 * - Uses VITE_SERVER_URL in development
 * - Uses VITE_BACKEND_URL in production
 */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.curiousdev.net';
// Environment-appropriate URL selection
// This uses a build-time conditional that will be evaluated during the Vite build
// rather than at runtime, ensuring proper URL values in the built code
const getEnvironmentAppropriateServerUrl = (): string => {
  // For production builds, prioritize backend URL and never fallback to localhost
  if (MODE === 'production' || ENV === 'production' || import.meta.env.PROD === true) {
    console.log('🌎 Using production API URL configuration');
    
    // Use the backend URL if available
    if (BACKEND_URL && BACKEND_URL !== 'undefined') {
      return BACKEND_URL.replace(/\/$/, '');
    }
    
    // Production-safe fallback - never use localhost in production
    console.warn('⚠️ No valid backend URL found in production, using production fallback');
    return 'https://api.curiousdev.net';
  }
  
  // For development builds, we can use more flexible options
  console.log('🧪 Using development API URL configuration');
  
  // Try SERVER_URL first for local development
  if (SERVER_URL && SERVER_URL !== 'undefined') {
    return SERVER_URL.replace(/\/$/, '');
  }
  
  // Then try BACKEND_URL
  if (BACKEND_URL && BACKEND_URL !== 'undefined') {
    return BACKEND_URL.replace(/\/$/, '');
  }
  
  // Only in development do we fallback to localhost
  console.warn('⚠️ No valid backend URL found in development, falling back to localhost');
  return 'http://localhost:8080';
};

// Always ensure we have a valid URL - NEVER use 'undefined' as a URL component
export const SERVER_API_URL = getEnvironmentAppropriateServerUrl();

// Debug the final SERVER_API_URL
console.log('Final SERVER_API_URL:', SERVER_API_URL);

/**
 * Authentication status enum
 */
export enum AuthStatus {
  INITIALIZING = 'initializing',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  ERROR = 'error'
}

/**
 * Centralized API client that manages authentication state
 */
export class ApiClient {
  private authStatus: AuthStatus = AuthStatus.INITIALIZING;
  private authToken: string | null = null;
  private authError: Error | null = null;
  private authListeners: Set<() => void> = new Set();

  /**
   * Creates a new API client instance
   */
  constructor() {
    // Initialize auth status tracking
    console.log('🔐 API Client initialized');
  }

  /**
   * Updates auth status and notifies listeners
   */
  private setAuthStatus(status: AuthStatus, token: string | null = null, error: Error | null = null) {
    this.authStatus = status;
    this.authToken = token;
    this.authError = error;

    // Notify all listeners of the status change
    this.authListeners.forEach(listener => listener());
  }

  /**
   * Subscribes to auth status changes
   * @returns Unsubscribe function
   */
  public onAuthStatusChange(callback: () => void): () => void {
    this.authListeners.add(callback);
    return () => this.authListeners.delete(callback);
  }

  /**
   * Gets current auth status
   */
  public getAuthStatus(): { status: AuthStatus, token: string | null, error: Error | null } {
    return {
      status: this.authStatus,
      token: this.authToken,
      error: this.authError
    };
  }

  /**
   * Storage key for persisting authentication state
   */
  private readonly AUTH_TOKEN_KEY = 'rentdaddy_auth_token';

  /**
   * Checks if we have a cached token in session storage
   */
  private getPersistedToken(): string | null {
    try {
      // Only available in browser context
      if (typeof sessionStorage !== 'undefined') {
        return sessionStorage.getItem(this.AUTH_TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Failed to access sessionStorage:', e);
    }
    return null;
  }

  /**
   * Persists authentication token in session storage
   */
  private persistToken(token: string | null): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        if (token) {
          // Store the token
          sessionStorage.setItem(this.AUTH_TOKEN_KEY, token);

          // Store the timestamp when the token was saved
          sessionStorage.setItem('rentdaddy_auth_timestamp', Date.now().toString());
        } else {
          // Remove both token and timestamp if clearing
          sessionStorage.removeItem(this.AUTH_TOKEN_KEY);
          sessionStorage.removeItem('rentdaddy_auth_timestamp');
        }
      }
    } catch (e) {
      console.warn('Failed to persist token to sessionStorage:', e);
    }
  }

  /**
   * Initializes authentication from Clerk
   * Should be called when Clerk is ready
   */
  public async initializeAuth(getTokenFn: () => Promise<string | null>): Promise<void> {
    try {
      // Start by setting initializing state
      this.setAuthStatus(AuthStatus.INITIALIZING);

      // Always get a fresh token from Clerk - this is the source of truth
      const freshToken = await getTokenFn();

      // If we have a valid token from Clerk
      if (freshToken) {
        console.log('✅ Obtained valid token from Clerk');
        this.persistToken(freshToken);
        this.setAuthStatus(AuthStatus.AUTHENTICATED, freshToken);
        return;
      }

      // At this point, we don't have a token from Clerk
      // Check if we have a cached token as fallback (less reliable)
      const cachedToken = this.getPersistedToken();
      if (cachedToken) {
        console.log('⚠️ No token from Clerk, but found cached token. Using with caution...');

        // Use cached token but try to refresh again soon
        this.setAuthStatus(AuthStatus.AUTHENTICATED, cachedToken);

        // Try again in the background after a short delay
        setTimeout(() => {
          getTokenFn().then(retryToken => {
            if (retryToken) {
              this.persistToken(retryToken);
              this.setAuthStatus(AuthStatus.AUTHENTICATED, retryToken);
            } else {
              // If we still can't get a token, clear the cached one
              console.log('⚠️ Failed to refresh token, clearing cached token');
              this.persistToken(null);
              this.setAuthStatus(AuthStatus.UNAUTHENTICATED);
            }
          }).catch(() => {
            console.warn('Failed to refresh token on retry');
          });
        }, 1000); // Try again after 1 second

        return;
      }

      // No token from Clerk and no cached token
      console.log('⚠️ No authentication token available');
      this.persistToken(null);
      this.setAuthStatus(AuthStatus.UNAUTHENTICATED);

    } catch (error) {
      console.error('❌ Error initializing authentication:', error);
      // On error, clear any cached token to avoid using potentially invalid tokens
      this.persistToken(null);
      this.setAuthStatus(AuthStatus.ERROR, null, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Sets the authentication state directly from a cached token
   * This avoids the need to call Clerk's getToken() which triggers a network request
   */
  public setCachedAuthState(token: string): void {
    this.authToken = token;
    this.authStatus = AuthStatus.AUTHENTICATED;
    this.authError = null;

    // Notify listeners of the change
    this.authListeners.forEach(listener => listener());
  }

  /**
   * Makes an API request with authentication if available
   */
  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Ensure endpoint is valid and not undefined/null
    if (!endpoint || endpoint === 'undefined' || endpoint === 'null') {
      console.error('❌ Invalid endpoint provided:', endpoint);
      throw new Error(`Invalid API endpoint: ${endpoint}`);
    }
    
    // Format endpoint and construct URL with safety checks
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${SERVER_API_URL}${formattedEndpoint}`;
    
    // Debug URL construction
    console.log(`API URL: ${url}`);
    console.log(`API Request Details:
      - Endpoint: ${endpoint}
      - Server API URL: ${SERVER_API_URL}
      - Full URL: ${url}
      - Method: ${options.method || 'GET'}
      - Auth Status: ${this.authStatus}
      - Auth Token Present: ${this.authToken ? 'Yes' : 'No'}
    `);

    // Set up headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if authenticated
    if (this.authStatus === AuthStatus.AUTHENTICATED && this.authToken) {
      // Add Authorization header directly to the existing headers object
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Only log requests in development mode
    if (MODE === 'development') {
      console.log(`🔄 API Request: ${options.method || 'GET'} ${url}`);
      console.log(`🔐 Auth Status: ${this.authStatus}`);
    }

    // Make the request
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Special handling for 409 Conflict on admin setup
    if (response.status === 409 && endpoint.includes('/setup/admin')) {
      console.log('⚠️ Admin already exists (409 Conflict) - treating as success');
      return { success: true } as T;
    }

    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Check if response is empty (zero content length)
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0') {
      console.log('ℹ️ Empty response received, returning empty object');
      return {} as T;
    }

    // Check if response is not JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.log('ℹ️ Non-JSON response received, returning empty object');
      return {} as T;
    }

    try {
      // Try to parse the JSON response
      return await response.json() as T;
    } catch (error) {
      console.warn('⚠️ Failed to parse JSON response:', error);
      // Return empty object for empty responses
      return {} as T;
    }
  }

  /**
   * Checks if we're authenticated before making a request.
   * If not authenticated, throws an error.
   */
  public async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (this.authStatus !== AuthStatus.AUTHENTICATED) {
      throw new Error(`Cannot make authenticated request to ${endpoint} - not authenticated`);
    }

    return this.request<T>(endpoint, options);
  }

  /**
   * Makes a request that can work with or without authentication.
   * If authenticated, includes the token. If not, proceeds without it.
   */
  public async flexibleRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return this.request<T>(endpoint, options);
  }
}

// Create a singleton instance
export const apiClient = new ApiClient();

// Legacy API request function for backward compatibility
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  getTokenFn?: () => Promise<string | null>
): Promise<T> {
  console.warn('⚠️ Using deprecated apiRequest function - consider using ApiClient instead');

  // Use the client for the actual request
  if (getTokenFn) {
    const token = await getTokenFn();
    const headers: HeadersInit = {
      ...options.headers,
    };

    if (token) {
      // Use spread operator to add Authorization header to avoid TypeScript index error
      const updatedHeaders = {
        ...headers,
        'Authorization': `Bearer ${token}`
      };
      return apiClient.request<T>(endpoint, {
        ...options,
        headers: updatedHeaders
      });
    }

    return apiClient.request<T>(endpoint, {
      ...options,
      headers
    });
  }

  return apiClient.request<T>(endpoint, options);
}