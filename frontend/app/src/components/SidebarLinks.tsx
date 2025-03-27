import { UserOutlined } from "@ant-design/icons";
import { Link, useLocation } from "react-router";

{
    /* Todo: If the user is on the sidebar link, make the link black */
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

    const isAdmin = path.startsWith("/admin");
    const isTenant = path.startsWith("/tenant");

    return (
        <div className="menu-container d-flex flex-column gap-3 px-1 mb-5">
            {/* Home Menu Item */}
            {/* <div className="menu-item rounded-lg px-2 px-md-3 mt-3">
                <div className="d-flex align-items-center">
                    <HomeOutlined
                        className="menu-icon text-white me-2 me-md-3"
                        style={{ fontSize: "1.125rem" }}
                    />
                    <Link
                        to="/"
                        className="text-white text-decoration-none hover:text-primary hover-lift transition-all">
                        Home
                    </Link>
                </div>
            </div> */}

            {isAdmin && (
                <div className="menu-item rounded-lg p-3">
                    <div className="d-flex align-items-center">
                        <UserOutlined
                            className="menu-icon text-white me-3"
                            style={{ fontSize: "1.25rem" }}
                        />
                        <Link
                            to="/admin"
                            className="text-white text-decoration-none hover:text-secondary hover-lift transition-all">
                            Admin
                        </Link>
                    </div>
                    <div className="mt-2 ps-4 d-flex flex-column gap-2">
                        <Link
                            to="/admin"
                            className={getLinkClass("/admin") + (path === "/admin" ? "" : " text-white-50 hover:text-secondary") + " hover-lift transition-all"}>
                            Dashboard
                        </Link>
                        <Link
                            to="/admin/init-apartment-complex"
                            className={getLinkClass("/admin/init-apartment-complex") + " hover-lift transition-all"}>
                            Apartment Setup
                        </Link>
                        <Link
                            to="/admin/manage-tenants"
                            className={getLinkClass("/admin/manage-tenants") + " hover-lift transition-all"}>
                            Manage Tenants
                        </Link>
                        <Link
                            to="/admin/admin-view-and-edit-leases"
                            className={getLinkClass("/admin/admin-view-and-edit-leases") + " hover-lift transition-all"}>
                            View Digital Leases
                        </Link>
                        <Link
                            to="/admin/admin-view-and-edit-work-orders-and-complaints"
                            className={getLinkClass("/admin/admin-view-and-edit-work-orders-and-complaints") + " hover-lift transition-all"}>
                            Work Orders & Complaints
                        </Link>
                        <Link
                            to="/admin/admin-view-and-edit-smart-lockers"
                            className={getLinkClass("/admin/admin-view-and-edit-smart-lockers") + " hover-lift transition-all"}>
                            Smart Lockers
                        </Link>
                        {/* <Link
                            to="/components/settings"
                            className={getLinkClass("/components/settings") + " hover-lift transition-all"}>
                            Settings
                        </Link> */}
                    </div>
                </div>
            )}
            {isTenant && (
                <div className="menu-item rounded-lg p-3">
                    <div className="d-flex align-items-center">
                        <UserOutlined
                            className="menu-icon text-white me-3"
                            style={{ fontSize: "1.25rem" }}
                        />
                        <Link
                            to="/tenant"
                            className="text-white text-decoration-none hover:text-warning hover-lift transition-all">
                            Tenant
                        </Link>
                    </div>
                    <div className="mt-2 ps-4 d-flex flex-column gap-2">
                        <Link
                            to="/tenant"
                            className={getLinkClass("/tenant") + (path === "/tenant" ? "" : " text-white-50 hover:text-secondary") + " hover-lift transition-all"}>
                            Dashboard
                        </Link>
                        {/* We are using a modal instead of this page  */}
                        {/* <Link
                        to="/tenant/guest-parking"
                        className={getLinkClass("/tenant/guest-parking") + " hover-lift transition-all"}>
                        Guest Parking
                    </Link> */}
                        <Link
                            to="/tenant/tenant-view-and-edit-leases"
                            className={getLinkClass("/tenant/tenant-view-and-edit-leases") + " hover-lift transition-all"}>
                            View Digital Leases
                        </Link>
                        <Link
                            to="/tenant/tenant-complaints"
                            className={getLinkClass("/tenant/tenant-work-orders-and-complaints") + " hover-lift transition-all"}>
                            Complaints
                        </Link>
                        <Link
                            to="/tenant/tenant-work-orders"
                            className={getLinkClass("/tenant/tenant-work-orders-and-complaints") + " hover-lift transition-all"}>
                            Work Orders
                        </Link>
                        {/* <Link
                            to="/tenant/settings"
                            className={getLinkClass("/tenant/settings") + " hover-lift transition-all"}>
                            Settings
                        </Link> */}
                    </div>
                </div>
            )}
            <div className="mt-5" />
        </div>
    );
};

export default SidebarLinks;
