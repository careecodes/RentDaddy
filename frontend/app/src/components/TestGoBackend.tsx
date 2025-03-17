import { useAuth } from "@clerk/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

const TestGoBackend = () => {
    const [username, setUsername] = useState("");

    const userId = useAuth().userId;

    const { mutate: updateUsernameGoBackend } = useMutation({
        mutationFn: async () => {
            const res = await fetch("http://localhost:3069/test/clerk/update-username", {
                method: "PUT",
                body: JSON.stringify({ username: username, id: userId }),
                headers: { "Content-Type": "application/json" },
            });
            console.log(res, "res");
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

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log(username, "username");
        updateUsernameGoBackend();
    };

    return (
        // Form with input of username (string)
        // Button that tanstack queries the go backend route "/test/clerk/update-username"

        <form
            onSubmit={handleSubmit}
            className="d-flex flex-column gap-2 w-50 mx-auto my-5 border border-1 border-dark p-5 rounded-3 bg-light">
            <h3>Update Username</h3>
            <p className="text-muted">Test the Go Backend</p>
            <p className="text-muted">Test: /test/clerk/update-username</p>
            <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                type="text"
                placeholder="Username"
            />
            <button type="submit">Update Username</button>
        </form>
    );
};
export default TestGoBackend;
