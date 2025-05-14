import { Link, useLocation } from "react-router";

{
    /* Todo: If the user is on the sidebar link, make the link black */
}
const SidebarLinks = () => {
    const location = useLocation();
    const path = location.pathname;

    const getLinkClass = (linkPath: string) => {
        // Check if current path starts with the link path
        const isActive = path.endsWith(linkPath);

        // Base classes that are always applied
        const baseClasses = "text-decoration-none transition-colors";

        // For main menu items
        if (linkPath === "/") {
            // Keep incase of mobile sidebar
            return `${baseClasses} ${isActive ? "text-primary" : "fs-6 text-white hover:text-primary"}`;
        } else {
            return `${baseClasses} ${isActive ? "text-light" : "fs-6 text-white-50 hover:text-secondary"}`;
        }
    };

    const isAdmin = path.startsWith("/admin");
    const isTenant = path.startsWith("/tenant");

    return (
        <div className="menu-container d-flex flex-column gap-3 px-1 mb-5">
            {isAdmin && (
                <div className="menu-item rounded-lg p-3">
                    <div className="mt-2 ps-4 d-flex flex-column gap-3">
                        <Link
                            to="/admin"
                            className={`d-flex align-items-center gap-2 hover-darken transition-all ${getLinkClass("/admin")}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="lucide lucide-layout-dashboard-icon lucide-layout-dashboard">
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
                            Overview
                        </Link>
                        <Link
                            to="/admin/apartment"
                            className={`d-flex align-items-center gap-2 hover-darken transition-all ${getLinkClass("/admin/init-apartment-complex")}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="lucide lucide-building-icon lucide-building">
                                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                                <path d="M9 22v-4h6v4" />
                                <path d="M8 6h.01" />
                                <path d="M16 6h.01" />
                                <path d="M8 10h.01" />
                                <path d="M16 10h.01" />
                                <path d="M8 14h.01" />
                                <path d="M16 14h.01" />
                            </svg>
                            Apartment
                        </Link>
                        <Link
                            to="/admin/tenants"
                            className={`d-flex align-items-center gap-2 hover-darken transition-all ${getLinkClass("/admin/tenants")}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="lucide lucide-users-icon lucide-users">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle
                                    cx="9"
                                    cy="7"
                                    r="4"
                                />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            Tenants
                        </Link>
                        <Link
                            to="/admin/admin-view-and-edit-leases"
                            className={`d-flex align-items-center gap-2 hover-darken transition-all ${getLinkClass("/admin/admin-view-and-edit-leases")}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="lucide lucide-file-text-icon lucide-file-text">
                                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                                <path d="M10 9H8" />
                                <path d="M16 13H8" />
                                <path d="M16 17H8" />
                            </svg>
                            Leases
                        </Link>
                        <Link
                            to="/admin/work-orders"
                            className={`d-flex align-items-center gap-2  hover-darken transition-all ${getLinkClass("/admin/work-orders")}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="lucide lucide-list-todo-icon lucide-list-todo">
                                <rect
                                    x="3"
                                    y="5"
                                    width="6"
                                    height="6"
                                    rx="1"
                                />
                                <path d="m3 17 2 2 4-4" />
                                <path d="M13 6h8" />
                                <path d="M13 12h8" />
                                <path d="M13 20h8" />
                            </svg>
                            Work Orders
                        </Link>
                        <Link
                            to="/admin/complaints"
                            className={`d-flex align-items-center gap-2  hover-darken transition-all ${getLinkClass("/admin/complaints")}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="lucide lucide-message-square-text-icon lucide-message-square-text">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                <path d="M13 8H7" />
                                <path d="M17 12H7" />
                            </svg>
                            Complaints
                        </Link>
                        <Link
                            to="/admin/lockers"
                            className={`d-flex align-items-center gap-2 hover-darken transition-all ${getLinkClass("/admin/admin-view-and-edit-smart-lockers")}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="lucide lucide-group-icon lucide-group">
                                <path d="M3 7V5c0-1.1.9-2 2-2h2" />
                                <path d="M17 3h2c1.1 0 2 .9 2 2v2" />
                                <path d="M21 17v2c0 1.1-.9 2-2 2h-2" />
                                <path d="M7 21H5c-1.1 0-2-.9-2-2v-2" />
                                <rect
                                    width="7"
                                    height="5"
                                    x="7"
                                    y="7"
                                    rx="1"
                                />
                                <rect
                                    width="7"
                                    height="5"
                                    x="10"
                                    y="12"
                                    rx="1"
                                />
                            </svg>
                            Lockers
                        </Link>
                        <Link
                            to="/admin/settings"
                            className={`d-flex align-items-center gap-2 hover-darken transition-all ${getLinkClass("/admin/settings")}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="lucide lucide-sliders-horizontal-icon lucide-sliders-horizontal">
                                <line x1="21" x2="14" y1="4" y2="4" />
                                <line x1="10" x2="3" y1="4" y2="4" />
                                <line x1="21" x2="12" y1="12" y2="12" />
                                <line x1="8" x2="3" y1="12" y2="12" />
                                <line x1="21" x2="16" y1="20" y2="20" />
                                <line x1="12" x2="3" y1="20" y2="20" />
                                <line x1="14" x2="14" y1="2" y2="6" />
                                <line x1="8" x2="8" y1="10" y2="14" />
                                <line x1="16" x2="16" y1="20" y2="22" />
                            </svg>
                            Settings
                        </Link>
                    </div>
                </div>
            )}
            {isTenant && (
                <div className="menu-item rounded-lg p-3">
                    <div className="mt-2 ps-4 d-flex flex-column gap-2">
                        <Link
                            to="/tenant"
                            className={`d-flex align-items-center gap-2 hover-darken transition-all ${getLinkClass("/tenant")}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="lucide lucide-layout-dashboard-icon lucide-layout-dashboard">
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
                            Overview
                        </Link>
                        {/* We are using a modal instead of this page  */}
                        {/* <Link
                        to="/tenant/guest-parking"
                        className={getLinkClass("/tenant/guest-parking") + " hover-lift transition-all"}>
                        Guest Parking
                    </Link> */}
                        {/* <Link
                            to="/tenant/leases"
                            className={`d-flex align-items-center gap-2 hover-darken transition-all ${getLinkClass("/tenant/leases")}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="lucide lucide-file-text-icon lucide-file-text">
                                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                                <path d="M10 9H8" />
                                <path d="M16 13H8" />
                                <path d="M16 17H8" />
                            </svg>
                            Leases
                        </Link> */}
                        <Link
                            to="/tenant/work-orders"
                            className={`d-flex align-items-center gap-2  hover-darken transition-all ${getLinkClass("/tenant/work-orders")}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="lucide lucide-list-todo-icon lucide-list-todo">
                                <rect
                                    x="3"
                                    y="5"
                                    width="6"
                                    height="6"
                                    rx="1"
                                />
                                <path d="m3 17 2 2 4-4" />
                                <path d="M13 6h8" />
                                <path d="M13 12h8" />
                                <path d="M13 20h8" />
                            </svg>
                            Work Orders
                        </Link>
                        <Link
                            to="/tenant/complaints"
                            className={`d-flex align-items-center gap-2  hover-darken transition-all ${getLinkClass("/tenant/complaints")}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="lucide lucide-message-square-text-icon lucide-message-square-text">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                <path d="M13 8H7" />
                                <path d="M17 12H7" />
                            </svg>
                            Complaints
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
