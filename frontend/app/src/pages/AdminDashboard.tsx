import { useState } from "react";
import { CalendarOutlined, InboxOutlined, ToolOutlined, WarningOutlined } from "@ant-design/icons";
import { CardComponent } from "../components/reusableComponents/CardComponent";
import TableComponent from "../components/reusableComponents/TableComponent";
import { Tag, Button, Modal } from "antd";
import type { ColumnsType } from "antd/es/table/interface";
import ModalComponent from "../components/ModalComponent";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import { Link } from "react-router";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { generateAccessCode, logger } from "../lib/utils";
import { toast } from "sonner";
import { Parking } from "../types/types";
import { SERVER_API_URL } from "../utils/apiConfig";

const absoluteServerUrl = SERVER_API_URL;

// interface Locker {
//     id: number;
//     user_id: string | null;
//     access_code: string | null;
//     in_use: boolean;
// }

interface WorkOrder {
    id: number;
    created_by: number;
    order_number: number;
    category: string;
    title: string;
    description: string;
    unit_number: number;
    status: string;
    updated_at: string;
    created_at: string;
    type: "work_order";
}

interface Complaint {
    id: number;
    created_by: number;
    title: string;
    description: string;
    unit_number: number;
    status: string;
    updated_at: string;
    created_at: string;
    type: "complaint";
}

type WorkOrderOrComplaint = WorkOrder | Complaint;

interface Tenant {
    id: number;
    clerk_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    unit_number: number;
    status: string;
    created_at: string;
    role: string;
}

