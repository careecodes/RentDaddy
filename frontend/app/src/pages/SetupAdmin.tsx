import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Form, Input, Typography, Alert } from "antd";

const { Title } = Typography;
const API_BASE = import.meta.env.VITE_BACKEND_URL ?? window.location.origin;

export default function SetupAdmin() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // ✅ Check admin on mount
    useEffect(() => {
        const check = async () => {
            const res = await fetch(`${API_BASE}/api/check-admin`);
            const data = await res.json();
            if (data.exists) {
                navigate("/auth/sign-in"); // Or directly to /admin if they're already signed in
            }
        };
        check();
    }, []);

    const onFinish = async (values: { clerk_id: string }) => {
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_BASE}/api/setup/admin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (res.status === 201 || res.status === 200) {
                navigate("/admin");
            } else if (res.status === 409) {
                setError("Admin already exists or db_id is in use.");
            } else {
                const message = await res.text();
                setError(`Unexpected error: ${message}`);
            }
        } catch (err) {
            console.error("Setup error:", err);
            setError("Failed to complete setup.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: "80px auto" }}>
            <Title level={3}>Initialize Admin</Title>
            <Form onFinish={onFinish} layout="vertical">
                <Form.Item
                    name="clerk_id"
                    label="Clerk User ID"
                    rules={[{ required: true, message: "Please enter your Clerk User ID" }]}>
                    <Input />
                </Form.Item>

                {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

                <Button type="primary" htmlType="submit" loading={loading} block>
                    Set Up Admin
                </Button>
            </Form>
        </div>
    );
}
