import React from "react";
import { AppstoreOutlined, BarChartOutlined, CloudOutlined, HomeOutlined, SettingOutlined, ShopOutlined, TeamOutlined, UploadOutlined, UserOutlined, VideoCameraOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Divider, Layout, Menu, theme } from "antd";
import { Link, Outlet, useLocation } from "react-router";
import { SignOutButton, useUser } from "@clerk/react-router";
import SidebarLinks from "../../components/SidebarLinks";

const { Header, Content, Footer, Sider } = Layout;

const siderStyle: React.CSSProperties = {
    height: "100vh",
    position: "sticky",
    insetInlineStart: 0,
    top: 0,
    scrollbarWidth: "thin",
    scrollbarGutter: "stable",
    backgroundColor: "#00674f",
};

const AuthenticatedLayout: React.FC = () => {
    const { isSignedIn, user } = useUser();

    // Get the path from the current url and check if it contains admin or tenant and set the default selected key based on that
    const path = useLocation().pathname;
    const isAdmin = path.includes("/admin");
    const isTenant = path.includes("/tenant");

    // const defaultSelectedKey = isAdmin ? "admin" : isTenant ? "tenant" : "dashboard";

    console.log(isAdmin, isTenant, "isAdmin, isTenant");

    return (
        <Layout
            hasSider
            className="min-vh-100 flex flex-row">
            {/* Sidebar Container */}
            <Sider style={siderStyle}>
                {/* Logo and Title Container */}
                <div className="logo-container flex flex-column align-items-center justify-content-center py-3 py-md-4">
                    <Link
                        to="/"
                        className="text-decoration-none d-flex gap-2 my-auto">
                        <img
                            src="/logo.png"
                            alt="EZRA Logo"
                            className="logo-image mx-auto d-flex bg-white rounded-5"
                            width={48}
                            height={48}
                        />

                        <h2 className="logo-title text-white my-1 text-center">EZRA</h2>
                    </Link>
                    <Divider className="divider-text border-white" />
                </div>

                {/* Menu Container */}
                <SidebarLinks />
                {/* Avatar and Login Container */}
                <div className="avatar-container position-absolute bottom-0 w-100 pb-3 flex flex-column align-items-center justify-content-center">
                    {isSignedIn ? (
                        <SignOutButton>
                            <div className="flex align-items-center justify-content-center gap-2 bg-white mb-4 cursor-pointer btn">
                                <Avatar
                                    className="avatar-icon"
                                    size={24}
                                    src={user?.imageUrl}
                                />
                                <p className="login-text text-black m-0">Sign Out</p>
                            </div>
                        </SignOutButton>
                    ) : (
                        <Link
                            to="/auth/login"
                            className="text-decoration-none">
                            <div className="flex align-items-center justify-content-center gap-2 mb-4">
                                <p className="login-text text-white m-0">Login</p>
                                <Avatar
                                    className="avatar-icon"
                                    size={48}
                                    icon={<UserOutlined />}
                                />
                            </div>
                        </Link>
                    )}
                </div>
            </Sider>

            {/* Content Container */}
            <Layout className="flex flex-column flex-grow-1">
                <Content className="flex-grow-1">
                    <Outlet />
                </Content>

                {/* Footer Container */}
                <Footer style={{ textAlign: "center" }}>
                    <Link
                        to="/about"
                        className="disabled-link"
                        style={{ padding: "0 16px", color: "#595959", textDecoration: "none" }}>
                        About
                    </Link>
                    <Link
                        to="/contact"
                        className="disabled-link"
                        style={{ padding: "0 16px", color: "#595959", textDecoration: "none" }}>
                        Contact
                    </Link>
                    <Link
                        to="/privacy"
                        className="disabled-link"
                        style={{ padding: "0 16px", color: "#595959", textDecoration: "none" }}>
                        Privacy Policy
                    </Link>
                    <Link
                        to="/terms"
                        className="disabled-link"
                        style={{ padding: "0 16px", color: "#595959", textDecoration: "none" }}>
                        Terms of Service
                    </Link>
                    <p
                        className="footer-text"
                        style={{ margin: 0, color: "#8c8c8c", fontSize: "14px" }}>
                        EZRA © {new Date().getFullYear()} | All Rights Reserved
                    </p>
                </Footer>
            </Layout>
        </Layout>
    );
};

export default AuthenticatedLayout;
