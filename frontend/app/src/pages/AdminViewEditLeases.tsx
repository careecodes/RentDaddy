import { useState, useEffect } from "react";
import "../styles/styles.scss";
import { Space, Spin } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import axios from "axios";
import TableComponent from "../components/reusableComponents/TableComponent.tsx";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import { LeaseData } from "../types/types.ts";
import { LeaseSendModalComponent } from "../components/LeaseSendModalComponent.tsx";
import { LeaseAddModalComponent } from "../components/LeaseAddModalComponent.tsx"
import { LeaseRenewModalComponent } from "../components/LeaseRenewModalComponent.tsx"
import { DownOutlined, SearchOutlined } from "@ant-design/icons";
import { Dropdown, Input, message } from "antd"; // Import Input from antd
import type { ColumnType } from "antd/es/table";

const API_URL = `${import.meta.env.VITE_DOMAIN_URL}:${import.meta.env.VITE_PORT}`.replace(/\/$/, "");

// Default status filters in case dynamic generation fails
const DEFAULT_STATUS_FILTERS = [
    { text: "Active", value: "active" },
    { text: "Expires Soon", value: "expires_soon" },
    { text: "Expired", value: "expired" },
    { text: "Draft", value: "draft" },
    { text: "Terminated", value: "terminated" },
    { text: "Pending Approval", value: "pending_approval" }
];

