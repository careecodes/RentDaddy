import React from "react";
import { Button, Layout, theme } from "antd";
import { Link, Outlet } from "react-router";
import { useClerk, useUser } from "@clerk/react-router";

const { Header, Content, Footer } = Layout;

const PreAuthedLayout: React.FC = () => {
    // const { user } = useUser();

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    // console.log(user, "user");

    return (
        <Layout>
            <Header className="header d-flex justify-content-between align-items-center px-3">
                {/* Left Side Nav */}
                <div
                    className="d-flex align-items-center"
                    style={{ width: "200px" }}>
                    <Link to="/">
                        <div className="demo-logo">
                            <img
                                src="/logo.png"
                                alt="logo"
                                style={{ width: "50px", height: "50px" }}
                                className="rounded"
                            />
                        </div>
                    </Link>
                </div>

                {/* Center Nav */}
                <div className="flex-grow-1 d-flex justify-content-center">
                    <Link
                        to="/"
                        className="text-white text-decoration-none"
                        style={{ fontSize: "24px" }}>
                        EZRA
                    </Link>
                </div>

                {/* Right Side Nav */}
                <div
                    className="ms-auto"
                    style={{ minWidth: "300px" }}>
                    <AuthMenuItems />
                </div>
            </Header>
            <Content>
                <div
                    style={{
                        padding: 24,
                        minHeight: 380,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                    }}>
                    {/* Outlet is a React Router component to help present what shows up from the main.tsx children routes */}
                    <Outlet />
                </div>
            </Content>
            {/* Footer Container */}
            <Footer className="footer">
                {/*  EZRA */}
                <h3 className="footer-title">EZRA</h3>
                {/* Logo */}
                <img
                    src="/logo.png"
                    alt="logo"
                    className="footer-logo"
                    // style={{
                    //     display: "block",
                    //     margin: "0 auto",
                    //     marginBottom: "24px",
                    //     borderRadius: "8px",
                    // }}
                />
                <div>
                    <Link
                        to="/about"
                        className="link disabled-link">
                        About
                    </Link>
                    <Link
                        to="/contact"
                        className="link disabled-link">
                        Contact
                    </Link>
                    <Link
                        to="/privacy"
                        className="link disabled-link">
                        Privacy Policy
                    </Link>
                    <Link
                        to="/terms"
                        className="link disabled-link">
                        Terms of Service
                    </Link>
                </div>
                <p className="footer-text">EZRA © {new Date().getFullYear()} | All Rights Reserved</p>
            </Footer>
        </Layout>
    );
};

export default PreAuthedLayout;

function AuthMenuItems() {
    const { user } = useUser();
    const { signOut } = useClerk();

    return (
        <div className="d-flex align-items-center justify-content-end gap-3 me-3">
            <div key="1">
                {user ? (
                    <Link
                        to={user.publicMetadata?.role === "admin" ? "/admin" : "/tenant"}
                        className="text-white d-flex align-items-center gap-1 mb-1 text-decoration-none hover-darken">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-layout-dashboard me-1">
                            <rect
                                width="7"
                                height="9"
                                x="3"
                                y="3"
                                rx="1"
                            />
                            <rect
                                width="7"
                                height="5"
                                x="14"
                                y="3"
                                rx="1"
                            />
                            <rect
                                width="7"
                                height="9"
                                x="14"
                                y="12"
                                rx="1"
                            />
                            <rect
                                width="7"
                                height="5"
                                x="3"
                                y="16"
                                rx="1"
                            />
                        </svg>
                        Dashboard
                    </Link>
                ) : (
                    <Link
                        to="/"
                        className="text-white d-flex align-items-center gap-2 mb-1 text-decoration-none hover-darken">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-house me-1">
                            <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
                            <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        </svg>
                        Home
                    </Link>
                )}
            </div>

            <div key="2">
                {user ? (
                    <Button
                        style={{ boxShadow: "none" }}
                        className="d-flex align-items-center gap-1 mb-1 hover-darken transition-all"
                        onClick={() => signOut({ redirectUrl: "/" })}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-log-out me-1">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line
                                x1="21"
                                x2="9"
                                y1="12"
                                y2="12"
                            />
                        </svg>
                        Logout
                    </Button>
                ) : (
                    <Link
                        to="/auth/sign-in"
                        className="text-decoration-none">
                        <Button className="d-flex align-items-center gap-2 mb-1 hover-darken transition-all">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-fingerprint me-1">
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
                        </Button>
                    </Link>
                )}
            </div>
        </div>
    );
}
