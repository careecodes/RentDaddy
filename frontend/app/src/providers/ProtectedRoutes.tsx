// This component is used to protect routes that are only accessible to signed in users
// It also checks the user's role and redirects to the correct route based on the role
// The ProtectedRoutes component is used in the Main.tsx file as a Route element that wraps the Tenant and Admin routes

import { useUser } from "@clerk/react-router";
import { Spin } from "antd";
import { Navigate, Outlet, useLocation } from "react-router";
import { ensureAdminExists } from "../utils/adminSetup";
import { useEffect } from "react";
import { useApiAuth } from "../utils/apiContext";
import { ClerkPublicMetadata } from "../types/types";


const ProtectedRoutes = () => {
    // Get Clerk User to get the user's role
    const { isSignedIn, isLoaded, user } = useUser();

    // Get API authentication status 
    const { isAuthReady, isAuthenticated } = useApiAuth();

    // Get the current path to check if the user is trying to access a tenant or admin route
    const location = useLocation();
    const currentPath = location.pathname;

    // Try to set up admin user when a user is authenticated and API auth is ready
    useEffect(() => {
        // Use session storage to track if we've checked admin setup recently
        const hasCheckedSetup = sessionStorage.getItem('admin_setup_checked');
        const lastCheckedTime = sessionStorage.getItem('admin_setup_checked_time');
        const now = Date.now();

        // Skip admin check if we've done it in the last 10 minutes
        if (hasCheckedSetup === 'true' && lastCheckedTime &&
            (now - parseInt(lastCheckedTime, 10)) < 10 * 60 * 1000) {
            return;
        }

        // Only proceed when both Clerk and API auth are ready
        if (isLoaded && isSignedIn && user && isAuthReady && isAuthenticated) {
            // This is a good place to ensure admin exists because:
            // 1. We know the user is authenticated
            // 2. We have access to the user object
            // 3. Our API client is initialized and authenticated
            // 4. This runs before accessing protected routes
            console.log('🔑 User authenticated in ProtectedRoutes, checking admin setup...');

            // Record that we're checking admin setup
            sessionStorage.setItem('admin_setup_checked', 'true');
            sessionStorage.setItem('admin_setup_checked_time', now.toString());

            // Ensure admin exists with the user ID
            // This will use our centralized API client with proper auth
            ensureAdminExists(user.id)
                .then(() => console.log('✅ Admin setup completed successfully'))
                .catch(err => console.error('❌ Admin setup failed:', err));
        }
    }, [isLoaded, isSignedIn, user, isAuthReady, isAuthenticated]);

    // This is the critical check - we need to wait for Clerk to fully initialize
    // before deciding if the user is authenticated or not
    if (!isLoaded) {
        // Only show verbose logs on first load, not on refreshes
        const isFirstLoad = sessionStorage.getItem('has_loaded_before') !== 'true';
        if (isFirstLoad) {
            console.log('🕒 Waiting for Clerk authentication to initialize...');
        }

        return (
            <div className="container d-flex flex-column justify-content-center align-items-center vh-100">
                <h3 className="mb-4">Loading...</h3>
                <Spin size="large" />
            </div>
        );
    }

    // Secondary check - if user is signed in according to Clerk but API auth isn't ready yet
    if (isSignedIn && !isAuthReady) {
        // Only show verbose logs on first load
        const isFirstLoad = sessionStorage.getItem('has_loaded_before') !== 'true';
        if (isFirstLoad) {
            console.log('⏳ User is signed in, waiting for API authentication...');
        }
        return (
            <div className="container d-flex flex-column justify-content-center align-items-center vh-100">
                <h3 className="mb-4">Preparing API access...</h3>
                <Spin size="large" />
            </div>
        );
    }

    // After Clerk is loaded, if user is not signed in, redirect to login
    if (!isSignedIn) {
        console.log('🔒 User is not signed in, redirecting to login');
        return <Navigate to="/auth/sign-in/" />;
    }

    // Get user role from metadata
    // TODO: We need to make sure that this is set up sometime during the Clerk user creation process, or our own DB User object creation process
    const { role: userRole } = user?.publicMetadata as ClerkPublicMetadata;

    // Only log on first load or debug mode
    const showVerboseLogs = sessionStorage.getItem('has_loaded_before') !== 'true';
    if (showVerboseLogs) {
        console.log('👤 User role from metadata:', userRole);
    }

    // Instead of requiring a role to exist, we'll check if we can derive one first
    // There's a bootstrapping issue where a new user signs up but their role isn't set
    if (userRole) {
        // If we have a defined role, use it for routing
        if (showVerboseLogs) {
            console.log('✅ User has a defined role:', userRole);
        }

        if (userRole === "tenant") {
            // Tenants can ONLY access tenant routes
            if (!currentPath.startsWith("/tenant")) {
                return <Navigate to="/tenant" />;
            }
        } else if (userRole === "admin") {
            // Admins can ONLY access admin routes
            if (!currentPath.startsWith("/admin")) {
                return <Navigate to="/admin" />;
            }
        }
    } else {
        // For users without a role, we'll be more permissive during the setup phase
        console.log('⚠️ User has no role defined, allowing access during setup phase');

        // During the setup phase, we don't restrict navigation
        // The admin check and setup will happen in the background

        // However, we will check path prefixes to provide sensible defaults
        if (currentPath.startsWith("/admin")) {
            console.log('🔍 User is accessing admin path without a role');
            // Let them continue, the admin setup will fix metadata if needed
        } else if (currentPath.startsWith("/tenant")) {
            console.log('🔍 User is accessing tenant path without a role');
            // Let them continue, assuming they might be a tenant
        } else if (currentPath === "/" || currentPath === "") {
            // For users with no role at the root path, we'll default to tenant for now
            console.log('🔄 Redirecting user with no role to tenant dashboard');
            return <Navigate to="/tenant" />;
        }
    }

    // Allow access to the route if the checks above passed
    return <Outlet />;
};

export default ProtectedRoutes;
