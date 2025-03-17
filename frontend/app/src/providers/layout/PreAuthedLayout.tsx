import React from "react";
import { Divider, Layout, Menu, theme } from "antd";
import { Link, Outlet } from "react-router";
import { SignOutButton, useUser } from "@clerk/react-router";

const { Header, Content, Footer } = Layout;

const PreAuthedLayout: React.FC = () => {
    // Get Clerk User to get the user's role
    const { user } = useUser();

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    console.log(user, "user");

    // Right Hand Sidebar Items
    const items = [
        {
            key: "1",
            label: user ? (
                <Link
                    className="text-white"
                    to={user.publicMetadata.role === "admin" ? "/admin" : "/tenant"}>
                    Dashboard
                </Link>
            ) : (
                <Link
                    className="text-white"
                    to="/">
                    Home
                </Link>
            ),
        },
        {
            key: "2",
            label: user ? (
                <SignOutButton>
                    <div className="text-white">Logout</div>
                </SignOutButton>
            ) : (
                <Link
                    className="text-white"
                    to="/auth/login">
                    Login
                </Link>
            ),
        },
    ];

    return (
        <Layout>
            <Header className="header">
                {/* Left Side Nav */}
                <div style={{ width: "200px" }}>
                    <Link to="/">
                        <div className="demo-logo">
                            <img
                                src="/logo.png"
                                alt="logo"
                                style={{ width: "56px", height: "56px" }}
                                className="bg-white rounded"
                            />
                        </div>
                    </Link>
                </div>

                {/* Center Nav */}
                <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                    <Link
                        to="/"
                        style={{ color: "white", fontSize: "24px", textDecoration: "none" }}>
                        RentDaddy
                    </Link>
                </div>

                {/* Top right Nav */}
                <div style={{ width: "200px" }}>
                    <Menu
                        // theme="dark"
                        mode="horizontal"
                        inlineCollapsed={false}
                        // defaultSelectedKeys={["1"]}
                        items={items}
                    />
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
                {/* Rent Daddy */}
                <h3 className="footer-title">Rent Daddy</h3>
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
                        className="link">
                        About
                    </Link>
                    <Link
                        to="/contact"
                        className="link">
                        Contact
                    </Link>
                    <Link
                        to="/privacy"
                        className="link">
                        Privacy Policy
                    </Link>
                    <Link
                        to="/terms"
                        className="link">
                        Terms of Service
                    </Link>
                </div>
                <p className="footer-text">Rent Daddy © {new Date().getFullYear()} | All Rights Reserved</p>
            </Footer>
        </Layout>
    );
};

export default PreAuthedLayout;
