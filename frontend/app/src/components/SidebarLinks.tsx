import { HomeOutlined, UserOutlined } from "@ant-design/icons";
import { useEffect } from "react";
import { Link, useLocation } from "react-router";

{
    /* Todo: If the user is on the sidebar link, make the link black */
}
{
    /* Todo: Hover effects, make the text white or something */
}
const SidebarLinks = () => {
    const location = useLocation();
    const path = location.pathname;

    const getLinkClass = (linkPath: string) => {
        // Check if current path starts with the link path
        const isActive = path.startsWith(linkPath);

        // Base classes that are always applied
        const baseClasses = "text-decoration-none transition-colors";

        // For main menu items
        if (linkPath === "/") {
            // Keep incase of mobile sidebar
            return `${baseClasses} ${isActive ? "text-primary" : "text-white hover:text-primary"}`;
        } else {
            return `${baseClasses} ${isActive ? "text-light" : "text-white-50 hover:text-secondary"}`;
        }
    };

    return (
        <div className="menu-container d-flex flex-column gap-3 mx-auto py-4 px-1 vh-100">
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
                        className={getLinkClass("/admin") + (path === "/admin" ? "" : " text-white-50 hover:text-secondary")}>
                        Dashboard
                    </Link>
                    <Link
                        to="/admin/init-apartment-complex"
                        className={getLinkClass("/admin/init-apartment-complex")}>
                        Apartment Setup
                    </Link>
                    <Link
                        to="/admin/add-tenant"
                        className={getLinkClass("/admin/add-tenant")}>
                        Add Tenant
                    </Link>
                    <Link
                        to="/admin/admin-view-and-edit-leases"
                        className={getLinkClass("/admin/admin-view-and-edit-leases")}>
                        View Digital Leases
                    </Link>
                    <Link
                        to="/admin/admin-view-and-edit-work-orders-and-complaints"
                        className={getLinkClass("/admin/admin-view-and-edit-work-orders-and-complaints")}>
                        Work Orders & Complaints
                    </Link>
                    <Link
                        to="/components/settings"
                        className={getLinkClass("/components/settings")}>
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
                        className={getLinkClass("/tenant") + (path === "/tenant" ? "" : " text-white-50 hover:text-secondary")}>
                        Dashboard
                    </Link>
                    <Link
                        to="/tenant/guest-parking"
                        className={getLinkClass("/tenant/guest-parking")}>
                        Guest Parking
                    </Link>
                    <Link
                        to="/tenant/tenant-view-and-edit-leases"
                        className={getLinkClass("/tenant/tenant-view-and-edit-leases")}>
                        View Digital Leases
                    </Link>
                    <Link
                        to="/tenant/tenant-work-orders-and-complaints"
                        className={getLinkClass("/tenant/tenant-work-orders-and-complaints")}>
                        Work Orders & Complaints
                    </Link>
                    <Link
                        to="/tenant/settings"
                        className={getLinkClass("/tenant/settings")}>
                        Settings
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SidebarLinks;
