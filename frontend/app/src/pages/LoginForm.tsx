import { Alert, Card, Divider, Input } from "antd";
import "../styles/styles.scss";
import {
  ArrowLeftOutlined,
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router";
import { Form } from "antd";
import { useEffect, useState } from "react";

type LoginSchema = {
  userName?: string;
  password?: string;
};

type ToastSchema = {
  show: boolean;
  message: string;
};

export default function LoginForm() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [form] = Form.useForm<LoginSchema>();
  const [toast, setToast] = useState<ToastSchema>({
    show: false,
    message: "More detailed error message here.",
  });
  // Dummy data
  const isAdmin = false;
  const doesUserExists = { userName: "bobby123", password: "password" };

  function handleSubmit(values: LoginSchema) {
    // Hit api
    console.log(`form values: ${JSON.stringify(values)}\n`);
    // if Error show user with alert
    if (
      values.userName !== doesUserExists.userName ||
      values.password !== doesUserExists.password
    ) {
      setToast({
        show: true,
        message: "No such user exists, try again another time.",
      });
      return;
    }
    //
    // if Sucess empty form and redirect
    // form.resetFields()
    navigate(isAdmin ? "/admin" : "/tenant");
  }

  useEffect(() => {
    if (toast.show) {
      const countDown = setTimeout(() => {
        setToast({ show: false, message: "" });
      }, 5000);

      return () => clearTimeout(countDown);
    }
  }, [toast.show]);

  return (
    <div style={{ position: "relative" }}>
      <button className="btn btn-light" onClick={() => navigate(-1)}>
        <ArrowLeftOutlined className="me-1" />
        Back
      </button>
      <div
        className="container mt-3 pt-md-0 d-flex flex-column gap-5 gap-lg-0 justify-content-end align-items-lg-center justify-content-lg-center flex-lg-row"
        style={{ minHeight: "calc(100vh - 3rem)" }}
      >
        <div className="d-none d-md-flex justify-content-end mx-lg-2">
          <img
            src="https://images.pexels.com/photos/7688073/pexels-photo-7688073.jpeg?auto=compress&cs=tinysrgb"
            className="img-fluid rounded-2"
            alt="Custom Placeholder"
            style={{
              maxWidth: "700px",
              minHeight: isMobile ? "300px" : "600px",
              margin: "0  auto",
            }}
          />
        </div>
        {/* Login Form */}
        <Card
          style={{
            minHeight: isMobile ? "auto" : "600px",
          }}
          className="w-100 w-lg-70 mt-5 mt-lg-0 mx-auto"
        >
          <div className="container d-block d-md-none justify-content-start">
            <img
              src="/logo.png"
              alt="Rent Daddy Logo"
              className="logo-image"
              width={64}
              height={64}
              style={{
                display: "block",
                margin: "0 auto",
              }}
            />
          </div>
          <Form
            name="login form"
            form={form}
            style={{
              width: isMobile ? "100%" : "80%",
              margin: "0  auto",
            }}
            onFinish={handleSubmit}
          >
            <img
              src="/logo.png"
              alt="Rent Daddy Logo"
              className="d-none d-md-block logo-image"
              width={64}
              height={64}
              style={{
                display: "block",
                margin: "0 auto",
              }}
            />
            <h3 className="pt-5 pt-0-lg fw-bold">Login to your account</h3>
            <p className="text-muted">
              Enter your username & password below to login to your account
            </p>
            <label htmlFor="username" className="fw-medium">
              Username
            </label>
            <Form.Item<LoginSchema>
              label={null}
              name="userName"
              rules={[
                {
                  required: true,
                  min: 5,
                  max: 20,
                  message:
                    "Please provide a valid username between 5 and 20 characters.",
                },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="johndoe321" />
            </Form.Item>
            <label htmlFor="Password" className="fw-medium">
              Password
            </label>
            <Form.Item<LoginSchema>
              label={null}
              name="password"
              rules={[
                {
                  required: true,
                  min: 8,
                  max: 50,
                  message:
                    "Please provide a valid password between 8 and 50 characters.",
                },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>

            <Form.Item label={null} className="container mx-auto">
              <button type="submit" className={`btn btn-primary w-100`}>
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
        </Card>
      </div>
      {toast.show ? (
        <Alert
          message={"Oops!"}
          description={toast.message}
          type={"error"}
          showIcon
          style={{
            position: "absolute",
            right: "0%",
            bottom: isMobile ? "12%" : "6%",
          }}
          className="col-12 col-md-6 col-xl-6 col-xxl-3"
        />
      ) : null}

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
