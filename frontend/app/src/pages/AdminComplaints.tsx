import "../styles/styles.scss";

import { Modal, Tag } from "antd";
import dayjs from "dayjs";
import { Input, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import TableComponent from "../components/reusableComponents/TableComponent";
import type { ColumnsType, ColumnType } from "antd/es/table/interface";
import { ComplaintsData, ComplaintStatus } from "../types/types";
import type { TablePaginationConfig } from "antd";
import { useState } from "react";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { SERVER_API_URL } from "../utils/apiConfig";

const absoluteServerUrl = SERVER_API_URL;

export default function AdminComplaints() {
    const [selectedItem, setSelectedItem] = useState<ComplaintsData | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<string>("");

    const { getToken } = useAuth();
    const queryClient = useQueryClient();
    const { data: complaintsData, isLoading: isComplaintsLoading } = useQuery({
        queryKey: ["complaints"],
        queryFn: async () => {
            const token = await getToken();
            const response = await fetch(`${absoluteServerUrl}/admin/complaints`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return (await response.json()) as ComplaintsData[];
        },
    });

    const { mutate: updateComplaintStatus, isPending } = useMutation({
        mutationFn: async ({ selectedItem, status }: { selectedItem: ComplaintsData; status: ComplaintStatus }) => {
            const token = await getToken();
            if (!token) {
                throw new Error("[ADMIN_COMPLAINT] Error unauthorized");
            }

            if (!selectedItem?.id) {
                throw new Error("[ADMIN_COMPLAINT] Error no item selected");
            }

            const response = await fetch(`${absoluteServerUrl}/admin/complaints/${selectedItem.id}/status`, {
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
                throw new Error(`Failed to update complaint ${selectedItem.id}`);
            }
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ["complaints"] });
            setIsModalVisible(false);
            return toast.success(`Successfully updated ${vars.selectedItem.id}`);
        },

        onError: () => {
            return toast.error("Oops", { description: "Something happned please try again another time." });
        },
    });

    const handleStatusChange = (newStatus: string) => {
        setCurrentStatus(newStatus);
    };

    const handleRowClick = (record: ComplaintsData) => {
        setSelectedItem(record);
        setCurrentStatus(record.status);
        setIsModalVisible(true);
    };

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
    const complaintsColumns: ColumnsType<ComplaintsData> = [
        {
            title: "Complaint ID",
            dataIndex: "id",
            key: "id",
            ...getComplaintColumnSearchProps("id", "Complaint ID"),
            sorter: (a, b) => a.id - b.id,
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
    return (
        <div className="container">
            <PageTitleComponent title="Complaints" />
            <div className="mb-5">
                <TableComponent<ComplaintsData>
                    columns={complaintsColumns}
                    dataSource={complaintsData}
                    style=".lease-table-container"
                    loading={isComplaintsLoading}
                    pagination={paginationConfig}
                    onChange={(pagination, filters, sorter, extra) => {
                        console.log("Table changed:", pagination, filters, sorter, extra);
                    }}
                    onRow={(record: ComplaintsData) => ({
                        onClick: () => handleRowClick(record),
                        style: {
                            cursor: "pointer",
                        },
                        className: "hoverable-row",
                    })}
                />
                <p className="text-muted mb-4 text-center">View all complaints in the system</p>
            </div>

            {selectedItem && (
                <Modal
                    title={<h3>Complaint {selectedItem.id}</h3>}
                    open={isModalVisible}
                    onOk={() => updateComplaintStatus({ selectedItem: selectedItem, status: currentStatus as ComplaintStatus })}
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
                        <div className="mb-4">
                            <strong>Unit Number:</strong> {selectedItem.unitNumber}
                        </div>
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
}
