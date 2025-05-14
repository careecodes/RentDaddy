import { apiClient } from './apiConfig';

// Type for admin check responses
interface AdminCheckResponse {
  admin_exists: boolean;
  tenants_exist: boolean;
  create_admin?: boolean;
  admin_clerk_id?: string;
  current_user_email?: string;
  first_admin_email?: string;
  first_admin_id?: number;
}

/**
 * Checks if an admin user exists in the database
 * Uses the centralized API client to handle authentication
 * @returns Promise with admin existence status
 */
export const checkAdminExists = async (): Promise<AdminCheckResponse> => {
  try {
    console.log('🔍 Checking if admin exists in the system...');
    
    // Get client's authentication status
    const { status } = apiClient.getAuthStatus();
    const isAuthenticated = status === 'authenticated';
    
    // Always use the authenticated endpoint if we're signed in
    const endpoint = isAuthenticated ? '/auth/check-admin' : '/check-admin';
    console.log(`🔄 Using ${isAuthenticated ? 'authenticated' : 'unauthenticated'} endpoint: ${endpoint}`);
    
    // Make request through API client
    const result = await apiClient.flexibleRequest<AdminCheckResponse>(endpoint);
    console.log('✅ Admin check response:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error checking admin existence:', error);
    throw error;
  }
};

/**
 * Sets up an admin user with the provided Clerk ID
 * Uses the centralized API client to handle authentication
 * @param clerkId The Clerk ID of the user to set as admin
 * @returns Promise with the response
 */
export const setupAdmin = async (clerkId: string): Promise<boolean> => {
  try {
    console.log(`🚀 Setting up admin with Clerk ID: ${clerkId}`);
    
    const payload = { clerk_id: clerkId };
    console.log(`📦 Request payload:`, payload);
    
    try {
      // Use the authenticated request method to ensure we have a token
      await apiClient.authenticatedRequest('/setup/admin', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      console.log(`✅ Admin setup successful`);
      return true;
    } catch (requestError: any) {
      // Check if this is a 409 Conflict error (admin already exists)
      if (requestError.message && requestError.message.includes('409 Conflict')) {
        console.log(`ℹ️ Admin already exists (409 Conflict) - this is expected behavior`);
        return true; // Consider this success
      }
      
      // For other errors, rethrow
      throw requestError;
    }
    
  } catch (error) {
    console.error('❌ Error setting up admin:', error);
    throw error;
  }
};

/**
 * Ensures that an admin user exists in the system
 * If no admin exists, attempts to set up the current user as admin
 * @param clerkId The Clerk ID of the current user
 */
export const ensureAdminExists = async (clerkId: string): Promise<void> => {
  try {
    console.log('🔍 Checking if admin exists in the system...');
    
    // First check if admin exists
    let adminCheckResponse: AdminCheckResponse;
    try {
      adminCheckResponse = await checkAdminExists();
      console.log('✅ Admin check response:', adminCheckResponse);
    } catch (checkError) {
      console.error('❌ Admin check failed:', checkError);
      // If we can't check admin existence, we can't proceed
      return;
    }
    
    // If no admin exists or the backend suggests creating an admin
    if (!adminCheckResponse.admin_exists || adminCheckResponse.create_admin) {
      // Use the suggested clerk ID if provided by the backend, otherwise use the current user's
      const adminClerkId = adminCheckResponse.admin_clerk_id || clerkId;
      
      console.log('⚠️ Creating admin user with Clerk ID:', adminClerkId);
      
      try {
        const setupResult = await setupAdmin(adminClerkId);
        console.log('✅ Admin setup successful!', setupResult);
        
        // Verify the setup worked
        try {
          const verifyResponse = await checkAdminExists();
          console.log('🔄 Verifying admin setup:', verifyResponse);
          
          if (!verifyResponse.admin_exists) {
            console.warn('⚠️ Admin setup might not have completed properly. Verify status manually.');
          }
        } catch (verifyError) {
          console.error('❌ Failed to verify admin setup:', verifyError);
        }
      } catch (setupError) {
        console.error('❌ Admin setup failed:', setupError);
        // If setup fails, we log it but don't rethrow to allow app to continue
      }
    } else {
      console.log('✅ Admin already exists, no setup needed.');
    }
  } catch (error) {
    console.error('❌ Admin setup process failed with unexpected error:', error);
    // Continue app execution even if this fails
  }
};