import React from "react";
import { Layout, Menu, theme } from "antd";
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
                    Your Home
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
                <Link to="/auth/login">Login</Link>
            ),
        },
    ];

    return (
        <Layout>
            <Header
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "#00674f",
                }}>
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

                {/* Right Side Nav */}
                <div style={{ width: "200px" }}>
                    <Menu
                        theme="light"
                        mode="horizontal"
                        inlineCollapsed={false}
                        defaultSelectedKeys={["1"]}
                        items={items}
                    />
                </div>
            </Header>
            <Content style={{ padding: "0 48px" }}>
                {/* TODO: Decide if we are using this */}
                {/* <Breadcrumb style={{ margin: '16px 0' }}>
                        <Breadcrumb.Item><Link to="/">Home</Link></Breadcrumb.Item>
                        <Breadcrumb.Item>Test</Breadcrumb.Item>
                        <Breadcrumb.Item>Breadcrumb</Breadcrumb.Item>
                    </Breadcrumb>
                */}

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
            <Footer style={{ textAlign: "center", padding: "24px 50px", backgroundColor: "#f5f5f5" }}>
                {/* Rent Daddy */}
                <h3
                    className="footer-title"
                    style={{ marginBottom: "16px", color: "#1a1a1a" }}>
                    Rent Daddy
                </h3>
                {/* Logo */}
                <img
                    // src="https://placehold.co/64x64?text=Logo"
                    src="/logo.png"
                    alt="logo"
                    className="footer-logo"
                    style={{
                        display: "block",
                        margin: "0 auto",
                        marginBottom: "24px",
                        borderRadius: "8px",
                    }}
                />
                <div
                    className="footer-links"
                    style={{ marginBottom: "24px" }}>
                    <Link
                        to="/about"
                        style={{ padding: "0 16px", color: "#595959", textDecoration: "none" }}>
                        About
                    </Link>
                    <Link
                        to="/contact"
                        style={{ padding: "0 16px", color: "#595959", textDecoration: "none" }}>
                        Contact
                    </Link>
                    <Link
                        to="/privacy"
                        style={{ padding: "0 16px", color: "#595959", textDecoration: "none" }}>
                        Privacy Policy
                    </Link>
                    <Link
                        to="/terms"
                        style={{ padding: "0 16px", color: "#595959", textDecoration: "none" }}>
                        Terms of Service
                    </Link>
                </div>
                <p
                    className="footer-text"
                    style={{ margin: 0, color: "#8c8c8c", fontSize: "14px" }}>
                    Rent Daddy Â© {new Date().getFullYear()} | All Rights Reserved
                </p>
            </Footer>
        </Layout>
    );
};

export default PreAuthedLayout;
