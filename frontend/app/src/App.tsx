import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router";
import { Button } from "antd";
import HeroBanner from "./components/HeroBanner";
import { SignedIn, SignedOut, SignInButton, SignOutButton, useAuth } from "@clerk/react-router"
import { UserButton } from "@clerk/react-router"

function App() {
  const [count, setCount] = useState(0);

  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth()

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
        <Link to="/reusable-components">
          <Button className="my-2">Checkout the Reusable Components</Button>
        </Link>



        {/* Clerk Auth Demo */}
        <div>
          <SignedIn>
            <div className="d-flex gap-2">
              <UserButton />
              <SignOutButton>
                <Button className="my-2">
                  Sign Out
                </Button>
              </SignOutButton>
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton />
          </SignedOut>
        </div>



        {/* Clerk Auth Demo */}
        <div>
          <SignedIn>
            <div className="d-flex gap-2">
              <UserButton />
              <SignOutButton>
                <Button className="my-2">
                  Sign Out
                </Button>
              </SignOutButton>
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton />
          </SignedOut>
        </div>

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
      </div>

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
