// React and ReactDOM imports
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

// Styles
import "./styles/styles.scss";

// Pages &Components
import App from "./App.tsx"
import ReusableComponents from "./pages/ReusableComponents.tsx";
import TestGoBackend from "./pages/TestGoBackend.tsx";

// Authentication and Layout
import ProtectedRoutes from "./providers/ProtectedRoutes.tsx";
import PreAuthedLayout from "./providers/layout/PreAuthedLayout.tsx"
import AuthenticatedLayout from "./providers/layout/AuthenticatedLayout.tsx"

// React Router
import { BrowserRouter, Link, Route, Routes } from "react-router";

// Tanstack Query Client
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import ErrorNotFound from "./pages/Error404.tsx";

// Clerk
import { ClerkProvider, SignedIn, SignedOut, UserButton, SignInButton, SignIn, SignUp } from '@clerk/react-router'

const queryClient = new QueryClient();

// I think this rootAuthLoader is only needed if we are making a backend using node.js
// Since we are using Golang, we don't need this because we will be using the Clerk Go SDK

// import { rootAuthLoader } from '@clerk/react-router/ssr.server'

// export async function loader(args: Route.LoaderArgs) {
//   return rootAuthLoader(args)
// }

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Clerk Key (ENV VARIABLE)")
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ClerkProvider
          publishableKey={CLERK_PUBLISHABLE_KEY}
          // loaderData={loader}
          signUpFallbackRedirectUrl="/"
          signInFallbackRedirectUrl="/"
        >
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
              {/* Landing Page */}
              <Route index element={<App />} />

              {/* Reusable Components Route */}
              <Route path="reusable-components" element={<ReusableComponents />} />

              {/* Test Go Backend Route */}
              <Route path="test-go-backend" element={<TestGoBackend />} />

              {/* Authentication Routes */}
              <Route path="auth">
                <Route path="login" element={<h1>Login</h1>} />
                <Route path="register" element={<h1>Register</h1>} />
              </Route>
            </Route>
            {/* End of Pre-authentication Layout Group */}

            {/* Admin Route Group */}
            <Route element={<AuthenticatedLayout />}>
              <Route element={<ProtectedRoutes />}>
                <Route path="admin">
                  <Route index element={<h1>Admin Dashboard</h1>} />
                  <Route path="init-apartment-complex" element={<h1>Initial Admin Apartment Complex Setup</h1>} />
                  <Route path="add-tenant" element={<h1>Add Tenant</h1>} />
                  <Route path="admin-view-and-edit-leases" element={<h1>Admin View & Edit Leases</h1>} />
                  <Route path="admin-view-and-edit-work-orders" element={<h1>Admin View & Edit Work Orders</h1>} />
                </Route>
                {/* Admin Route Group */}
                <Route element={<ProtectedRoutes />}>
                  <Route path="admin">
                    <Route index element={<h1>Admin Dashboard</h1>} />
                    <Route path="init-apartment-complex" element={<h1>Initial Admin Apartment Complex Setup</h1>} />
                    <Route path="add-tenant" element={<h1>Add Tenant</h1>} />
                    <Route path="admin-view-and-edit-leases" element={<h1>Admin View & Edit Leases</h1>} />
                    <Route path="admin-view-and-edit-work-orders" element={<h1>Admin View & Edit Work Orders</h1>} />
                  </Route>

                  {/* Tenant Route Group */}
                  <Route path="tenant">
                    <Route index element={<h1>Tenant Dashboard</h1>} />
                    <Route path="guest-parking" element={<h1>Guest Parking</h1>} />
                    <Route path="digital-documents" element={<h1>Digital Documents</h1>} />
                    <Route path="work-orders-and-complaints" element={<h1>Work Orders & Complaints</h1>} />
                  </Route>
                </Route>
                {/* Tenant Route Group */}
                <Route path="tenant">
                  <Route index element={<h1>Tenant Dashboard</h1>} />
                  <Route path="guest-parking" element={<h1>Guest Parking</h1>} />
                  <Route path="digital-documents" element={<h1>Digital Documents</h1>} />
                  <Route path="work-orders-and-complaints" element={<h1>Work Orders & Complaints</h1>} />
                </Route>
              </Route>
            </Route>

            {/* 404 Route - Always place at the end to catch unmatched routes */}
            <Route path="*" element={<ErrorNotFound />}></Route>
          </Routes>
        </ClerkProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode >
)
