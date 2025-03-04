import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./styles/styles.scss"
import App from "./App.tsx"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Link, Route, Routes } from "react-router";
import ReusableComponents from "./components/ReusableComponents.tsx"

// Protected Routes to be used for all routes that require authentication
import ProtectedRoutes from "./providers/ProtectedRoutes.tsx";

const queryClient = new QueryClient()

import { ClerkProvider, SignedIn, SignedOut, UserButton, SignInButton, SignIn, SignUp } from '@clerk/react-router'

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
            <Route path="/" element={<App />} />

            {/* Reusable Components Route */}
            <Route path="/reusable-components" element={<ReusableComponents />} />

            {/* Authentication Route Group */}
            <Route path="auth">
              {/* Login Route */}
              <Route path="login" element={
                <>
                  {/* Navbar */}
                  <nav className="navbar navbar-expand-lg navbar-light bg-light">
                    <div className="container">
                      <div className="row w-100 align-items-center">
                        <div className="col-4">
                          <Link to="/" className="navbar-brand">RentDaddy</Link>
                        </div>
                        <div className="col-8">
                          <div className="d-flex justify-content-end align-items-center gap-3">
                            <Link to="/admin" className="nav-link">Admin</Link>
                            <Link to="/tenant" className="nav-link">Tenant</Link>
                            <SignedIn>
                              <UserButton />
                            </SignedIn>
                            <SignedOut>
                              <SignInButton />
                            </SignedOut>
                          </div>
                        </div>
                      </div>
                    </div>
                  </nav>

                  {/* Main Content */}
                  <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: "calc(100vh - 56px - 240px)" }}>
                    <div className="row w-100">
                      <div className="col-md-6 d-flex justify-content-center align-items-center">
                        <img
                          src="/logo.png"
                          alt="Login page illustration"
                          className="img-fluid"
                          style={{ maxHeight: "60vh" }}
                        />
                      </div>
                      <div className="col-md-6 d-flex justify-content-center align-items-center">
                        <SignIn />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <footer className="bg-light py-4 mt-auto">
                    <div className="container">
                      <div className="row">
                        <div className="col-md-4">
                          <h5>RentDaddy</h5>
                          <p>Making property management easier.</p>
                        </div>
                        <div className="col-md-4">
                          <h5>Quick Links</h5>
                          <ul className="list-unstyled">
                            <li><Link to="/">Home</Link></li>
                            <li><Link to="/admin">Admin Portal</Link></li>
                            <li><Link to="/tenant">Tenant Portal</Link></li>
                          </ul>
                        </div>
                        <div className="col-md-4">
                          <h5>Contact</h5>
                          <p>Email: support@rentdaddy.com</p>
                          <p>Phone: (555) 123-4567</p>
                        </div>
                      </div>
                    </div>
                  </footer>
                </>
              } />

              {/* Not sure we need this one since we are having the admins create a tenant */}
              {/* But maybe to register the init admin? */}
              <Route path="register" element={<h1>Register</h1>} />
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

            {/* 404 Route - Always place at the end to catch unmatched routes */}
            <Route path="*" element={<h1>Page Not Found</h1>} />
          </Routes>
        </ClerkProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode >
)
