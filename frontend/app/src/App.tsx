import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router";
import { Button } from "antd";
import HeroBanner from "./components/HeroBanner";
import { SignedIn, SignedOut, SignInButton, SignOutButton, useAuth, useUser } from "@clerk/react-router"
import { UserButton } from "@clerk/react-router"

function App() {
  const [count, setCount] = useState(0);

  const { userId, sessionId } = useAuth()

  const { isSignedIn, user, isLoaded } = useUser()


  if (!isLoaded) {
    return <div>Loading...</div>
  }

  console.log(isSignedIn, "isSignedIn", userId, "userId", sessionId, "sessionId")

  return (
    <>
      <HeroBanner />

      <Link to="/">
        <h4>RentDaddy</h4>
      </Link>

      <div className="d-flex flex-column">

        {/* Clerk Auth Demo */}
        <div className="d-flex flex-column justify-content-center align-items-center my-5">
          {/* Title */}
          <h4>Clerk Auth Demo</h4>
          <SignedIn>
            <div className="d-flex flex-column justify-content-center align-items-center my-5">
              <p className="fs-2 text-center text-danger">NOTICE!</p>
              <p className="fs-2 text-center">We are routed back to this page after authentication, but we can also route to the dashboard pages based off the user's role.
              </p>
            </div>
            <div className="d-flex gap-4 align-items-center mb-4">
              <UserButton size="lg" />
            </div>
            <div className="d-flex gap-4 align-items-center mb-4">
              <Link to="test-go-backend">
                <Button type="primary" size="large" className="my-3">Test Go Backend</Button>
              </Link>
              <SignOutButton>
                <Button danger size="large" className="my-3">
                  Sign Out
                </Button>
              </SignOutButton>
            </div>
            <div className="d-flex flex-column gap-3 text-center">
              <p className="text-muted mb-2 fs-3">Name: {user?.fullName}</p>
              <p className="text-muted mb-2 fs-3">Email: {user?.emailAddresses[0].emailAddress}</p>
              <p className="text-muted fs-3">Role: {user?.publicMetadata.role}</p>
            </div>
          </SignedIn>
          <SignedOut>
            <div className="d-flex gap-4 justify-content-center">
              <Link to="/auth/login">
                <Button type="primary" size="large" className="my-3">
                  Our Sign In
                </Button>
              </Link>
              <SignInButton>
                <Button size="large" className="my-3">
                  Clerk Sign In
                </Button>
              </SignInButton>
              <SignInButton mode="modal">
                <Button size="large" className="my-3">
                  Clerk Sign In (Modal)
                </Button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>


        <Link to="/reusable-components">
          <Button className="my-2">Checkout the Reusable Components</Button>
        </Link>

        {/* Login Button */}
        <Link to="/auth/login">
          <Link to="/auth/login">
            <Button className="my-2">
              Login
            </Button>
          </Link>

          {/* Admin Button */}
          <Link to="/admin">
            <Button className="my-2">Admin</Button>
          </Link>

          {/* Tenant Button */}
          <Link to="/tenant">
            <Button className="my-2">Tenant</Button>
          </Link>
        </Link>
      </div >

      <Items />
    </>
  );
}

function Items() {
  // Mutations //isPending not used currently, left for learning.
  const { mutate: createPost, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      const res = await fetch("http://localhost:3069/test/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "1" }),
      });
      return res;
    },
    onSuccess: () => {
      // Invalidate and refetch
      console.log("succes");
    },
    onError: (e: any) => {
      console.log("error ", e);
    },
  });

  const { mutate: createPut } = useMutation({
    mutationFn: async () => {
      const res = await fetch("http://localhost:3069/test/put", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "1" }),
      });
      return res;
    },
    onSuccess: () => {
      // Invalidate and refetch
      console.log("success");
    },
    onError: (e: any) => {
      console.log("error ", e);
    },
  });

  const { mutate: createDelete } = useMutation({
    mutationFn: async () => {
      const res = await fetch("http://localhost:3069/test/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "1" }),
      });
      return res;
    },
    onSuccess: () => {
      // Invalidate and refetch
      console.log("success");
    },
    onError: (e: any) => {
      console.log("error ", e);
    },
  });

  const { mutate: createGet } = useMutation({
    mutationFn: async () => {
      const res = await fetch("http://localhost:3069/test/get", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      return res;
    },
    onSuccess: () => {
      // Invalidate and refetch
      console.log("success");
    },
    onError: (e: any) => {
      console.log("error ", e);
    },
  });

  const { mutate: createPatch } = useMutation({
    mutationFn: async () => {
      const res = await fetch("http://localhost:3069/test/patch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "1" }),
      });
      return res;
    },
    onSuccess: () => {
      // Invalidate and refetch
      console.log("success");
    },
    onError: (e: any) => {
      console.log("error ", e);
    },
  });

  return (
    <div className="flex g-2">
      <button
        className="btn btn-primary m-2"
        onClick={() => {
          createGet();
        }}
      >
        GET
      </button>
      <button
        className="btn btn-secondary  m-2"
        onClick={() => {
          createPost();
        }}
      >
        Post
      </button>
      <button
        className="btn btn-warning  m-2"
        onClick={() => {
          createPut();
        }}
      >
        Put
      </button>
      <button
        className="btn btn-light  m-2"
        onClick={() => {
          createDelete();
        }}
      >
        Delete
      </button>
      <button
        className="btn btn-dark  m-2"
        onClick={() => {
          createPatch();
        }}
      >
        Patch
      </button>
    </div>
  );
}

export default App;
