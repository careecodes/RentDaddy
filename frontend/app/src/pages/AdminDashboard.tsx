import { CalendarOutlined, InboxOutlined, ToolOutlined, UserOutlined, WarningOutlined } from "@ant-design/icons";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import { CardComponent } from "../components/reusableComponents/cardComponent";
import TableComponent from "../components/reusableComponents/TableComponent";
import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table/interface";
import ModalComponent from "../components/ModalComponent";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import { Link } from "react-router";

const AdminDashboard = () => {
    const handleAddPackage = () => {
        console.log("Package added successfully");
    };

    const columnsLeases: ColumnsType<{ name: string; roomNumber: string; leaseStatus: string }> = [
        { title: "Name", dataIndex: "name" },
        { title: "Room Number", dataIndex: "roomNumber" },
        {
            title: "Lease Status",
            dataIndex: "leaseStatus",
            render: (leaseStatus: string) => (
                <Tag color={leaseStatus === "Active" ? "green" : "red"}>{leaseStatus}</Tag>
            ),
        },
    ];

    const dataLeases = [
        { name: "John Doe", roomNumber: "101", leaseStatus: "Active" },
        { name: "Jane Doe", roomNumber: "102", leaseStatus: "Inactive" },
        { name: "Jim Doe", roomNumber: "103", leaseStatus: "Active" },
    ];

    const columnsWorkOrdersAndComplaints: ColumnsType<{ name: string; roomNumber: string; type: string; status: string }> = [
        { title: "Name", dataIndex: "name" },
        { title: "Room Number", dataIndex: "roomNumber" },
        {
            title: "Type",
            dataIndex: "type",
            render: (type: string) => <Tag color={type === "Work Order" ? "blue" : "red"}>{type}</Tag>,
        },
        {
            title: "Status",
            dataIndex: "status",
            render: (status: string) => (
                <Tag color={status === "Solved" ? "green" : "red"}>{status}</Tag>
            ),
        },
    ];

    const dataWorkOrdersAndComplaints = [
        { name: "John Doe", roomNumber: "101", type: "Work Order", status: "Solved" },
        { name: "Jane Doe", roomNumber: "102", type: "Complaint", status: "Active" },
        { name: "Jim Doe", roomNumber: "103", type: "Work Order", status: "Active" },
    ];

    return (
        <div className="container">
            <h1 className="mb-4">Admin Dashboard</h1>
            <AlertComponent
                message="Welcome to the Admin Dashboard"
                description="This is the Admin Dashboard. Here's a demo alert component."
                type="success"
            />

            {/* Dashboard Statistics Cards */}
            <div className="d-flex gap-4 my-5 w-100 justify-content-between">
                <CardComponent
                    title="Work Orders"
                    value={10}
                    description="Active maintenance requests"
                    hoverable={true}
                    icon={<ToolOutlined style={{ fontSize: "24px", color: "#1890ff", marginBottom: "16px" }} />}
                    button={<Link to="/admin/admin-view-and-edit-work-orders-and-complaints"><ButtonComponent title="View All" type="primary" /></Link>}
                />
                <CardComponent
                    title="Complaints"
                    value={10}
                    description="Pending tenant issues"
                    hoverable={true}
                    icon={<WarningOutlined style={{ fontSize: "24px", color: "#faad14", marginBottom: "16px" }} />}
                    button={<Link to="/admin/admin-view-and-edit-work-orders-and-complaints"><ButtonComponent title="View All" type="primary" /></Link>}
                />
                <CardComponent
                    title="Packages"
                    value={10}
                    description="Awaiting delivery"
                    hoverable={true}
                    icon={<InboxOutlined style={{ fontSize: "24px", color: "#52c41a", marginBottom: "16px" }} />}
                    button={<ModalComponent buttonTitle="Add Package" content="" type="Smart Locker" handleOkay={handleAddPackage} />}
                />
                <CardComponent
                    title="Events"
                    value={10}
                    description="Scheduled this month"
                    hoverable={true}
                    icon={<CalendarOutlined style={{ fontSize: "24px", color: "#722ed1", marginBottom: "16px" }} />}
                    button={<ButtonComponent title="View All" type="primary" />}
                />
            </div>

            {/* Leases and Work Orders / Complaints Table */}
            <div className="d-flex gap-4 my-4 w-100">
                <div className="d-flex flex-column w-50">
                    <h2 className="mb-3">Leases</h2>
                    <TableComponent columns={columnsLeases} dataSource={dataLeases} icon={<UserOutlined />} />
                </div>
                <div className="d-flex flex-column w-50">
                    <h2 className="mb-3">Work Orders / Complaints</h2>
                    <TableComponent columns={columnsWorkOrdersAndComplaints} dataSource={dataWorkOrdersAndComplaints} icon={<ToolOutlined />} />
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;