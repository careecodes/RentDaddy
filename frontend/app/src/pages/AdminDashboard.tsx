/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from "react";
import { CalendarOutlined, InboxOutlined, ToolOutlined, WarningOutlined } from "@ant-design/icons";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import { CardComponent } from "../components/reusableComponents/CardComponent";
import TableComponent from "../components/reusableComponents/TableComponent";
import { Tag, Spin } from "antd";
import type { ColumnsType } from "antd/es/table/interface";
import ModalComponent from "../components/ModalComponent";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import { Link } from "react-router";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";

const DOMAIN_URL = import.meta.env.VITE_DOMAIN_URL;
const PORT = import.meta.env.VITE_PORT;
const API_URL = `${DOMAIN_URL}:${PORT}`.replace(/\/$/, "");

interface Locker {
    id: number;
    user_id: string | null;
    access_code: string | null;
    in_use: boolean;
}

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

    const [selectedUserId, setSelectedUserId] = useState<string>();
    const [accessCode, setAccessCode] = useState<string>("");

    // Query for fetching tenants
    const { data: tenants, isLoading: isLoadingTenants } = useQuery<Tenant[]>({
        queryKey: ["tenants"],
        queryFn: async () => {
            const token = await getToken();
            if (!token) {
                throw new Error("No authentication token available");
            }

            const res = await fetch(`${API_URL}/admin/tenants`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch tenants: ${res.status}`);
            }

            const data = await res.json();
            console.log("Response data for tenants query:", data);
            return data;
        },
    });

    // Query for fetching work orders
    const { data: workOrders, isLoading: isLoadingWorkOrders } = useQuery({
        queryKey: ["workOrders"],
        queryFn: async () => {
            const token = await getToken();
            if (!token) {
                throw new Error("No authentication token available");
            }
            console.log("Fetching work orders...");
            console.log("API URL:", `${API_URL}/admin/work_orders`);

            const res = await fetch(`${API_URL}/admin/work_orders`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log("Response status:", res.status);

            if (!res.ok) {
                throw new Error(`Failed to fetch work orders: ${res.status}`);
            }

            const data = await res.json();
            console.log("Response data:", data);
            return data;
        },
    });

    console.log("Query state:", { isLoading: isLoadingWorkOrders, data: workOrders });

    // Query for fetching complaints
    const { data: complaints, isLoading: isLoadingComplaints } = useQuery({
        queryKey: ["complaints"],
        queryFn: async () => {
            const token = await getToken();
            if (!token) {
                throw new Error("No authentication token available");
            }
            console.log("Fetching complaints...");
            console.log("API URL:", `${API_URL}/admin/complaints`);
            const res = await fetch(`${API_URL}/admin/complaints`, {
                method: "GET",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch complaints: ${res.status}`);
            }

            const data = await res.json();
            return data;
        },
    });

    console.log("Query state for complaints:", { isLoading: isLoadingComplaints, data: complaints });

    // Query for fetching lockers
    const {
        data: lockers,
        isLoading: isLoadingLockers,
        isError: isErrorLockers,
    } = useQuery({
        queryKey: ["lockers"],
        queryFn: async () => {
            console.log("Fetching lockers...");
            try {
                const token = await getToken();
                if (!token) {
                    throw new Error("No authentication token available");
                }

                const res = await fetch(`${API_URL}/admin/lockers`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                console.log("Locker response status:", res.status);

                if (!res.ok) {
                    throw new Error(`Failed to fetch lockers: ${res.status}`);
                }

                const data = await res.json();
                console.log("Locker response data:", data);
                return data as Locker[];
            } catch (error) {
                console.error("Error fetching lockers:", error);
                throw error;
            }
        },
        retry: 3, // Retry failed requests 3 times
        staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    });

    console.log("Lockers query state:", { isLoadingLockers, isErrorLockers, lockers });

    const { data: numberOfLockersInUse } = useQuery({
        queryKey: ["numberOfLockersInUse"],
        queryFn: async () => {
            const token = await getToken();
            if (!token) {
                throw new Error("No authentication token available");
            }

            const res = await fetch(`${API_URL}/admin/lockers/in-use/count`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch lockers in use count: ${res.status}`);
            }
            const data = await res.json();
            return data.lockers_in_use;
        },
    });

    // Mutation for updating locker
    const updateLockerMutation = useMutation({
        mutationFn: async ({ lockerId, updates }: { lockerId: number; updates: { user_id?: string; in_use?: boolean; access_code?: string } }) => {
            console.log("Original updates:", updates);
            console.log("lockerId:", lockerId);
            console.log("API URL:", `${API_URL}/admin/lockers/${lockerId}`);

            const token = await getToken();
            if (!token) {
                throw new Error("No authentication token available");
            }

            const response = await fetch(`${API_URL}/admin/lockers/${lockerId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response:", errorText);
                throw new Error(`Failed to update locker: ${errorText}`);
            }

            const data = await response.json();
            return data;
        },
        onSuccess: () => {
            // Invalidate and refetch queries
            queryClient.invalidateQueries({ queryKey: ["lockers"] });
            queryClient.invalidateQueries({ queryKey: ["numberOfLockersInUse"] });
            console.log("Locker updated successfully");
        },
        onError: (error) => {
            console.error("Error updating locker:", error);
        },
    });

    // Update the handleAddPackage function
    const handleAddPackage = async () => {
        try {
            console.log("handleAddPackage called");
            console.log("selectedUserId:", selectedUserId);
            console.log("accessCode:", accessCode);
            console.log("lockers:", lockers);

            if (isLoadingLockers) {
                console.error("Please wait while lockers are being loaded...");
                return;
            }

            if (isErrorLockers) {
                console.error("Failed to load lockers. Please try again.");
                return;
            }

            if (!lockers || lockers.length === 0) {
                console.error("No lockers available in the system");
                return;
            }

            if (!selectedUserId) {
                console.error("Please select a tenant");
                return;
            }

            if (!accessCode) {
                console.error("Please enter an access code");
                return;
            }

            const availableLocker = lockers.find((locker) => !locker.in_use);
            if (!availableLocker) {
                console.error("No available lockers");
                return;
            }

            console.log("Available locker:", availableLocker);
            console.log("Starting update locker mutation");

            await updateLockerMutation.mutateAsync({
                lockerId: availableLocker.id,
                updates: {
                    user_id: selectedUserId,
                    access_code: accessCode,
                    in_use: true,
                },
            });

            // Reset form values after successful addition
            setSelectedUserId(undefined);
            setAccessCode("");
        } catch (error) {
            console.error("Error adding package:", error);
            throw error;
        }
    };

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
            render: (lease_start: string) => (lease_start ? new Date(lease_start).toLocaleDateString() : "N/A"),
        },
        {
            title: "Lease End",
            dataIndex: "lease_end",
            render: (lease_end: string) => (lease_end ? new Date(lease_end).toLocaleDateString() : "N/A"),
        },
        {
            title: "Unit",
            dataIndex: "unit_number",
            render: (unit: number) => unit || "N/A",
        },
        {
            title: "Status",
            dataIndex: "status",
            render: (status: string) => <Tag color={status.toLowerCase() === "active" ? "green" : "red"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Tag>,
        },
    ];

    // Add key to each tenant
    const tenantsWithKeys =
        tenants?.map((tenant: Tenant) => ({
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
        workOrders?.map((order: WorkOrder) => ({
            ...order,
            key: `wo-${order.id}`,
            type: "work_order" as const,
        })) ?? [];

    const complaintsWithKeys =
        complaints?.map((complaint: Complaint) => ({
            ...complaint,
            key: `c-${complaint.id}`,
            type: "complaint" as const,
        })) ?? [];

    // Combine and sort both types by creation date
    const combinedItems = [...workOrdersWithKeys, ...complaintsWithKeys].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const WORK_ORDERS_COUNT = workOrders?.length ?? 0;
    const COMPLAINTS_COUNT = complaints?.length ?? 0;

    return (
        <div className="container">
            <PageTitleComponent title="Admin Dashboard" />
            <AlertComponent
                title="Welcome to the Admin Dashboard"
                description="This is the Admin Dashboard. Here's a demo alert component."
                type="success"
            />

            {/* Dashboard Statistics Cards */}
            <div className="d-flex gap-4 my-5 w-100 justify-content-between">
                <CardComponent
                    title="Work Orders"
                    value={isLoadingWorkOrders ? <Spin size="small" /> : WORK_ORDERS_COUNT}
                    description="Active maintenance requests"
                    hoverable={true}
                    icon={<ToolOutlined style={{ fontSize: "24px", color: "#1890ff", marginBottom: "16px" }} />}
                    button={
                        <Link to="/admin/admin-view-and-edit-work-orders-and-complaints">
                            <ButtonComponent
                                title="View All"
                                type="primary"
                            />
                        </Link>
                    }
                />
                <CardComponent
                    title="Complaints"
                    value={isLoadingComplaints ? <Spin size="small" /> : COMPLAINTS_COUNT}
                    description="Pending tenant issues"
                    hoverable={true}
                    icon={<WarningOutlined style={{ fontSize: "24px", color: "#faad14", marginBottom: "16px" }} />}
                    button={
                        <Link to="/admin/admin-view-and-edit-work-orders-and-complaints">
                            <ButtonComponent
                                title="View All"
                                type="primary"
                            />
                        </Link>
                    }
                />
                <CardComponent
                    title="Packages"
                    value={isLoadingLockers ? <Spin size="small" /> : numberOfLockersInUse}
                    description="Awaiting delivery"
                    hoverable={true}
                    icon={<InboxOutlined style={{ fontSize: "24px", color: "#52c41a", marginBottom: "16px" }} />}
                    button={
                        <div className="d-flex gap-2">
                            <Link to="/admin/admin-view-and-edit-smart-lockers">
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
                                tenant={tenants ?? []}
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
                                    await handleAddPackage();
                                }}
                            />
                        </div>
                    }
                />
                <CardComponent
                    title="Events"
                    value={10}
                    description="Scheduled this month"
                    hoverable={true}
                    icon={<CalendarOutlined style={{ fontSize: "24px", color: "#722ed1", marginBottom: "16px" }} />}
                    button={
                        <ButtonComponent
                            title="View All"
                            type="primary"
                        />
                    }
                />
            </div>

            {/* Work Orders / Complaints Table */}
            <div className="d-flex gap-4 my-4 w-100">
                <div className="d-flex flex-column w-50">
                    <div className="d-flex flex-column justify-content-between align-items-center mb-1">
                        <h2 className="mb-1">Complaints</h2>
                        <Link to="/admin/admin-view-and-edit-work-orders-and-complaints">
                            <p>(View All)</p>
                        </Link>
                    </div>
                    <TableComponent
                        columns={columnsComplaints}
                        dataSource={combinedItems.filter((item) => item.type === "complaint").slice(0, 5)}
                        loading={isLoadingComplaints}
                        onChange={() => {}}
                        pagination={false}
                    />
                </div>
                <div className="d-flex flex-column w-50">
                    <div className="d-flex flex-column justify-content-between align-items-center mb-1">
                        <h2 className="mb-1">Work Orders</h2>
                        <Link to="/admin/admin-view-and-edit-work-orders-and-complaints">
                            <p>(View All)</p>
                        </Link>
                    </div>
                    <TableComponent
                        columns={columnsWorkOrders}
                        dataSource={combinedItems.filter((item) => item.type === "work_order").slice(0, 5)}
                        loading={isLoadingWorkOrders}
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
                    loading={isLoadingTenants}
                    pagination={false}
                />
            </div>
        </div>
    );
};

export default AdminDashboard;
