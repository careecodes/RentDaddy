import "../styles/styles.scss";

import { Modal, Tag } from "antd";
import dayjs from "dayjs";
import { Input, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import TableComponent from "../components/reusableComponents/TableComponent";
import type { ColumnsType, ColumnType } from "antd/es/table/interface";
import { WorkOrderData, WorkStatus } from "../types/types";
import type { TablePaginationConfig } from "antd";
import { useState } from "react";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { SERVER_API_URL } from "../utils/apiConfig";

const absoluteServerUrl = SERVER_API_URL;

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

const shortenInput = (input: string, maxLength: number = 30) => {
    if (input.length > maxLength) {
        return input.substring(0, maxLength - 3) + "...";
    } else {
        return input;
    }
};

const workOrderColumns: ColumnsType<WorkOrderData> = [
    {
        title: "Work Order ID",
        dataIndex: "id",
        key: "id",
        ...getWorkOrderColumnSearchProps("id", "Work Order ID"),
        sorter: (a, b) => a.id - b.id,
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

const paginationConfig: TablePaginationConfig = {
    pageSize: 5,
    showSizeChanger: false,
};

const AdminWorkOrder = () => {
    const [selectedItem, setSelectedItem] = useState<WorkOrderData | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<string>("");
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    const { data: workOrderData, isLoading: isWorkOrdersLoading } = useQuery({
        queryKey: ["workOrders"],
        queryFn: async () => {
            const token = await getToken();
            const response = await fetch(`${absoluteServerUrl}/admin/work_orders`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                throw new Error("Failed to fetch work orders");
            }
            return (await response.json()) as WorkOrderData[];
        },
    });

    const handleStatusChange = (newStatus: string) => {
        setCurrentStatus(newStatus);
    };

    const { mutate: updateWorkOrderStatus, isPending } = useMutation({
        mutationFn: async ({ selectedItem, status }: { selectedItem: WorkOrderData; status: WorkStatus }) => {
            const token = await getToken();
            if (!token) {
                throw new Error("[ADMIN_WORKORDER] Error unauthorized");
            }

            if (!selectedItem?.id) {
                throw new Error("[ADMIN_WORKORDER] Error no item selected");
            }

            const response = await fetch(`${absoluteServerUrl}/admin/work_orders/${selectedItem.id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status: status,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to update work order");
            }
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ["workOrders"] });
            setIsModalVisible(false);
            return toast.success(`Successfully updated ${vars.selectedItem.id}`);
        },

        onError: () => {
            return toast.error("Oops", { description: "Something happned please try again another time." });
        },
    });

    const handleRowClick = (record: WorkOrderData) => {
        setSelectedItem(record);
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

    const alerts: string[] = [];
    if (isWorkOrdersLoading) {
        alerts.push("Loading data...");
    } else {
        if (workOrderData?.length === 0) {
            alerts.push("No work orders found");
        }
        if (workOrderData && workOrderData.length > 0) {
            if (overdueServiceCount > 0) {
                alerts.push(`${overdueServiceCount} services open for >${hoursUntilOverdue} hours.`);
            } else if (recentlyCreatedServiceCount > 0) {
                alerts.push(`${recentlyCreatedServiceCount} services created recently.`);
            }
        }
    }

    return (
        <div className="container">
            {/* PageTitleComponent header */}
            <PageTitleComponent title="Work Orders" />
            {/* Work Order Table */}
            <div className="mb-5">
                <TableComponent<WorkOrderData>
                    columns={workOrderColumns}
                    dataSource={workOrderData || []}
                    style=".lease-table-container"
                    loading={isWorkOrdersLoading}
                    pagination={paginationConfig}
                    onChange={(pagination, filters, sorter, extra) => {
                        console.log("Table changed:", pagination, filters, sorter, extra);
                    }}
                    onRow={(record: WorkOrderData) => ({
                        onClick: () => handleRowClick(record),
                        style: {
                            cursor: "pointer",
                        },
                        className: "hoverable-row",
                    })}
                />
                <p className="text-muted mb-4 text-center">View all work orders in the system</p>
            </div>

            {selectedItem && (
                <Modal
                    title={<h3>Work Order</h3>}
                    open={isModalVisible}
                    onOk={() => updateWorkOrderStatus({ selectedItem: selectedItem, status: currentStatus as WorkStatus })}
                    onCancel={() => setIsModalVisible(false)}
                    okText={"Update"}
                    okButtonProps={{ disabled: isPending ? true : false }}
                    cancelButtonProps={{ disabled: isPending ? true : false }}>
                    <div>
                        <div className="mb-4">
                            <strong>Title:</strong> {selectedItem.title}
                        </div>
                        <div className="mb-4">
                            <strong>Description:</strong> {selectedItem.description}
                        </div>
                        {selectedItem.unitNumber ? (
                            <div className="mb-4">
                                <strong>Unit Number:</strong> {selectedItem.unitNumber}
                            </div>
                        ) : null}
                        <div>
                            <strong>Status:</strong>
                            <Select
                                value={currentStatus}
                                style={{ width: 200, marginLeft: 10 }}
                                onChange={handleStatusChange}>
                                {["open", "in_progress", "resolved", "closed"].map((s) => (
                                    <Select.Option value={s}>{s}</Select.Option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AdminWorkOrder;
