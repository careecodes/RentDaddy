import "../styles/styles.scss";

import { Tag } from "antd";
import dayjs from "dayjs";
import { Input, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import ModalComponent from "../components/ModalComponent";
import TableComponent from "../components/reusableComponents/TableComponent";
import type { ColumnsType, ColumnType } from "antd/es/table/interface";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import { WorkOrderData, ComplaintsData } from "../types/types";
import type { TablePaginationConfig } from "antd";
import { useState } from "react";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import EmptyState from "../components/reusableComponents/EmptyState";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";

const DOMAIN_URL = import.meta.env.VITE_DOMAIN_URL || import.meta.env.DOMAIN_URL || "http://localhost";
const PORT = import.meta.env.VITE_PORT || import.meta.env.PORT || "8080";
const API_URL = `${DOMAIN_URL}:${PORT}`.replace(/\/$/, "");

const getWorkOrderColumnSearchProps = (dataIndex: keyof WorkOrderData, title: string): ColumnType<WorkOrderData> => ({
    filterDropdown: (filterDropdownProps) => (
        <div style={{ padding: 8 }}>
            <Input
                placeholder={`Search ${title}`}
                value={filterDropdownProps.selectedKeys[0]}
                onChange={(e) => filterDropdownProps.setSelectedKeys(e.target.value ? [e.target.value] : [])}
                onPressEnter={() => filterDropdownProps.confirm()}
            />
        </div>
    ),
    filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />,
    onFilter: (value, record) => {
        const val = record[dataIndex];
        return (
            val
                ?.toString()
                .toLowerCase()
                .includes((value as string).toLowerCase()) ?? false
        );
    },
});

const getComplaintColumnSearchProps = (dataIndex: keyof ComplaintsData, title: string): ColumnType<ComplaintsData> => ({
    filterDropdown: (filterDropdownProps) => (
        <div style={{ padding: 8 }}>
            <Input
                placeholder={`Search ${title}`}
                value={filterDropdownProps.selectedKeys[0]}
                onChange={(e) => filterDropdownProps.setSelectedKeys(e.target.value ? [e.target.value] : [])}
                onPressEnter={() => filterDropdownProps.confirm()}
            />
        </div>
    ),
    filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />,
    onFilter: (value, record) => {
        const val = record[dataIndex];
        return (
            val
                ?.toString()
                .toLowerCase()
                .includes((value as string).toLowerCase()) ?? false
        );
    },
});

const shortenInput = (input: string, maxLength: number = 30) => {
    if (input.length > maxLength) {
        return input.substring(0, maxLength - 3) + "...";
    } else {
        return input;
    }
};

const workOrderColumns: ColumnsType<WorkOrderData> = [
    {
        title: "Work Order #",
        dataIndex: "workOrderNumber",
        key: "workOrderNumber",
        ...getWorkOrderColumnSearchProps("workOrderNumber", "Work Order #"),
        sorter: (a, b) => a.workOrderNumber - b.workOrderNumber,
    },
    {
        title: "Category",
        dataIndex: "category",
        key: "category",
        ...getWorkOrderColumnSearchProps("category", "Category"),
        render: (category) => {
            let color = "";
            let text = "";

            switch (category) {
                case "plumbing":
                    text = "Plumbing 🛀";
                    color = "blue";
                    break;
                case "electrical":
                    text = "Electrical ⚡";
                    color = "yellow";
                    break;
                case "carpentry":
                    text = "Carpentry 🪚";
                    color = "brown";
                    break;
                case "hvac":
                    text = "HVAC 🌡️";
                    color = "grey";
                    break;
                default:
                    text = "Other";
            }

            return <Tag color={color}>{text}</Tag>;
        },
        className: "text-center",
    },
    {
        title: "Title",
        dataIndex: "title",
        key: "title",
        sorter: (a, b) => a.title.localeCompare(b.title),
        ...getWorkOrderColumnSearchProps("title", "Inquiry"),
        render: (title: string) => shortenInput(title, 25),
    },
    {
        title: "Description",
        dataIndex: "description",
        key: "description",
        ...getWorkOrderColumnSearchProps("description", "Description"),
        render: (description: string) => shortenInput(description),
    },
    {
        title: "Unit",
        dataIndex: "unitNumber",
        key: "unitNumber",
        ...getWorkOrderColumnSearchProps("unitNumber", "Unit"),
    },
    {
        title: "Status",
        dataIndex: "status",
        key: "status",
        ...getWorkOrderColumnSearchProps("status", "Status"),
        render: (status: string) => {
            let color = "default";
            switch (status) {
                case "open":
                    color = "red";
                    break;
                case "in_progress":
                    color = "orange";
                    break;
                case "resolved":
                    color = "blue";
                    break;
                case "closed":
                    color = "green";
                    break;
            }
            return <Tag color={color}>{status.replace("_", " ").toUpperCase()}</Tag>;
        },
        className: "text-center",
    },
    {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        ...getWorkOrderColumnSearchProps("createdAt", "Created"),
        sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
        render: (date) => dayjs(date).format("MMM D, YYYY h:mm A"),
    },
    {
        title: "Updated",
        dataIndex: "updatedAt",
        key: "updatedAt",
        ...getWorkOrderColumnSearchProps("updatedAt", "Updated"),
        sorter: (a, b) => dayjs(a.updatedAt).unix() - dayjs(b.updatedAt).unix(),
        render: (date) => dayjs(date).format("MMM D, YYYY h:mm A"),
    },
];

const complaintsColumns: ColumnsType<ComplaintsData> = [
    {
        title: "Complaint #",
        dataIndex: "complaintNumber",
        key: "complaintNumber",
        ...getComplaintColumnSearchProps("complaintNumber", "Complaint #"),
    },
    {
        title: "Category",
        dataIndex: "category",
        key: "category",
        sorter: (a, b) => a.category.localeCompare(b.category),
        filters: [
            { text: "Maintenance", value: "maintenance" },
            { text: "Noise", value: "noise" },
            { text: "Security", value: "security" },
            { text: "Parking", value: "parking" },
            { text: "Neighbor", value: "neighbor" },
            { text: "Trash", value: "trash" },
            { text: "Internet", value: "internet" },
            { text: "Lease", value: "lease" },
            { text: "Natural Disaster", value: "natural_disaster" },
            { text: "Other", value: "other" },
        ],
        onFilter: (value, record) => record.category === (value as ComplaintsData["category"]),
        render: (category) => {
            let color = "";
            let text = "";

            switch (category) {
                case "maintenance":
                    text = "Maintenance 🔧";
                    color = "blue";
                    break;
                case "noise":
                    text = "Noise 🔊";
                    color = "orange";
                    break;
                case "security":
                    text = "Security 🔒";
                    color = "red";
                    break;
                case "parking":
                    text = "Parking 🚗";
                    color = "purple";
                    break;
                case "neighbor":
                    text = "Neighbor 🏘️";
                    color = "green";
                    break;
                case "trash":
                    text = "Trash 🗑️";
                    color = "brown";
                    break;
                case "internet":
                    text = "Internet 🌐";
                    color = "cyan";
                    break;
                case "lease":
                    text = "Lease 📝";
                    color = "gold";
                    break;
                case "natural_disaster":
                    text = "Disaster 🌪️";
                    color = "grey";
                    break;
                default:
                    text = "Other";
                    color = "default";
            }

            return <Tag color={color}>{text}</Tag>;
        },
        className: "text-center",
    },
    {
        title: "Title",
        dataIndex: "title",
        key: "title",
        ...getComplaintColumnSearchProps("title", "Title"),
        render: (title: string) => shortenInput(title, 25),
    },
    {
        title: "Description",
        dataIndex: "description",
        key: "description",
        ...getComplaintColumnSearchProps("description", "Description"),
        render: (description: string) => shortenInput(description),
    },
    {
        title: "Unit",
        dataIndex: "unitNumber",
        key: "unitNumber",
        ...getComplaintColumnSearchProps("unitNumber", "Unit"),
    },
    {
        title: "Status",
        dataIndex: "status",
        key: "status",
        ...getComplaintColumnSearchProps("status", "Status"),
        render: (status: string) => {
            let color = "default";
            switch (status) {
                case "in_progress":
                    color = "blue";
                    break;
                case "resolved":
                    color = "green";
                    break;
                case "closed":
                    color = "gray";
                    break;
                case "open":
                    color = "red";
                    break;
            }
            return <Tag color={color}>{status.replace("_", " ").toUpperCase()}</Tag>;
        },
        className: "text-center",
    },
    {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
        render: (date) => dayjs(date).format("MMM D, YYYY h:mm A"),
    },
    {
        title: "Updated",
        dataIndex: "updatedAt",
        key: "updatedAt",
        sorter: (a, b) => dayjs(a.updatedAt).unix() - dayjs(b.updatedAt).unix(),
        render: (date) => dayjs(date).format("MMM D, YYYY h:mm A"),
    },
];

const paginationConfig: TablePaginationConfig = {
    pageSize: 5,
    showSizeChanger: false,
};

const AdminWorkOrder = () => {
    // const [workOrderData, setWorkOrderData] = useState<WorkOrderData[]>(workOrderDataRaw);
    // const [complaintsData, setComplaintsData] = useState<ComplaintsData[]>(complaintsDataRaw);
    const [selectedItem, setSelectedItem] = useState<WorkOrderData | ComplaintsData | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [itemType, setItemType] = useState<"workOrder" | "complaint">("workOrder");
    const [currentStatus, setCurrentStatus] = useState<string>("");

    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    const { data: workOrderData, isLoading: isWorkOrdersLoading, error: workOrdersError } = useQuery({
        queryKey: ['workOrders'],
        queryFn: async () => {
            const token = await getToken();
            const response = await fetch(`${API_URL}/admin/work_orders`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch work orders');
            }
            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error("No work orders");
            }

            if (!data || data.length === 0) {
                return [];
            }

            return (data || []).map((item: any) => ({
                key: item.id,
                workOrderNumber: item.order_number,
                creatingBy: item.created_by,
                category: item.category,
                title: item.title,
                description: item.description,
                unitNumber: String(item.unit_number),
                status: item.status,
                createdAt: new Date(item.created_at),
                updatedAt: new Date(item.updated_at),
            })) as WorkOrderData[];
        },
    });

    const { data: complaintsData, isLoading: isComplaintsLoading, error: complaintsError } = useQuery({
        queryKey: ["complaints"],
        queryFn: async () => {
            const token = await getToken();
            const response = await fetch(`${API_URL}/admin/complaints`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error('No complaints');
            }

            if (!data || data.length === 0) {
                return [];
            }

            return (data || []).map((item: any) => ({
                key: item.id,
                complaintNumber: item.complaint_number,
                createdBy: item.created_by,
                category: item.category,
                title: item.title,
                description: item.description,
                unitNumber: String(item.unit_number),
                status: item.status,
                createdAt: new Date(item.created_at),
                updatedAt: new Date(item.updated_at),
            })) as ComplaintsData[];
        },
    });

    const handleStatusChange = (newStatus: string) => {
        setCurrentStatus(newStatus);
    };

    const handleConfirm = async () => {
        if (selectedItem && currentStatus) {
            try {
                const token = await getToken();

                if (itemType === "workOrder") {
                    // Work order update logic (existing)
                    const response = await fetch(`${API_URL}/admin/work_orders/${selectedItem.key}/status`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            "Authorization": `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            status: currentStatus,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update work order');
                    }

                    queryClient.setQueryData(['workOrders'], (oldData: WorkOrderData[] | undefined) => {
                        if (!oldData) return oldData;
                        return oldData.map(item =>
                            item.key === selectedItem.key
                                ? { ...item, status: currentStatus, updatedAt: new Date() }
                                : item
                        );
                    });
                } else {
                    const response = await fetch(`${API_URL}/admin/complaints/${selectedItem.key}/status`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            status: currentStatus,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update complaint');
                    }

                    queryClient.setQueryData(['complaints'], (oldData: ComplaintsData[] | undefined) => {
                        if (!oldData) return oldData;
                        return oldData.map(item =>
                            item.key === selectedItem.key
                                ? { ...item, status: currentStatus, updatedAt: new Date() }
                                : item
                        );
                    });
                }
                setIsModalVisible(false);
            } catch (error) {
                console.error("Error updating status:", error);
            }
        }
    };

    const handleRowClick = (record: WorkOrderData | ComplaintsData, type: "workOrder" | "complaint") => {
        setSelectedItem(record);
        setItemType(type);
        setCurrentStatus(record.status);
        setIsModalVisible(true);
    };

    const hoursUntilOverdue: number = 48;
    const overdueServiceCount: number = workOrderData
        ? workOrderData.filter(({ createdAt, status }) => {
            const hoursSinceCreation = dayjs().diff(dayjs(createdAt), "hour");
            return status === "open" && hoursSinceCreation >= hoursUntilOverdue;
        }).length
        : 0;

    const hoursSinceRecentlyCreated: number = 24;
    const recentlyCreatedServiceCount: number = workOrderData
        ? workOrderData.filter(({ createdAt }) => {
            const hoursSinceCreation = dayjs().diff(dayjs(createdAt), "hour");
            return hoursSinceCreation <= hoursSinceRecentlyCreated;
        }).length
        : 0;

    const hoursSinceRecentlyCompleted: number = 24;
    const recentlyCompletedServiceCount: number = workOrderData
        ? workOrderData.filter(({ updatedAt, status }) => {
            const hoursSinceUpdate = dayjs().diff(dayjs(updatedAt), "hour");
            return status === "completed" && hoursSinceUpdate <= hoursSinceRecentlyCompleted;
        }).length
        : 0;

    let alerts: string[] = [];
    if (isWorkOrdersLoading || isComplaintsLoading) {
        alerts.push("Loading data...");
    } else if (workOrdersError || complaintsError) {
        alerts.push("Error loading data");
    } else {
        if (workOrderData?.length === 0) {
            alerts.push("No work orders found");
        }
        if (complaintsData?.length === 0) {
            alerts.push("No complaints found");
        }

        if (workOrderData && workOrderData.length > 0) {
            if (overdueServiceCount > 0) {
                alerts.push(`${overdueServiceCount} services open for >${hoursUntilOverdue} hours.`);
            } else if (recentlyCreatedServiceCount > 0) {
                alerts.push(`${recentlyCreatedServiceCount} services created recently.`);
            }
        }
    }

    const alertDescription: string = alerts.join(" ") ?? "";

    const modalContent = selectedItem && (
        <div>
            <div className="mb-4">
                <strong>Title:</strong> {selectedItem.title}
            </div>
            <div className="mb-4">
                <strong>Description:</strong> {selectedItem.description}
            </div>
            <div className="mb-4">
                <strong>Unit Number:</strong> {selectedItem.unitNumber}
            </div>
            <div>
                <strong>Status:</strong>
                <Select
                    value={currentStatus}
                    style={{ width: 200, marginLeft: 10 }}
                    onChange={handleStatusChange}>
                    {itemType === "workOrder" ? (
                        <>
                            <Select.Option value="open">Open</Select.Option>
                            <Select.Option value="in_progress">In Progress</Select.Option>
                            <Select.Option value="resolved">Resolved</Select.Option>
                            <Select.Option value="closed">Closed</Select.Option>
                        </>
                    ) : (
                        <>
                            <Select.Option value="open">Open</Select.Option>
                            <Select.Option value="in_progress">In Progress</Select.Option>
                            <Select.Option value="resolved">Resolved</Select.Option>
                            <Select.Option value="closed">Closed</Select.Option>
                        </>
                    )}
                </Select>
            </div>
        </div>
    );

    return (
        <div className="container">
            {/* PageTitleComponent header */}
            <PageTitleComponent title="Work Order & Complaints" />

            {/* Alerts headers */}
            <div className="w-100 justify-content-between mb-4 left-text text-start">{alertDescription ? <AlertComponent description={alertDescription} /> : null}</div>

            {/* Work Order Table */}
            <div className="mb-5">
                <h4 className="mb-3">Work Orders</h4>
                {isWorkOrdersLoading ? (
                    <div>Loading work orders...</div>
                ) : workOrdersError ? (
                    <div>Error loading work orders: {workOrdersError.message}</div>
                ) : workOrderData?.length === 0 ? (
                    <EmptyState description="No work orders found" />
                ) : (
                    <TableComponent<WorkOrderData>
                        columns={workOrderColumns}
                        dataSource={workOrderData || []}
                        style=".lease-table-container"
                        pagination={paginationConfig}
                        onChange={(pagination, filters, sorter, extra) => {
                            console.log("Table changed:", pagination, filters, sorter, extra);
                        }}
                        onRow={(record: WorkOrderData) => ({
                            onClick: () => handleRowClick(record, "workOrder"),
                            style: {
                                cursor: "pointer",
                            },
                            className: "hoverable-row",
                        })}
                    />
                )}
            </div>

            {/* Complaints Table */}
            <div className="mb-5">
                <h4 className="mb-3">Complaints</h4>
                {isComplaintsLoading ? (
                    <div>Loading complaints...</div>
                ) : complaintsError ? (
                    <div>Error loading complaints: {complaintsError.message}</div>
                ) : complaintsData?.length === 0 ? (
                    <EmptyState description="No complaints found" />
                ) : (
                    <TableComponent<ComplaintsData>
                        columns={complaintsColumns}
                        dataSource={complaintsData}
                        style=".lease-table-container"
                        pagination={paginationConfig}
                        onChange={(pagination, filters, sorter, extra) => {
                            console.log("Table changed:", pagination, filters, sorter, extra);
                        }}
                        onRow={(record: ComplaintsData) => ({
                            onClick: () => handleRowClick(record, "complaint"),
                            style: {
                                cursor: "pointer",
                            },
                            className: "hoverable-row",
                        })}
                    />
                )}
            </div>

            {selectedItem && (
                <ModalComponent
                    buttonTitle=""
                    buttonType="default"
                    content={modalContent}
                    type="default"
                    handleOkay={handleConfirm}
                    modalTitle={`${itemType === "workOrder" ? "Work Order" : "Complaint"} Details`}
                    isModalOpen={isModalVisible}
                    onCancel={() => setIsModalVisible(false)}
                    apartmentBuildingSetEditBuildingState={() => { }}
                />
            )}
        </div>
    );
};

export default AdminWorkOrder;
