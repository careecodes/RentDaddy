import { HomeOutlined, UserOutlined } from "@ant-design/icons";
import { Link } from "react-router";

{
    /* Todo: If the user is on the sidebar link, make the link black */
}
{
    /* Todo: Hover effects, make the text white or something */
}
const SidebarLinks = () => {
    return (
        <div className="menu-container d-flex flex-column gap-3 mx-auto py-4 px-1">
            {/* Home Menu Item */}
            <div className="menu-item hover-lift transition-all rounded-lg p-3">
                <div className="d-flex align-items-center">
                    <HomeOutlined
                        className="menu-icon text-white me-3"
                        style={{ fontSize: "1.25rem" }}
                    />
                    <Link
                        to="/"
                        className="text-white text-decoration-none hover:text-primary">
                        Home
                    </Link>
                </div>
            </div>

            {/* Admin Menu Item */}
            <div className="menu-item hover-lift transition-all rounded-lg p-3">
                <div className="d-flex align-items-center">
                    <UserOutlined
                        className="menu-icon text-white me-3"
                        style={{ fontSize: "1.25rem" }}
                    />
                    <Link
                        to="/admin"
                        className="text-white text-decoration-none hover:text-secondary">
                        Admin
                    </Link>
                </div>
                <div className="mt-2 ps-4 d-flex flex-column gap-2">
                    <Link
                        to="/admin"
                        className="submenu-link text-white-50 text-decoration-none hover:text-secondary transition-colors">
                        Dashboard
                    </Link>
                    <Link
                        to="/admin/init-apartment-complex"
                        className="submenu-link text-white-50 text-decoration-none hover:text-secondary transition-colors">
                        Apartment Setup
                    </Link>
                    <Link
                        to="/admin/add-tenant"
                        className="submenu-link text-white-50 text-decoration-none hover:text-secondary transition-colors">
                        Add Tenant
                    </Link>
                    <Link
                        to="/admin/admin-view-and-edit-leases"
                        className="submenu-link text-white-50 text-decoration-none hover:text-secondary transition-colors">
                        View Digital Leases
                    </Link>
                    <Link
                        to="/admin/admin-view-and-edit-work-orders-and-complaints"
                        className="submenu-link text-white-50 text-decoration-none hover:text-secondary transition-colors">
                        Work Orders & Complaints
                    </Link>
                    <Link
                        to="/components/settings"
                        className="submenu-link text-white-50 text-decoration-none hover:text-secondary transition-colors">
                        Settings
                    </Link>
                </div>
            </div>

            {/* Tenant Menu Item */}
            <div className="menu-item hover-lift transition-all rounded-lg p-3">
                <div className="d-flex align-items-center">
                    <UserOutlined
                        className="menu-icon text-white me-3"
                        style={{ fontSize: "1.25rem" }}
                    />
                    <Link
                        to="/tenant"
                        className="text-white text-decoration-none hover:text-warning">
                        Tenant
                    </Link>
                </div>
                <div className="mt-2 ps-4 d-flex flex-column gap-2">
                    <Link
                        to="/tenant"
                        className="submenu-link text-white-50 text-decoration-none hover:text-warning transition-colors">
                        Dashboard
                    </Link>
                    <Link
                        to="/guest-parking"
                        className="submenu-link text-white-50 text-decoration-none hover:text-warning transition-colors">
                        Guest Parking
                    </Link>
                    <Link
                        to="/tenant-view-and-edit-leases"
                        className="submenu-link text-white-50 text-decoration-none hover:text-warning transition-colors">
                        View Digital Leases
                    </Link>
                    <Link
                        to="/tenant-work-orders-and-complaints"
                        className="submenu-link text-white-50 text-decoration-none hover:text-warning transition-colors">
                        Work Orders & Complaints
                    </Link>
                    <Link
                        to="/components/settings"
                        className="submenu-link text-white-50 text-decoration-none hover:text-warning transition-colors">
                        Settings
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SidebarLinks;
