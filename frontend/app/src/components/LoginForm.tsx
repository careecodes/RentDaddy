import { Divider, Input } from "antd";
import "../styles/styles.scss";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router";
import { Form } from "antd";
import { useEffect, useState } from "react";

type LoginSchema = {
  userName?: string;
  password?: string;
};

type ErrorMessageSchema = {
  userNameErrMsg: string | null;
  passwordErrMsg: string | null;
};

export default function LoginForm() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [alert, setAlert] = useState(false);
  const [errorMsgs, setErrMsgs] = useState<ErrorMessageSchema>({
    userNameErrMsg: null,
    passwordErrMsg: null,
  });
  // TODO: throw an alert or error messages if no account found
  // TODO: if user isAdmin route to admin panel
  // TODO: Wrap form in card component

  function handleSubmit(values: LoginSchema) {
    console.log(`form values: ${JSON.stringify(values)}\n`);
    // validate
    // if error show user
  }

  return (
    <div>
      <button className="btn btn-light" onClick={() => navigate(-1)}>
        <ArrowLeftOutlined className="me-1" />
        Back
      </button>
      <div
        className="container pt-3 pt-md-0 d-flex flex-column-reverse gap-5 gap-lg-0 align-items-lg-center justify-content-lg-center flex-lg-row"
        style={{ minHeight: "calc(100vh - 3rem)" }}
      >
        {/* Login Form */}
        <Form
          name="login form"
          style={{
            width: isMobile ? "100%" : "70%",
            minHeight: isMobile ? "calc(100vh - 10rem)" : "auto",
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
                message:
                  "Please provide a valid username,minimum of 5 characters",
              },
            ]}
          >
            <Input />
            {errorMsgs.userNameErrMsg ? (
              <p className="text-danger">{errorMsgs.userNameErrMsg}</p>
            ) : null}
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
                message:
                  "Please provide a valid password, minimum of 8 characters",
              },
            ]}
          >
            <Input.Password />
            {errorMsgs.passwordErrMsg ? (
              <p className="text-danger">{errorMsgs.passwordErrMsg}</p>
            ) : null}
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
        <div className="container d-none d-md-flex justify-content-end">
          <img
            src="https://images.pexels.com/photos/7688073/pexels-photo-7688073.jpeg?auto=compress&cs=tinysrgb"
            className="img-fluid rounded-2"
            alt="Custom Placeholder"
            style={{
              width: isMobile ? "100%" : "700px",
              minHeight: isMobile ? "300px" : "600px",
            }}
          />
        </div>
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
