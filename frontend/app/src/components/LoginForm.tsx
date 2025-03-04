import { Divider, Input } from "antd";
import "../styles/styles.scss";

export default function LoginForm() {
  return (
    <div>
      <div
        className="d-flex flex-column align-items-lg-center justify-content-lg-center flex-lg-row"
        style={{ minHeight: "calc(100vh - 3rem)" }}
      >
        <div className="container-md h-100">
          <img
            src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='700' height='700' style='background-color:%23ccc'/%3E"
            alt="Placeholder"
          />
        </div>
        {/* Login Form */}
        <form className="w-100">
          <h2 className="d-flex justify-content-center fw-bold">Rent Daddy</h2>
          <div className="my-2">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <Input
              id="email"
              className="my-2"
              type="email"
              placeholder="johndoe@gmail.com"
              required
              minLength={8}
            />
          </div>
          <div className="my-2">
            <label htmlFor="password" className="form-label">
              Password
            </label>

            <Input
              id="password"
              className="my-2"
              type="password"
              required
              minLength={10}
            />
          </div>
          <button type="submit" className="btn btn-primary w-auto">
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
        </form>
      </div>
      {/* Footer Container */}
      <footer style={{ textAlign: "center" }}>
        <Divider className="divider-text border-black" />
        <p>Rent Daddy ©{new Date().getFullYear()} Created by Rent Daddy</p>
      </footer>
    </div>
  );
}
