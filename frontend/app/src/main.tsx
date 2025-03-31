// React and ReactDOM imports
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Styles
import "./styles/styles.scss";
import "@fontsource/poppins/400.css";

// Routing
import { BrowserRouter, Route, Routes } from "react-router";

// Authentication and Layout
import ProtectedRoutes from "./providers/ProtectedRoutes.tsx";
import PreAuthedLayout from "./providers/layout/PreAuthedLayout.tsx";
import AuthenticatedLayout from "./providers/layout/AuthenticatedLayout.tsx";

// Tanstack Query Client
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorNotFound from "./pages/Error404.tsx";
import { ConfigProvider } from "antd";

// Clerk
import { ClerkProvider, SignIn } from "@clerk/react-router";

// Pages
import App from "./App.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AddTenant from "./pages/AddTenant.tsx";
import AdminViewEditLeases from "./pages/AdminViewEditLeases.tsx";
import AdminWorkOrder from "./pages/AdminWorkOrder.tsx";
import ReusableComponents from "./pages/ReusableComponents.tsx";

import { TenantDashBoard } from "./pages/TenantDashBoard.tsx";
import AdminApartmentSetupAndDetailsManagement from "./pages/AdminApartmentSetupAndDetailsManagement.tsx";
import TenantComplaints from "./pages/TenantComplaints.tsx";
import TenantWorkOrders from "./pages/TenantWorkOrders.tsx";
import AdminViewEditSmartLockers from "./pages/AdminViewEditSmartLockers.tsx";
import SetupAdmin from "./pages/SetupAdmin";
// Add type declaration for window global variables
declare global {
    interface Window {
        VITE_CLERK_PUBLISHABLE_KEY?: string;
        VITE_BACKEND_URL?: string;
    }
}

// Get environment variables with fallbacks
console.log("Environment variables:", {
    CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
});

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
    window.VITE_CLERK_PUBLISHABLE_KEY ||
    "pk_live_Y2xlcmsuY3VyaW91c2Rldi5uZXQk";


if (!CLERK_PUBLISHABLE_KEY) {
    console.error("Warning: Missing Publishable Clerk Key. Using default value.");
}

const queryClient = new QueryClient();

// Use environment variable or fallback
const backendUrl = import.meta.env.VITE_BACKEND_URL ||
    window.VITE_BACKEND_URL ||
    "https://api.curiousdev.net";

// Log configuration for debugging
console.log("Environment:", {
    mode: import.meta.env.MODE,
    backendUrl,
    clerkKey: CLERK_PUBLISHABLE_KEY ? "Set (hidden for security)" : "Not set"
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ConfigProvider
            theme={{
                cssVar: true,
                hashed: false,
                token: {
                    colorPrimary: "#00674f",
                    colorLink: "#00674f",
                    colorFillSecondary: "#7789f4",
                    colorFillTertiary: "#d86364",
                    fontFamily: `"Poppins"`,
                },
                components: {
                    Card: {
                        colorBgBase: "hsl(166, 100%, 20%, 5%)",
                    },
                    Modal: {
                        colorBgElevated: "white",
                    },
                    Menu: {
                        colorBgContainer: "#00674f",
                        itemSelectedColor: "white",
                    },
                },
            }}>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <ClerkProvider
                        publishableKey={CLERK_PUBLISHABLE_KEY}
                        signUpFallbackRedirectUrl="/"
                        signInFallbackRedirectUrl="/">
                        <Routes>
                            <Route path="/setup" element={<SetupAdmin />} />
                            <Route element={<PreAuthedLayout />}>
                                <Route path="/healthz" element={<div>ok</div>} />
                                {/* Landing Page */}
                                <Route
                                    index
                                    element={<App />}
                                />

                                {/* Reusable Components Route */}
                                <Route
                                    path="reusable-components"
                                    element={<ReusableComponents />}
                                />

                                {/* Authentication Routes */}
                                <Route path="auth">
                                    <Route
                                        path="sign-in/*"
                                        element={<SignIn />}
                                    />
                                </Route>

                                <Route
                                    path="/auth/sign-in/"
                                    element={
                                        <div className="d-flex justify-content-center align-items-center h-100 py-5">
                                            <SignIn />
                                        </div>
                                    }></Route>

                            </Route>
                            {/* End of Pre-authentication Layout Group */}

                            {/* Protected Routes (Admin & Tenant) */}
                            <Route element={<ProtectedRoutes />}>
                                {/* Authenticated Layout Group */}
                                <Route element={<AuthenticatedLayout />}>
                                    {/* Admin Route Group */}
                                    <Route path="admin">
                                        <Route
                                            index
                                            element={<AdminDashboard />}
                                        />
                                        <Route
                                            path="init-apartment-complex"
                                            element={<AdminApartmentSetupAndDetailsManagement />}
                                        />
                                        <Route
                                            path="manage-tenants"
                                            element={<AddTenant />}
                                        />
                                        <Route
                                            path="admin-view-and-edit-leases"
                                            element={<AdminViewEditLeases />}
                                        />
                                        <Route
                                            path="admin-view-and-edit-work-orders-and-complaints"
                                            element={<AdminWorkOrder />}
                                        />
                                        <Route
                                            path="admin-view-and-edit-smart-lockers"
                                            element={<AdminViewEditSmartLockers />}
                                        />
                                    </Route>

                                    {/* Tenant Route Group */}
                                    <Route path="tenant">
                                        <Route
                                            index
                                            element={<TenantDashBoard />}
                                        />
                                        <Route
                                            path="guest-parking"
                                            element={<h1>Guest Parking</h1>}
                                        />
                                        <Route
                                            path="tenant-view-and-edit-leases"
                                            element={<h1>Digital Documents</h1>}
                                        />
                                        <Route
                                            path="tenant-complaints"
                                            element={<TenantComplaints />}
                                        />
                                        <Route
                                            path="tenant-work-orders"
                                            element={<TenantWorkOrders />}
                                        />
                                    </Route>
                                </Route>
                            </Route>
                            {/* End of Protected Routes (Admin & Tenant) */}

                            {/* 404 Route - Always place at the end to catch unmatched routes */}
                            <Route
                                path="*"
                                element={<ErrorNotFound />}
                            />
                        </Routes>
                    </ClerkProvider>
                </BrowserRouter>
            </QueryClientProvider>
        </ConfigProvider>
    </StrictMode>
);