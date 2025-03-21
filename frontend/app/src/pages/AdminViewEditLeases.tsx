import { useState, useEffect } from "react";
import { useState, useEffect } from "react";
import "../styles/styles.scss";
import { Space, Spin } from "antd";
import { Space, Spin } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import axios from "axios";
import axios from "axios";
import TableComponent from "../components/reusableComponents/TableComponent.tsx";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import { LeaseData } from "../types/types.ts";
import { LeaseSendModalComponent } from "../components/LeaseSendModalComponent.tsx";
import { LeaseAddModalComponent } from "../components/LeaseAddModalComponent.tsx"
import { LeaseRenewModalComponent } from "../components/LeaseRenewModalComponent.tsx"
import { message } from "antd";
const API_URL = `${import.meta.env.VITE_DOMAIN_URL}:${import.meta.env.VITE_PORT}`.replace(/\/$/, "");

export default function AdminViewEditLeases() {
    const [leases, setLeases] = useState<LeaseData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLease, setSelectedLease] = useState<LeaseData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddLeaseModalOpen, setIsAddLeaseModalOpen] = useState(false);
    const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
    const [selectedRenewLease, setSelectedRenewLease] = useState<LeaseData | null>(null);

    // 1. POPULATE TABLE
    // Fetch lease data from backend
    useEffect(() => {
        const fetchLeases = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_URL}/admin/tenants/leases/get-leases`);
                setLeases(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching leases:", err);
                setError("Failed to fetch leases. Please try again.");
                setLoading(false);
            }
        };

        fetchLeases();
    }, []);

    // TODO: THIS SHOULD DEPEND ON DB INSTEAD OF BEING CALCULATED ON THE FRONTEND TO AVOID DISCREPANCIES
    // Dynamically compute status based on end date
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
    import { LeaseSendModalComponent } from "../components/LeaseSendModalComponent.tsx";
    import { LeaseAddModalComponent } from "../components/LeaseAddModalComponent.tsx"
    import { LeaseRenewModalComponent } from "../components/LeaseRenewModalComponent.tsx"
    import { message } from "antd";
    const API_URL = `${import.meta.env.VITE_DOMAIN_URL}:${import.meta.env.VITE_PORT}`.replace(/\/$/, "");

    export default function AdminViewEditLeases() {
        const [leases, setLeases] = useState<LeaseData[]>([]);
        const [loading, setLoading] = useState<boolean>(true);
        const [error, setError] = useState<string | null>(null);
        const [selectedLease, setSelectedLease] = useState<LeaseData | null>(null);
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [isAddLeaseModalOpen, setIsAddLeaseModalOpen] = useState(false);
        const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
        const [selectedRenewLease, setSelectedRenewLease] = useState<LeaseData | null>(null);

        // 1. POPULATE TABLE
        // Fetch lease data from backend
        useEffect(() => {
            const fetchLeases = async () => {
                try {
                    setLoading(true);
                    const response = await axios.get(`${API_URL}/admin/tenants/leases/get-leases`);
                    setLeases(response.data);
                    setLoading(false);
                } catch (err) {
                    console.error("Error fetching leases:", err);
                    setError("Failed to fetch leases. Please try again.");
                    setLoading(false);
                }
            };

            fetchLeases();
        }, []);

        // TODO: THIS SHOULD DEPEND ON DB INSTEAD OF BEING CALCULATED ON THE FRONTEND TO AVOID DISCREPANCIES
        // Dynamically compute status based on end date
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
        const filteredData: LeaseData[] = leases.map((lease) => ({
            ...lease,
            key: lease.id, // Ensure each row has a unique key
            tenantName: lease.tenantName,
            apartment: lease.apartment,
            leaseStartDate: dayjs(lease.leaseStartDate).format("YYYY-MM-DD"),
            leaseEndDate: dayjs(lease.leaseEndDate).format("YYYY-MM-DD"),
            rentAmount: lease.rentAmount ? lease.rentAmount / 100 : 0,
            status: getLeaseStatus(lease),
        }));
        // Prepare lease data before rendering
        const filteredData: LeaseData[] = leases.map((lease) => ({
            ...lease,
            key: lease.id, // Ensure each row has a unique key
            tenantName: lease.tenantName,
            apartment: lease.apartment,
            leaseStartDate: dayjs(lease.leaseStartDate).format("YYYY-MM-DD"),
            leaseEndDate: dayjs(lease.leaseEndDate).format("YYYY-MM-DD"),
            rentAmount: lease.rentAmount ? lease.rentAmount / 100 : 0,
            status: getLeaseStatus(lease),
        }));

        const showModal = (lease: LeaseData) => {
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
                        const response = await axios.get(`${API_URL}/admin/tenants/leases/get-leases`);
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

                    await axios.post(`${API_URL}/admin/tenants/leases/${leaseId}/terminate`, payload, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });

                    message.success("Lease successfully terminated");

                    const response = await axios.get(`${API_URL}/admin/tenants/leases/get-leases`);
                    setLeases(response.data);
                } catch (err) {
                    console.error("Error terminating lease:", err);
                    message.error("Failed to terminate lease");
                }
            };


            // Define lease table columns
        };


        // Define lease table columns
        const leaseColumns: ColumnsType<LeaseData> = [
            {
                title: "Tenant Name",
                dataIndex: "tenantName",
                key: "tenantName",
                sorter: (a, b) => a.tenantName.localeCompare(b.tenantName),
            },
            {
                title: "Apartment",
                title: "Apartment",
                dataIndex: "apartment",
                key: "apartment",
            },
            {
                title: "Lease Start",
                dataIndex: "leaseStartDate",
                key: "leaseStartDate",
                sorter: (a, b) => dayjs(a.leaseStartDate).unix() - dayjs(b.leaseStartDate).unix(),
            },
            {
                title: "Lease End",
                dataIndex: "leaseEndDate",
                key: "leaseEndDate",
                sorter: (a, b) => dayjs(a.leaseEndDate).unix() - dayjs(b.leaseEndDate).unix(),
            },
            {
                title: "Rent Amount ($)",
                dataIndex: "rentAmount",
                key: "rentAmount",
                sorter: (a, b) => a.rentAmount - b.rentAmount,
            },
            {
                title: "Status",
                dataIndex: "status",
                key: "status",
                render: (status) => (
                    <AlertComponent title={status} type={status === "active" ? "success" : "warning"} />
                ),
                key: "status",
                render: (status) => (
                    <AlertComponent title={status} type={status === "active" ? "success" : "warning"} />
                ),
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
                        {record.status === "expired" && (
                            {
                                record.status === "expired" && (
                                    <ButtonComponent
                                        type="default"
                                        title="Renew Lease"
                                        onClick={() => handleRenew(record)}
                                        type="default"
                                        title="Renew Lease"
                                        onClick={() => handleRenew(record)}
                                    />
                                )
                            }
                    {(record.status === "active" || record.status === "pending_tenant_approval") && (
                            <ButtonComponent
                                type="danger"
                                title="Terminate Lease"
                                onClick={() => handleTerminate(record.id)}
                            />
                    {(record.status === "active" || record.status === "pending_tenant_approval") && (
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
        // Render loading, error, or table
        return (
            <div className="container overflow-hidden">
                <h1 className="p-3 text-primary">Admin View & Edit Leases</h1>
                <div className="container overflow-hidden">
                    <h1 className="p-3 text-primary">Admin View & Edit Leases</h1>

                    <div className="mb-3">
                        <ButtonComponent
                            type="primary"
                            title="Add New Lease"
                            onClick={() => setIsAddLeaseModalOpen(true)}
            <div className="mb-3">
                            <ButtonComponent
                                type="primary"
                                title="Add New Lease"
                                onClick={() => setIsAddLeaseModalOpen(true)}
                            />
                        </div>

                        {loading ? (
                            <Spin size="large" />
                        ) : error ? (
                            <p className="text-danger">{error}</p>
                        ) : (
                            <TableComponent<LeaseData> columns={leaseColumns} dataSource={filteredData} />
                        )}

                        {/* Existing Modal */}
                        <LeaseSendModalComponent visible={isModalOpen} onClose={handleCancel} selectedLease={selectedLease} />

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


                        {loading ? (
                            <Spin size="large" />
                        ) : error ? (
                            <p className="text-danger">{error}</p>
                        ) : (
                            <TableComponent<LeaseData> columns={leaseColumns} dataSource={filteredData} />
                        )}

                        {/* Existing Modal */}
                        <LeaseSendModalComponent visible={isModalOpen} onClose={handleCancel} selectedLease={selectedLease} />

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
