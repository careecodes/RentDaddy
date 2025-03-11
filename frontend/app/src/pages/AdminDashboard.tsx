import { CalendarOutlined, InboxOutlined, ToolOutlined, UserOutlined, WarningOutlined } from "@ant-design/icons"
import AlertComponent from "../components/reusableComponents/AlertComponent"
import { CardComponent } from "../components/reusableComponents/cardComponent"
import { TableComponent } from "../components/reusableComponents/TableComponent"
import { Tag } from "antd"
import ModalComponent from "../components/ModalComponent"
import ButtonComponent from "../components/reusableComponents/ButtonComponent"
import { Link, redirect } from "react-router"

const AdminDashboard = () => {

    const handleAddPackage = () => {
        console.log("Package added successfully");
        // Add your logic for adding a package here
    };

    const columnsLeases = [
        {
            title: "Name",
            dataIndex: "name",
        },
        {
            title: "Room Number",
            dataIndex: "roomNumber",
        },
        {
            title: "Lease Status",
            dataIndex: "leaseStatus",
            render: (leaseStatus: string) => {
                return leaseStatus === "Active" ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>
            }
        },
    ]

    const dataLeases = [
        {
            name: "John Doe",
            roomNumber: "101",
            leaseStatus: "Active",
        },
        {
            name: "Jane Doe",
            roomNumber: "102",
            leaseStatus: "Inactive",
        },
        {
            name: "Jim Doe",
            roomNumber: "103",
            leaseStatus: "Active",
        },
    ]

    const columnsWorkOrdersAndComplaints = [
        {
            title: "Name",
            dataIndex: "name",
        },
        {
            title: "Room Number",
            dataIndex: "roomNumber",
        },
        {
            title: "Type",
            dataIndex: "type",
            render: (type: string) => {
                return type === "Work Order" ? <Tag color="blue">Work Order</Tag> : <Tag color="red">Complaint</Tag>
            }
        },
        {
            title: "Status",
            dataIndex: "status",
            render: (leaseStatus: string) => {
                return leaseStatus === "Active" ? <Tag color="green">Solved</Tag> : <Tag color="red">Active</Tag>
            }
        },
    ]

    const dataWorkOrdersAndComplaints = [
        {
            name: "John Doe",
            roomNumber: "101",
            leaseStatus: "Active",
        },
        {
            name: "Jane Doe",
            roomNumber: "102",
            leaseStatus: "Inactive",
        },
        {
            name: "Jim Doe",
            roomNumber: "103",
            leaseStatus: "Active",
        },
    ]

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
                    icon={<ToolOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: '16px' }} />}
                    button={<Link to="/admin/admin-view-and-edit-work-orders-and-complaints"><ButtonComponent title="View All" type="primary" onClick={() => { }} /></Link>}
                />
                <CardComponent
                    title="Complaints"
                    value={10}
                    description="Pending tenant issues"
                    hoverable={true}
                    icon={<WarningOutlined style={{ fontSize: '24px', color: '#faad14', marginBottom: '16px' }} />}
                    button={<Link to="/admin/admin-view-and-edit-work-orders-and-complaints"><ButtonComponent title="View All" type="primary" onClick={() => { }} /></Link>}
                />
                <CardComponent
                    title="Packages"
                    value={10}
                    description="Awaiting delivery"
                    hoverable={true}
                    icon={<InboxOutlined style={{ fontSize: '24px', color: '#52c41a', marginBottom: '16px' }} />}
                    button={<ModalComponent buttonTitle="Add Package" content="" type="Smart Locker" handleOkay={handleAddPackage} />}
                />
                <CardComponent
                    title="Events"
                    value={10}
                    description="Scheduled this month"
                    hoverable={true}
                    icon={<CalendarOutlined style={{ fontSize: '24px', color: '#722ed1', marginBottom: '16px' }} />}
                    button={<ButtonComponent title="View All" type="primary" onClick={() => { }} />}
                />
            </div>

            {/* Leases and Work Order / Complaint Table */}
            <div className="d-flex gap-4 my-4 w-100">
                <div className="d-flex flex-column w-50">
                    <h2 className="mb-3">Leases</h2>
                    <TableComponent
                        columns={columnsLeases}
                        dataSource={dataLeases}
                    />
                </div>
                <div className="d-flex flex-column w-50">
                    <h2 className="mb-3">Work Order / Complaint</h2>
                    <TableComponent
                        columns={columnsWorkOrdersAndComplaints}
                        dataSource={dataWorkOrdersAndComplaints}
                        icon={<UserOutlined />}
                    />
                </div>
            </div>
        </div>
    )
}

export default AdminDashboard