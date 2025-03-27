// TODO: Use React Router to make different layouts for pre and post login sessions.

// THIS COMPONENT IS USED FOR THE LAYOUT AND INCLUDES THE SIDEBAR AND FOOTER.
// IT IS CURRENTLY BOILERPLATE CODE AND NEEDS TO BE REPLACED WITH THE ACTUAL CONTENT. (3/2/2025 @ 1:40PM)

import React from "react";
import Icon, { AppstoreOutlined, BarChartOutlined, CloudOutlined, ShopOutlined, TeamOutlined, UploadOutlined, UserOutlined, VideoCameraOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Divider, Layout, Menu, theme } from "antd";
import { Link } from "react-router";

const { Header, Content, Footer, Sider } = Layout;

const siderStyle: React.CSSProperties = {
    overflow: "auto",
    height: "100vh",
    position: "sticky",
    insetInlineStart: 0,
    top: 0,
    bottom: 0,
    scrollbarWidth: "thin",
    scrollbarGutter: "stable",
};

// TODO: Add the actual menu items.
const items: MenuProps["items"] = [UserOutlined, VideoCameraOutlined, UploadOutlined, BarChartOutlined, CloudOutlined, AppstoreOutlined, TeamOutlined, ShopOutlined].map((icon, index) => ({
    key: String(index + 1),
    icon: React.createElement(icon),
    label: `nav ${index + 1}`,
}));

const UniversalSidebar: React.FC = () => {
    const {
        token: { borderRadiusLG },
    } = theme.useToken();

    return (
        <Layout hasSider>
            {/* Sidebar Container */}
            <Sider style={siderStyle}>
                {/* Logo and Title Container with Link to Landing Page if not logged in, and to Dashboard if logged in */}
                <div className="demo-logo-vertical d-flex flex-column align-items-center justify-content-center my-5">
                    <Link to="/">
                        <img
                            src="/logo.png"
                            alt="EZRA Logo"
                            className="logo-image"
                            width={64}
                            height={64}
                            style={{
                                display: "flex",
                                margin: "0 auto",
                            }}
                        />
                        <p className="fs-2 logo-text text-white">EZRA</p>
                    </Link>
                    <Divider className="divider-text border-white" />
                </div>

                {/* Menu Container */}
                <Menu
                    theme="dark"
                    mode="inline"
                    defaultSelectedKeys={["4"]}
                    items={items}
                />

                {/* Avatar and Login Container */}
                <div
                    className="avatar-container d-flex flex-column position-absolute bottom-0"
                    style={{ width: "100%" }}>
                    <Divider className="divider-text border-white" />

                    <Link to="/authentication/login">
                        <div className="d-flex flex-row align-items-center justify-content-center">
                            <p className="login-text text-white">Login</p>
                            <Avatar
                                className="avatar-icon"
                                size={64}
                                icon={<UserOutlined />}
                            />
                        </div>
                    </Link>
                </div>
            </Sider>

            {/* Content Container */}
            <Layout>
                {/* No Header Post Login */}
                {/* <Header style={{ padding: 0, background: colorBgContainer }} /> */}
                <Content style={{ margin: "24px 16px 0", overflow: "initial" }}>
                    <div
                        style={{
                            padding: 24,
                            textAlign: "center",
                            borderRadius: borderRadiusLG,
                        }}>
                        <p>long content</p>
                    </div>
                </Content>

                {/* Footer Container */}
                <Footer style={{ textAlign: "center" }}>
                    <Divider className="divider-text border-black" />
                    <p>EZRA ©{new Date().getFullYear()} Created by EZRA</p>
                </Footer>
            </Layout>
        </Layout>
    );
};

export default UniversalSidebar;
