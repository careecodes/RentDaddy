// This component is used to protect routes that are only accessible to signed in users
// It also checks the user's role and redirects to the correct route based on the role
// The ProtectedRoutes component is used in the Main.tsx file as a Route element that wraps the Tenant and Admin routes

import { useUser } from "@clerk/react-router";
import { Navigate, Outlet, useLocation } from "react-router";

const ProtectedRoutes = () => {
    // Get Clerk User to get the user's role
    const { isSignedIn, isLoaded, user } = useUser();

    // Get the current path to check if the user is trying to access a tenant or admin route
    const location = useLocation();
    const currentPath = location.pathname;

    // Show loading state while Clerk is initializing
    // If we don't do this, the user will be redirected to the login page before the Clerk is initialized, even if they are signed in
    if (!isLoaded) {
        return <div>Loading...</div>;
    }

    // If user is not signed in, redirect to login
    if (!isSignedIn) {
        return <Navigate to="/auth/login" />;
    }

    // Get user role from metadata
    // TODO: We need to make sure that this is set up sometime during the Clerk user creation process, or our own DB User object creation process
    const userRole = user?.publicMetadata?.role as string;

    // More strict role-based access control
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
    } else {
        // Handle users with no role or invalid role
        return <div>Unauthorized: Invalid user role</div>;
    }

    // Allow access to the route if the checks above passed
    return <Outlet />;
};

export default ProtectedRoutes;
