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
import { ClerkProvider, SignedOut, SignIn } from "@clerk/react-router";

// API Context
import { ApiProvider } from "./utils/apiContext";

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
import { Toaster } from "sonner";
import AdminComplaints from "./pages/AdminComplaints.tsx";
import AdminSettings from "./pages/AdminSettings.tsx";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error("Missing Publishable Clerk Key (ENV VARIABLE)");
}

const queryClient = new QueryClient();

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
                    {/* TODO: Set up fallback redirect urls based on user role, or use a redirect url that is set in the Clerk Dashboard */}
                    {/* The issue is I can't use user.publicMetadata.role in the ClerkProvider because the user object is not available until after the ClerkProvider is mounted lol, and you can't use React hooks if they're not in a React component, so you could make a custom component that is used in the ClerkProvider to set the fallback redirect url based on the user's role */}
                    {/* I think redirect would be best for this, but open to ideas */}
                    {/*  */}
                    {/*  */}
                    {/* More TODOs: */}
                    {/* We also need to make sure that we somehow assign a role upon creation in the Clerk user object, or our own DB User object */}
                    <Toaster />
                    <ClerkProvider
                        publishableKey={CLERK_PUBLISHABLE_KEY}
                        signUpFallbackRedirectUrl={"/"}
                        signInFallbackRedirectUrl={"/"}
                        // Routing strategy is handled automatically
                    >
                        <ApiProvider>
                            {/* Routes: Container for all Route definitions */}
                            <Routes>
                                {/* Example and Explanation of Routes */}
                                {/*
            Routes are used to define the paths and components that will be rendered when a user navigates to a specific URL.
            They are placed inside the BrowserRouter component.
            Each Route component has a path prop that specifies the URL path, and an element prop that specifies the component to render.

            For example, the Route with path="/" will render the App component when the user navigates to the root URL (e.g., http://localhost:5173/).

            // Docs for Routes: https://reactrouter.com/start/library/routing

            // Docs for Navigation: https://reactrouter.com/start/library/navigating
          */}

                                {/* Main Route (Landing Page) */}
                                {/* Pre-authentication Layout Group */}
                                <Route element={<PreAuthedLayout />}>
                                    <Route
                                        path="/healthz"
                                        element={<div>ok</div>}
                                    />
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
                                    <Route
                                        path="/auth/sign-in/*"
                                        element={
                                            <div
                                                style={{ height: "calc(100vh - 5rem)" }}
                                                className="d-flex justify-content-center mt-5">
                                                <SignIn />
                                            </div>
                                        }></Route>
                                    <Route
                                        path="/auth/sign-out/"
                                        element={
                                            <div className="d-flex justify-content-center align-items-start min-vh-100 my-5">
                                                <SignedOut />
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
                                                path="apartment"
                                                element={<AdminApartmentSetupAndDetailsManagement />}
                                            />
                                            <Route
                                                path="tenants"
                                                element={<AddTenant />}
                                            />
                                            <Route
                                                path="admin-view-and-edit-leases"
                                                element={<AdminViewEditLeases />}
                                            />
                                            <Route
                                                path="work-orders"
                                                element={<AdminWorkOrder />}
                                            />
                                            <Route
                                                path="complaints"
                                                element={<AdminComplaints />}
                                            />
                                            <Route
                                                path="lockers"
                                                element={<AdminViewEditSmartLockers />}
                                            />
                                            <Route
                                                path="settings"
                                                element={<AdminSettings />}
                                            />
                                        </Route>

                                        {/* Tenant Route Group */}
                                        <Route path="tenant">
                                            <Route
                                                index
                                                element={<TenantDashBoard />}
                                            />
                                            {/* <Route */}
                                            {/*     path="guest-parking" */}
                                            {/*     element={<h1>Guest Parking</h1>} */}
                                            {/* /> */}
                                            <Route
                                                path="leases"
                                                element={<h1>Digital Documents</h1>}
                                            />
                                            <Route
                                                path="work-orders"
                                                element={<TenantWorkOrders />}
                                            />
                                            <Route
                                                path="complaints"
                                                element={<TenantComplaints />}
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
                        </ApiProvider>
                    </ClerkProvider>

                </BrowserRouter>
            </QueryClientProvider>
        </ConfigProvider>
    </StrictMode >
);
