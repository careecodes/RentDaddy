import { Divider, FormProps, Input } from "antd";
import "../styles/styles.scss";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router";
import { Form } from "antd";
import { useEffect, useState } from "react";

type LoginSchema = {
  userName?: string;
  password?: string;
};

const onFinish: FormProps<LoginSchema>["onFinish"] = (values) => {
  console.log(`form values: ${JSON.stringify(values)}\n`);
};

const onFinishFailed: FormProps<LoginSchema>["onFinishFailed"] = (
  errorInfo,
) => {
  // show user error
  console.log(`failed: ${JSON.stringify(errorInfo)}`);
};

export default function LoginForm() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div>
      <button className="btn btn-light" onClick={() => navigate(-1)}>
        <ArrowLeftOutlined className="me-1" />
        Back
      </button>
      <div
        className="container pt-3 pt-md-0 d-flex flex-column align-items-lg-center justify-content-lg-center flex-lg-row"
        style={{ minHeight: "calc(100vh - 3rem)" }}
      >
        <div className="container d-flex justify-content-end">
          <img
            src="https://images.pexels.com/photos/7688073/pexels-photo-7688073.jpeg?auto=compress&cs=tinysrgb"
            className="img-fluid"
            alt="Custom Placeholder"
            style={{
              width: isMobile ? "100%" : "700px",
              height: isMobile ? "100%" : "100%",
              minHeight: isMobile ? "400px" : "700px",
            }}
          />
        </div>
        {/* Login Form */}
        <Form
          name="login form"
          style={{
            width: isMobile ? "100%" : "70%",
            margin: "0  auto",
          }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
        >
          <Form.Item label={null} className="ms-2">
            <h3 className="pt-5 pt-0-lg fw-bold">Rent Daddy</h3>
            <p className="text-muted">
              Enter your username & password below to login to your account
            </p>
          </Form.Item>
          <Form.Item<LoginSchema>
            label="Username"
            name="userName"
            rules={[
              {
                required: true,
                min: 5,
                message: "Please input your username!",
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item<LoginSchema>
            label="Password"
            name="password"
            rules={[
              {
                required: true,
                min: 8,
                message: "Please input your password!",
              },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item label={null} className="d-flex justify-content-end">
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: isMobile ? "100%" : "auto" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="lucide lucide-fingerprint me-2"
              >
                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                <path d="M2 12a10 10 0 0 1 18-6" />
                <path d="M2 16h.01" />
                <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
              </svg>
              Login
            </button>
          </Form.Item>
        </Form>
      </div>
      {/* Footer Container */}
      <footer style={{ textAlign: "center" }}>
        <Divider className="divider-text border-black" />
        <p>Rent Daddy ©{new Date().getFullYear()} Created by Rent Daddy</p>
      </footer>
    </div>
  );
}

function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [breakpoint]);

  return isMobile;
}
