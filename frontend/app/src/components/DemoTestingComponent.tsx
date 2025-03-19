import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router";
import { Button } from "antd";

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
            console.log("success");
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
                }}>
                GET
            </button>
            <button
                className="btn btn-secondary  m-2"
                onClick={() => {
                    createPost();
                }}>
                Post
            </button>
            <button
                className="btn btn-warning  m-2"
                onClick={() => {
                    createPut();
                }}>
                Put
            </button>
            <button
                className="btn btn-light  m-2"
                onClick={() => {
                    createDelete();
                }}>
                Delete
            </button>
            <button
                className="btn btn-dark  m-2"
                onClick={() => {
                    createPatch();
                }}>
                Patch
            </button>
        </div>
    );
}

const DemoTestingComponent = () => {
    return (
        <div className="d-flex flex-column gap-2 w-50 mx-auto my-5 border border-1 border-dark p-5 rounded-3 bg-light">
            <h4>RentDaddy Testing Component</h4>
            <Link to="/reusable-components">
                <Button className="my-2">Checkout the Reusable Components</Button>
            </Link>

            {/* Login Button */}
            <Link to="/auth/login">
                <Button className="my-2">Login</Button>
            </Link>

            {/* Admin Button */}
            <Link to="/admin">
                <Button className="my-2">Admin</Button>
            </Link>

            {/* Tenant Button */}
            <Link to="/tenant">
                <Button className="my-2">Tenant</Button>

                <Items />
            </Link>
        </div>
    );
};
export default DemoTestingComponent;
