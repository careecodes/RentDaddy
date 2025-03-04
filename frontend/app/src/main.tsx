import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/styles.scss";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import ReusableComponents from "./components/ReusableComponents.tsx";

// Protected Routes to be used for all routes that require authentication
import ProtectedRoutes from "./providers/ProtectedRoutes.tsx";
import LoginForm from "./components/LoginForm.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
          <Route path="/" element={<App />} />

          {/* Reusable Components Route */}
          <Route path="/reusable-components" element={<ReusableComponents />} />

          {/* Authentication Route Group */}
          <Route path="authentication">
            <Route path="login" element={<LoginForm />} />

            {/* Not sure we need this one since we are having the admins create a tenant */}
            {/* But maybe to register the init admin? */}
            <Route path="register" element={<h1>Register</h1>} />
          </Route>

          {/* Admin Route Group */}
          <Route element={<ProtectedRoutes />}>
            <Route path="admin">
              <Route index element={<h1>Admin Dashboard</h1>} />
              <Route
                path="init-apartment-complex"
                element={<h1>Initial Admin Apartment Complex Setup</h1>}
              />
              <Route path="add-tenant" element={<h1>Add Tenant</h1>} />
              <Route
                path="admin-view-and-edit-leases"
                element={<h1>Admin View & Edit Leases</h1>}
              />
              <Route
                path="admin-view-and-edit-work-orders"
                element={<h1>Admin View & Edit Work Orders</h1>}
              />
            </Route>

            {/* Tenant Route Group */}
            <Route path="tenant">
              <Route index element={<h1>Tenant Dashboard</h1>} />
              <Route path="guest-parking" element={<h1>Guest Parking</h1>} />
              <Route
                path="digital-documents"
                element={<h1>Digital Documents</h1>}
              />
              <Route
                path="work-orders-and-complaints"
                element={<h1>Work Orders & Complaints</h1>}
              />
            </Route>
          </Route>

          {/* 404 Route - Always place at the end to catch unmatched routes */}
          <Route path="*" element={<h1>Page Not Found</h1>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