const AdminDashboard = () => {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    const [selectedUserId, setSelectedUserId] = useState<string | null>();
    const [accessCode, setAccessCode] = useState<string>(generateAccessCode());

    // Query for fetching tenants
    async function getTenants() {
        const token = await getToken();
        if (!token) {
            throw new Error("No authentication token available");
        }

        const res = await fetch(`${absoluteServerUrl}/admin/tenants`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch tenants: ${res.status}`);
        }

        // logger.debug("Response data for tenants query:", data);
        return (await res.json()) as Tenant[];
    }

    // Query for fetching work orders
    async function getWorkOrders() {
        const token = await getToken();
        if (!token) {
            throw new Error("No authentication token available");
        }
        // logger.debug("Fetching work orders...");
        // logger.debug("API URL:", `${absoluteServerUrl}/admin/work_orders`);

        const res = await fetch(`${absoluteServerUrl}/admin/work_orders`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        // logger.debug("Response status:", res.status);

        if (!res.ok) {
            throw new Error(`Failed to fetch work orders: ${res.status}`);
        }

        // logger.debug("Response data:", data);
        return (await res.json()) as WorkOrder[];
    }

    // logger.debug("Query state:", { isLoading: isLoadingWorkOrders, data: workOrders });

    // Query for fetching complaints
    async function getComplaints() {
        const token = await getToken();
        if (!token) {
            throw new Error("No authentication token available");
        }
        // logger.debug("Fetching complaints...");
        // logger.debug("API URL:", `${absoluteServerUrl}/admin/complaints`);
        const res = await fetch(`${absoluteServerUrl}/admin/complaints`, {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch complaints: ${res.status}`);
        }

        return (await res.json()) as Complaint[];
    }

    // logger.debug("complaints:", complaints);
    // logger.debug("Query state for complaints:", { isLoading: isLoadingComplaints, data: complaints });

    async function getLockersInUse() {
        const token = await getToken();
        if (!token) {
            throw new Error("No authentication token available");
        }

        const res = await fetch(`${absoluteServerUrl}/admin/lockers/in-use/count`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch lockers in use count: ${res.status}`);
        }
        const data = (await res.json()) as { lockers_in_use: number };
        return data.lockers_in_use;
    }

    async function getParkingPassAmount() {
        const token = await getToken();
        if (!token) {
            throw new Error("No authentication token available");
        }

        const res = await fetch(`${absoluteServerUrl}/admin/parking/in-use/count`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch lockers in use count: ${res.status}`);
        }
        return (await res.json()) as Parking[];
    }

    const [tenants, complaints, workOrders, lockersInUse, parking] = useQueries({
        queries: [
            { queryKey: [`tenants`], queryFn: getTenants },
            { queryKey: [`complaints`], queryFn: getComplaints },
            { queryKey: [`workOrders`], queryFn: getWorkOrders },
            { queryKey: [`numberOfLockersInUse`], queryFn: getLockersInUse },
            { queryKey: [`parking`], queryFn: getParkingPassAmount },
        ],
    });

    const { mutate: addPackage } = useMutation({
        mutationKey: ["admin-add-package"],
        mutationFn: async ({ selectedUserId, accessCode }: { selectedUserId: string | null; accessCode: string }) => {
            const token = await getToken();
            if (!token) {
                throw new Error("No authentication token available");
            }
            if (!selectedUserId) {
                logger.error("Please select a tenant");
                return;
            }

            if (!accessCode) {
                logger.error("Please enter an access code");
                return;
            }

            const res = await fetch(`${absoluteServerUrl}/admin/lockers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_clerk_id: selectedUserId, access_code: accessCode }),
            });
            if (!res.ok) {
                throw new Error(`Failed creating new locker`);
            }
        },
        onSuccess: () => {
            // queryClient.invalidateQueries({ queryKey: ["numberOfLockersInUse"] });
            queryClient.invalidateQueries({ queryKey: ["lockers"] });
            queryClient.invalidateQueries({ queryKey: ["numberOfLockersInUse"] });
            setAccessCode(generateAccessCode());
            setSelectedUserId(undefined);
            return toast.success("Success", { description: "Created new package" });
        },
        onError: () => {
            return toast.error("Oops", { description: "Something happned please try again another time." });
        },
    });

    const columnsLeases: ColumnsType<Tenant> = [
        {
            title: "Name",
            render: (_, record) => `${record.first_name} ${record.last_name}`,
        },
        {
            title: "Email",
            dataIndex: "email",
            ellipsis: true,
            render: (email: string) => (email.length > 30 ? email.slice(0, 30) + "..." : email || "Not Assigned"),
        },
        {
            title: "Lease Start",
            dataIndex: "lease_start",
            render: (lease_start: string) => (lease_start ? new Date(lease_start).toLocaleDateString() : "April 1, 2025"),
        },
        {
            title: "Lease End",
            dataIndex: "lease_end",
            render: (lease_end: string) => (lease_end ? new Date(lease_end).toLocaleDateString() : "March 31, 2026"),
        },
        // {
        //     title: "Unit",
        //     dataIndex: "unit_number",
        //     render: (unit: number) => unit || "N/A",
        // },
        {
            title: "Status",
            dataIndex: "status",
            render: (status: string) => <Tag color={status.toLowerCase() === "active" ? "green" : "red"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Tag>,
        },
    ];

    // Add key to each tenant
    const tenantsWithKeys =
        tenants.data?.map((tenant: Tenant) => ({
            ...tenant,
            key: tenant.id,
        })) ?? [];

    const columnsComplaints: ColumnsType<WorkOrderOrComplaint> = [
        {
            title: "Type",
            dataIndex: "type",
            render: (type: string) => <Tag color={type === "work_order" ? "blue" : "purple"}>{type.replace("_", " ").toUpperCase()}</Tag>,
        },
        {
            title: "Title",
            dataIndex: "title",
        },
        {
            title: "Unit",
            dataIndex: "unit_number",
        },
        {
            title: "Status",
            dataIndex: "status",
            render: (status: string) => <Tag color={status.toLowerCase() === "open" ? "orange" : "green"}>{status}</Tag>,
        },
        // {
        //     title: "Created",
        //     dataIndex: "created_at",
        //     sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        //     defaultSortOrder: "descend",
        //     render: (date: string) => new Date(date).toLocaleDateString(),
        // },
    ];

    const columnsWorkOrders: ColumnsType<WorkOrderOrComplaint> = [
        {
            title: "Type",
            dataIndex: "type",
            render: (type: string) => <Tag color={type === "work_order" ? "blue" : "purple"}>{type.replace("_", " ").toUpperCase()}</Tag>,
        },
        {
            title: "Title",
            dataIndex: "title",
        },
        {
            title: "Unit",
            dataIndex: "unit_number",
        },
        {
            title: "Category",
            dataIndex: "category",
            render: (category: string, record: WorkOrderOrComplaint) => (record.type === "work_order" ? <Tag color="blue">{category}</Tag> : null),
        },
        {
            title: "Status",
            dataIndex: "status",
            render: (status: string) => <Tag color={status.toLowerCase() === "open" ? "orange" : "green"}>{status}</Tag>,
        },
        // {
        //     title: "Created",
        //     dataIndex: "created_at",
        //     sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        //     defaultSortOrder: "descend",
        //     render: (date: string) => new Date(date).toLocaleDateString(),
        // },
    ];

    // Combine and add keys to work orders and complaints (I did this because originally I was using a single table for both)
    const workOrdersWithKeys =
        workOrders.data?.map((order: WorkOrder) => ({
            ...order,
            key: `wo-${order.id}`,
            type: "work_order" as const,
        })) ?? [];

    const complaintsWithKeys =
        complaints.data?.map((complaint: Complaint) => ({
            ...complaint,
            key: `c-${complaint.id}`,
            type: "complaint" as const,
        })) ?? [];

    // Combine and sort both types by creation date
    const combinedItems = [...workOrdersWithKeys, ...complaintsWithKeys].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const WORK_ORDERS_COUNT = workOrders.data?.length ?? 0;
    const COMPLAINTS_COUNT = complaints.data?.length ?? 0;
    logger.log("Work orders count:", workOrdersWithKeys.length);
    logger.log("Complaints count:", COMPLAINTS_COUNT);

    return (
        <div className="container">
            <PageTitleComponent title="Admin Dashboard" />
            {/* Dashboard Statistics Cards */}
            <div className="d-flex gap-4 my-5 w-100 justify-content-between">
                <CardComponent
                    title="Work Orders"
                    value={WORK_ORDERS_COUNT ?? 0}
                    description="Active maintenance requests"
                    hoverable={true}
                    icon={<ToolOutlined style={{ fontSize: "24px", color: "#1890ff", marginBottom: "16px" }} />}
                    button={
                        <Link to="/admin/work-orders">
                            <ButtonComponent
                                title="View All"
                                type="primary"
                            />
                        </Link>
                    }
                />
                <CardComponent
                    title="Complaints"
                    value={COMPLAINTS_COUNT ?? 0}
                    description="Pending tenant issues"
                    hoverable={true}
                    icon={<WarningOutlined style={{ fontSize: "24px", color: "#faad14", marginBottom: "16px" }} />}
                    button={
                        <Link to="/admin/complaints">
                            <ButtonComponent
                                title="View All"
                                type="primary"
                            />
                        </Link>
                    }
                />
                <CardComponent
                    title="Packages"
                    value={lockersInUse.data ?? 0}
                    description="Awaiting delivery"
                    hoverable={true}
                    icon={<InboxOutlined style={{ fontSize: "24px", color: "#52c41a", marginBottom: "16px" }} />}
                    button={
                        <div className="d-flex gap-2">
                            <Link to="/admin/lockers">
                                <ButtonComponent
                                    title="View All"
                                    type="primary"
                                />
                            </Link>
                            <ModalComponent
                                buttonTitle="Add Package"
                                buttonType="default"
                                modalTitle="Add Package"
                                content=""
                                tenant={tenants.data ?? []}
                                type="Smart Locker"
                                setUserId={setSelectedUserId}
                                setAccessCode={setAccessCode}
                                selectedUserId={selectedUserId ?? ""}
                                accessCode={accessCode ?? ""}
                                handleOkay={async (formData?: { userId: string; accessCode: string }) => {
                                    if (formData) {
                                        setSelectedUserId(formData.userId);
                                        setAccessCode(formData.accessCode);
                                    }
                                    addPackage({ selectedUserId: selectedUserId ?? "", accessCode: accessCode });
                                }}
                            />
                        </div>
                    }
                />
                <CardComponent
                    title="Parking Permits"
                    value={parking.data?.length ?? 0}
                    description={`Guests on premises`}
                    hoverable={true}
                    icon={<CalendarOutlined style={{ fontSize: "24px", color: "#722ed1", marginBottom: "16px" }} />}
                    button={<ParkingPermitModal permits={parking.data ?? []} />}
                />
            </div>

            {/* Work Orders / Complaints Table */}
            <div className="d-flex gap-4 my-4 w-100">
                <div className="d-flex flex-column w-50">
                    <div className="d-flex flex-column justify-content-between align-items-center mb-1">
                        <h2 className="mb-1">Complaints</h2>
                        <Link to="/admin/complaints">
                            <p>(View All)</p>
                        </Link>
                    </div>
                    <TableComponent
                        columns={columnsComplaints}
                        dataSource={combinedItems.filter((item) => item.type === "complaint").slice(0, 5)}
                        loading={complaints.isLoading}
                        onChange={() => {}}
                        pagination={false}
                    />
                </div>
                <div className="d-flex flex-column w-50">
                    <div className="d-flex flex-column justify-content-between align-items-center mb-1">
                        <h2 className="mb-1">Work Orders</h2>
                        <Link to="/admin/work-orders">
                            <p>(View All)</p>
                        </Link>
                    </div>
                    <TableComponent
                        columns={columnsWorkOrders}
                        dataSource={combinedItems.filter((item) => item.type === "work_order").slice(0, 5)}
                        loading={workOrders.isLoading}
                        onChange={() => {}}
                        pagination={false}
                    />
                </div>
            </div>
            {/* Leases Table */}
            <div className="d-flex flex-column w-100">
                <div className="d-flex flex-column justify-content-between align-items-center mb-1">
                    <h2 className="mb-1">Leases</h2>
                    <Link to="/admin/admin-view-and-edit-leases">
                        <p>(View All)</p>
                    </Link>
                </div>
                <TableComponent
                    columns={columnsLeases}
                    dataSource={tenantsWithKeys.slice(0, 5)}
                    onChange={() => {}}
                    loading={tenants.isLoading}
                    pagination={false}
                />
            </div>
        </div>
    );
};

export default AdminDashboard;

interface ParkingPermitModalProps {
    permits: Parking[];
}

function ParkingPermitModal(props: ParkingPermitModalProps) {
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const showModal = () => {
        setInternalModalOpen(true);
    };
    const handleCancel = () => {
        if (internalModalOpen) {
            setInternalModalOpen(false);
        }
        if (internalModalOpen === undefined) {
            setInternalModalOpen(false);
        }
    };
    return (
        <>
            <Button
                type="primary"
                onClick={showModal}>
                View All
            </Button>
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3>Parking Permits</h3>}
                open={internalModalOpen}
                onCancel={handleCancel}
                okButtonProps={{ hidden: true, disabled: true }}
                cancelButtonProps={{ hidden: true, disabled: true }}>
                <div className="space-y-3">
                    {props.permits.length === 0 ? (
                        <p>No parking permits found.</p>
                    ) : (
                        props.permits.map((permit) => (
                            <div
                                key={permit.id}
                                className="border p-3 rounded-lg shadow-sm bg-gray-50">
                                <p>
                                    <strong>ID:</strong> {permit.id}
                                </p>
                                <p>
                                    <strong>Created By:</strong> {permit.created_by}
                                </p>
                                <p>
                                    <strong>Expires At:</strong> {new Date(permit.expires_at).toLocaleString()}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </Modal>
        </>
    );
}