export default function AdminViewEditLeases() {
    const [leases, setLeases] = useState<LeaseData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLease, setSelectedLease] = useState<LeaseData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddLeaseModalOpen, setIsAddLeaseModalOpen] = useState(false);
    const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
    const [selectedRenewLease, setSelectedRenewLease] = useState<LeaseData | null>(null);
    // Add state for status filters
    const [statusFilters, setStatusFilters] = useState<{ text: string; value: string }[]>(DEFAULT_STATUS_FILTERS);

    // 1. POPULATE TABLE
    // Fetch lease data from backend
    useEffect(() => {
        const fetchLeases = async () => {
            try {
                setLoading(true);

                // Fetch lease data
                const leaseResponse = await axios.get(`${API_URL}/admin/tenants/leases/`);

                // Generate status filters dynamically from the lease data
                if (leaseResponse.data && Array.isArray(leaseResponse.data)) {
                    try {
                        // Extract unique status values from the lease data
                        const uniqueStatuses = [...new Set(leaseResponse.data.map(lease => lease.status))];

                        // Format the status values for display
                        const formattedFilters = uniqueStatuses
                            .filter(status => status) // Filter out any null/undefined values
                            .map(status => {
                                // Parse the status string
                                const text = String(status)
                                    .split('_')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ');

                                return { text, value: status };
                            });

                        // Sort filters alphabetically for better UX
                        formattedFilters.sort((a, b) => a.text.localeCompare(b.text));

                        setStatusFilters(formattedFilters);
                    } catch (error) {
                        console.error("Error generating status filters:", error);
                        // Default filters will be used from initial state
                    }
                }

                setLeases(leaseResponse.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching leases:", err);
                setError("Failed to fetch leases. Please try again.");
                setLoading(false);
            }
        };

        fetchLeases();
    }, []);

    const getColumnSearchProps = (dataIndex: keyof LeaseData, title: string): ColumnType<LeaseData> => {
        return {
            filterDropdown: (filterDropdownProps) => {
                return (
                    <div style={{ padding: 8 }}>
                        <Input
                            placeholder={"Search " + title}
                            value={filterDropdownProps.selectedKeys[0]}
                            onChange={(e) => filterDropdownProps.setSelectedKeys(e.target.value ? [e.target.value] : [])}
                            style={{ width: 188, marginBottom: 8, display: 'block' }}
                        />
                        <ButtonComponent
                            type="primary"
                            title="Search"
                            icon={<SearchOutlined />}
                            size="small"
                            onClick={() => filterDropdownProps.confirm()}
                        />
                        <ButtonComponent
                            type="default"
                            title="Reset"
                            size="small"
                            onClick={() => {
                                filterDropdownProps.clearFilters && filterDropdownProps.clearFilters();
                                filterDropdownProps.confirm();
                            }}
                        />
                    </div>
                );
            },
            filterIcon: function (filtered) {
                return <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />;
            },
            onFilter: function (value, record) {
                // Safely handle null/undefined values
                const recordValue = record[dataIndex];
                if (recordValue == null) {
                    return false;
                }
                return recordValue.toString().toLowerCase().includes(value.toString().toLowerCase());
            },
        };
    };

    // Status is calculated on the backend, but we maintain this function for backward compatibility
    // In the future, we should remove this and rely solely on the backend status
    const getLeaseStatus = (record: { leaseEndDate: string; status: string }) => {
        const today = dayjs();
        const leaseEnd = dayjs(record.leaseEndDate);

        if (record.status === "terminated" || record.status === "draft" || record.status === "pending_approval") {
            return record.status;
        }

        if (leaseEnd.isBefore(today)) return "expired";
        if (leaseEnd.diff(today, "days") <= 60) return "expires_soon";
        return "active";
    };

    // Prepare lease data before rendering
    const filteredData: LeaseData[] = Array.isArray(leases) ? leases.map((lease) => ({
        ...lease,
        key: lease.id, // Ensure each row has a unique key
        tenantName: lease.tenantName || '',
        apartment: lease.apartment || '',
        leaseStartDate: dayjs(lease.leaseStartDate).format("YYYY-MM-DD"),
        leaseEndDate: dayjs(lease.leaseEndDate).format("YYYY-MM-DD"),
        rentAmount: lease.rentAmount ? lease.rentAmount / 100 : 0,
        status: getLeaseStatus(lease),
    })) : [];

    const showModal = (lease: LeaseData) => {
        setSelectedLease({
            ...lease,
            formattedStartDate: dayjs(lease.leaseStartDate),
            formattedEndDate: dayjs(lease.leaseEndDate),
        });
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        setSelectedLease(null);
    };

    const handleAddLeaseClose = () => {
        setIsAddLeaseModalOpen(false);

        // Refresh leases list
        const fetchLeases = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_URL}/admin/tenants/leases/`);
                setLeases(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching leases:", err);
                setError("Failed to fetch leases. Please try again.");
                setLoading(false);
            }
        };

        fetchLeases();
    };

    const handleRenew = (lease: LeaseData) => {
        setSelectedRenewLease(lease);
        setIsRenewModalOpen(true);
    };

    const handleTerminate = async (leaseId: number) => {
        try {
            const payload = {
                id: leaseId,
                updated_by: 100, // Replace with actual admin ID if available
            };

            await axios.post(`${API_URL}/admin/tenants/leases/terminate/${leaseId}`, payload, {
                headers: {
                    "Content-Type": "application/json",
                },
            });

            message.success("Lease successfully terminated");

            const response = await axios.get(`${API_URL}/admin/tenants/leases/`);
            setLeases(response.data);
        } catch (err) {
            console.error("Error terminating lease:", err);
            message.error("Failed to terminate lease");
        }
    };


    // Define lease table columns
    const leaseColumns: ColumnsType<LeaseData> = [
        {
            title: "Tenant Name",
            dataIndex: "tenantName",
            key: "tenantName",
            sorter: (a, b) => a.tenantName.localeCompare(b.tenantName),
            ...getColumnSearchProps("tenantName", "Tenant Name"),
        },
        {
            title: "Apartment",
            dataIndex: "apartment",
            key: "apartment",
            ...getColumnSearchProps("apartment", "Apartment"),
        },
        {
            title: "Lease Start",
            dataIndex: "leaseStartDate",
            key: "leaseStartDate",
            sorter: (a, b) => dayjs(a.leaseStartDate).unix() - dayjs(b.leaseStartDate).unix(),
            ...getColumnSearchProps("leaseStartDate", "Lease Start"),
        },
        {
            title: "Lease End",
            dataIndex: "leaseEndDate",
            key: "leaseEndDate",
            sorter: (a, b) => dayjs(a.leaseEndDate).unix() - dayjs(b.leaseEndDate).unix(),
            ...getColumnSearchProps("leaseEndDate", "Lease End"),
        },
        {
            title: "Rent Amount ($)",
            dataIndex: "rentAmount",
            key: "rentAmount",
            sorter: (a, b) => a.rentAmount - b.rentAmount,
            ...getColumnSearchProps("rentAmount", "Tenant Name"),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => (
                <AlertComponent title={status} type={status === "active" ? "success" : "warning"} />
            ),
            filters: statusFilters,
            onFilter: (value, record) => record.status === value,
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <Space size="middle">
                    {record.status === "draft" && (
                        <ButtonComponent
                            type="primary"
                            title="Send Lease"
                            onClick={() => showModal(record)}
                        />
                    )}
                    {(record.status === "expired" || record.status === "expires_soon") && (
                        <ButtonComponent
                            type="default"
                            title="Renew Lease"
                            onClick={() => handleRenew(record)}
                        />
                    )}
                    {(record.status === "active" || record.status === "pending_tenant_approval" || record.status === "expires_soon") && (
                        <ButtonComponent
                            type="danger"
                            title="Terminate Lease"
                            onClick={() => handleTerminate(record.id)}
                        />
                    )}
                </Space>
            ),
        },
    ];

    // Render loading, error, or table
    return (
        <div className="container overflow-hidden">
            <h1 className="p-3 text-primary">Admin View & Edit Leases</h1>

            <div className="mb-3">
                <ButtonComponent
                    type="primary"
                    title="Add New Lease"
                    onClick={() => setIsAddLeaseModalOpen(true)}
                />
            </div>

            {
                loading ? (
                    <Spin size="large" />
                ) : error ? (
                    <p className="text-danger">{error}</p>
                ) : (
                    <TableComponent<LeaseData>
                        columns={leaseColumns}
                        dataSource={filteredData}
                        onChange={(pagination, filters, sorter, extra) => {
                            // This properly forwards the event to the underlying Table component
                            console.log('Table changed:', { pagination, filters, sorter, extra });
                        }}
                    />
                )}
            {/* New Add Lease Modal */}
            <LeaseAddModalComponent
                visible={isAddLeaseModalOpen}
                onClose={() => {
                    setIsAddLeaseModalOpen(false);
                    handleAddLeaseClose();
                }}
            />

            {/* Send Lease Modal */}
            <LeaseSendModalComponent visible={isModalOpen} onClose={handleCancel} selectedLease={selectedLease} />

            {/* Renew Lease Modal */}
            <LeaseRenewModalComponent
                visible={isRenewModalOpen}
                onClose={() => {
                    setIsRenewModalOpen(false);
                    setSelectedRenewLease(null);
                    handleAddLeaseClose(); // refresh leases
                }}
                lease={selectedRenewLease}
            />

        </div>
    );
}