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
        dataIndex: "apartmentNumber",
        key: "apartmentNumber",
        ...getWorkOrderColumnSearchProps("apartmentNumber", "Unit"),
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

const complaintsDataRaw: ComplaintsData[] = [
    {
        key: 1,
        complaintNumber: 20001,
        createdBy: 4,
        category: "noise",
        title: "Loud Music at Night",
        description: "Neighbor plays loud music past midnight.",
        unitNumber: "A312",
        status: "open",
        createdAt: new Date("2025-03-10T22:15:00"),
        updatedAt: new Date("2025-03-11T08:00:00"),
    },
    {
        key: 2,
        complaintNumber: 20002,
        createdBy: 7,
        category: "parking",
        title: "Unauthorized Vehicle in My Spot",
        description: "A car is parked in my designated space.",
        unitNumber: "B210",
        status: "in_progress",
        createdAt: new Date("2025-02-28T18:30:00"),
        updatedAt: new Date("2025-03-01T09:45:00"),
    },
    {
        key: 3,
        complaintNumber: 20003,
        createdBy: 2,
        category: "maintenance",
        title: "Leaking Roof",
        description: "Water leaking from ceiling during rainstorms.",
        unitNumber: "C405",
        status: "resolved",
        createdAt: new Date("2025-02-20T14:00:00"),
        updatedAt: new Date("2025-02-22T16:00:00"),
    },
    {
        key: 4,
        complaintNumber: 20004,
        createdBy: 10,
        category: "security",
        title: "Suspicious Person Near Entrance",
        description: "Unfamiliar person lingering around entrance at night.",
        unitNumber: "E102",
        status: "closed",
        createdAt: new Date("2025-03-02T20:00:00"),
        updatedAt: new Date("2025-03-03T12:00:00"),
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
    const [complaintsData, setComplaintsData] = useState<ComplaintsData[]>(complaintsDataRaw);
    const [selectedItem, setSelectedItem] = useState<WorkOrderData | ComplaintsData | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [itemType, setItemType] = useState<"workOrder" | "complaint">("workOrder");
    const [currentStatus, setCurrentStatus] = useState<string>("");

    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    // Update your query to include the auth token
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

            return data.map((item: any) => ({
                key: item.id,
                workOrderNumber: item.order_number,
                creatingBy: item.created_by,
                category: item.category,
                title: item.title,
                description: item.description,
                apartmentNumber: item.unit_number,
                status: item.status,
                createdAt: new Date(item.created_at),
                updatedAt: new Date(item.updated_at),
            })) as WorkOrderData[];
        },
    });

    const handleStatusChange = (newStatus: string) => {
        setCurrentStatus(newStatus);
    };

    const handleConfirm = async () => {
        if (selectedItem && currentStatus) {
            try {
                if (itemType === "workOrder") {
                    const token = await getToken();
                    // Make API call to update work order
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
                    // Handle complaint update (keep existing dummy data logic for now)
                    const updatedComplaints = complaintsData.map((item) => {
                        if (item.key === selectedItem.key) {
                            return {
                                ...item,
                                status: currentStatus,
                                updatedAt: new Date(),
                            } as ComplaintsData;
                        }
                        return item;
                    });
                    setComplaintsData(updatedComplaints);
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

    const getUnitNumber = (item: WorkOrderData | ComplaintsData): string => {
        // I HAVE NO CLUE WHAT THE NAMING CONVENTION IS NOW SO ADDING THIS SINCE I'VE SEEN BOTH
        // FOR WORK ORDER AND COMPLAINTS
        if ("apartmentNumber" in item) {
            return item.apartmentNumber;
        }
        return item.unitNumber;
    };

    complaintsDataRaw.sort((a, b) => {
        const statusPriority = { open: 1, in_progress: 2, resolved: 3, closed: 4 };
        const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
        if (priorityDiff !== 0) {
            return priorityDiff;
        }

        if (!(a.status in ["resolved", "closed"]) && !(b.status in ["resolved", "closed"])) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

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
    if (isWorkOrdersLoading) {
        alerts.push("Loading work orders...");
    } else if (workOrdersError) {
        alerts.push("Error loading work orders");
    } else if (workOrderData) {
        if (overdueServiceCount > 0) {
            alerts.push(`${overdueServiceCount} services open for >${hoursUntilOverdue} hours.`);
        } else if (recentlyCreatedServiceCount > 0) {
            alerts.push(`${recentlyCreatedServiceCount} services created in past ${hoursSinceRecentlyCreated} hours.`);
        } else if (recentlyCompletedServiceCount > 0) {
            alerts.push(`${recentlyCompletedServiceCount} services completed in past ${hoursSinceRecentlyCompleted} hours.`);
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
                <strong>Unit Number:</strong> {getUnitNumber(selectedItem)}
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
