import { useState, useEffect } from "react";
import "../styles/styles.scss";
import { Space, Spin, Alert } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import TableComponent from "../components/reusableComponents/TableComponent.tsx";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import { LeaseData } from "../types/types.ts";
import { LeaseModalComponent } from "../components/LeaseModalComponent";
import { SearchOutlined } from "@ant-design/icons";
import { Input, message } from "antd";
import type { ColumnType } from "antd/es/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { FileTextOutlined } from "@ant-design/icons";

const API_URL = import.meta.env.VITE_BACKEND_URL;


// Log the API_URL to ensure it's correctly formed
console.log("API URL:", API_URL);

// Default status filters in case dynamic generation fails
const DEFAULT_STATUS_FILTERS = [
    { text: "Draft", value: "draft" },
    { text: "Pending Approval", value: "pending_approval" },
    { text: "Active", value: "active" },
    { text: "Expired", value: "expired" },
    { text: "Terminated", value: "terminated" },
    { text: "Renewed", value: "renewed" },
    { text: "Canceled", value: "canceled" }
];

export default function AdminViewEditLeases() {
    const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
    const [authError, setAuthError] = useState<string | null>(null);

    const [modalConfig, setModalConfig] = useState({
        visible: false,
        mode: "add" as "add" | "send" | "renew" | "amend",
        selectedLease: null as LeaseData | null
    });
    const [statusFilters, setStatusFilters] = useState<{ text: string; value: string }[]>(DEFAULT_STATUS_FILTERS);

    // Initialize the query client
    const queryClient = useQueryClient();

    // Verify authentication when component loads
    useEffect(() => {
        const verifyAuth = async () => {
            try {
                if (isSignedIn) {
                    const token = await getToken();
                    if (!token) {
                        setAuthError("Authentication token not available. Please sign in again.");
                    } else {
                        // Clear any previous error if we have a valid token
                        setAuthError(null);
                    }
                }
            } catch (error) {
                console.error("Authentication error:", error);
                setAuthError("Failed to authenticate. Please try signing in again.");
            }
        };

        if (authLoaded) {
            verifyAuth();
        }
    }, [authLoaded, isSignedIn, getToken]);

    // Function to extract and format status filters
    const extractStatusFilters = (data: any[]) => {
        if (data && Array.isArray(data)) {
            try {
                // Extract unique status values from the lease data
                const uniqueStatuses = [...new Set(data.map(lease => lease.status))];

                // Format the status values for display
                const formattedFilters = uniqueStatuses
                    .filter(status => status) // Filter out any null/undefined values
                    .map(status => {
                        // Parse the status string
                        const text = String(status)
                            .split('_')
                            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
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
    };

    // Populate table with Tanstack Query
    const {
        data: leases = [],
        isLoading,
        isError,
        error,
        refetch
    } = useQuery<LeaseData[]>({
        queryKey: ['tenants', 'leases'],
        queryFn: async () => {
            if (!API_URL) {
                throw new Error('API URL is not configured');
            }

            // Retry up to 3 times with increasing delay
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    // Get the authentication token
                    const token = await getToken();
                    if (!token) {
                        console.log(`[Attempt ${attempt + 1}] Waiting for auth token...`);
                        // Wait before retry (exponential backoff)
                        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                        continue;
                    }

                    console.log(`[Attempt ${attempt + 1}] Fetching leases from: ${API_URL}/admin/leases/`);
                    console.log('Using auth token:', token ? 'Token available' : 'No token');

                    const response = await fetch(`${API_URL}/admin/leases/`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        // Check for Documenso configuration error (412 Precondition Failed)
                        if (response.status === 412) {
                            const errorData = await response.json();
                            if (errorData.error === 'documenso_not_configured') {
                                // Throw a specific error that we can handle in the UI
                                throw new Error('DOCUMENSO_NOT_CONFIGURED');
                            }
                        }

                        // For auth failures, try again
                        if (response.status === 401) {
                            console.log(`[Attempt ${attempt + 1}] Auth failed, retrying...`);
                            if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                            continue;
                        }

                        throw new Error(`Failed to fetch leases: ${response.statusText}`);
                    }

                    const data = await response.json();
                    console.log("Raw API response:", data);
                    console.log("Sample lease data:", data[0]);
                    extractStatusFilters(data);
                    return data || [];

                } catch (err) {
                    // If this is the last attempt or it's a Documenso configuration error, throw the error
                    if (attempt === 2 || (err instanceof Error && err.message === 'DOCUMENSO_NOT_CONFIGURED')) {
                        throw err;
                    }
                    console.log(`[Attempt ${attempt + 1}] Failed, retrying... Error: ${err}`);
                    // Wait before retry (exponential backoff)
                    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                }
            }
            throw new Error("Failed to fetch leases after multiple attempts");
        },
        // Only run query if authentication is loaded and user is signed in
        enabled: authLoaded && isSignedIn && !authError,
        // Only retry once to avoid flooding logs with errors
        retry: 1,
        // Set stale time to reduce unnecessary refetches
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Retry fetching leases if auth is fixed
    useEffect(() => {
        if (authLoaded && isSignedIn && !authError) {
            refetch();
        }
    }, [authLoaded, isSignedIn, authError, refetch]);

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


    // Prepare lease data before rendering
    const filteredData: LeaseData[] = Array.isArray(leases) ? leases.map((lease) => {
        return {
            ...lease,
            key: lease.id,
            id: lease.id,
            tenantId: lease.tenantId || lease.id,
            apartmentId: lease.apartmentId,
            tenantName: lease.tenantName || '',
            apartment: lease.apartment || '',
            leaseStartDate: dayjs(lease.leaseStartDate).format("YYYY-MM-DD"),
            leaseEndDate: dayjs(lease.leaseEndDate).format("YYYY-MM-DD"),
            rentAmount: lease.rentAmount ? lease.rentAmount / 100 : 0,
            status: lease.status, // Use the status directly from the backend
            adminDocUrl: lease.admin_doc_url
        };
    }) : [];

    const showSendModal = (lease: LeaseData) => {
        console.log("Opening send modal", lease);
        setModalConfig({
            visible: true,
            mode: "send",
            selectedLease: {
                ...lease,
                formattedStartDate: dayjs(lease.leaseStartDate),
                formattedEndDate: dayjs(lease.leaseEndDate),
            }
        });
    };

    const handleModalClose = () => {
        setModalConfig(prev => ({ ...prev, visible: false }));

        // Invalidate the query to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ['tenants', 'leases'] });
    };

    const handleAddLease = () => {
        setModalConfig({
            visible: true,
            mode: "add",
            selectedLease: null
        });
    };

    const handleRenew = (lease: LeaseData) => {
        console.log("Renewing lease:", lease);

        // Ensure we have the correct IDs (especially apartmentId)
        if (!lease.apartmentId) {
            message.error("Cannot renew lease: Missing apartment ID");
            return;
        }

        setModalConfig({
            visible: true,
            mode: "renew",
            selectedLease: {
                ...lease,
                formattedStartDate: dayjs().add(1, 'day'),
                formattedEndDate: dayjs().add(1, 'year'),
            }
        });
    };


    const handleAmend = (lease: LeaseData) => {
        console.log("Amend button clicked", lease);

        // Ensure we have the correct IDs
        if (!lease.apartmentId) {
            console.error("Missing apartmentId in lease:", lease);
            message.error("Cannot amend lease: Missing apartment ID");
            return;
        }

        console.log("Setting modal config:", {
            visible: true,
            mode: "amend",
            selectedLease: {
                ...lease,
                formattedStartDate: dayjs(lease.leaseStartDate),
                formattedEndDate: dayjs(lease.leaseEndDate),
            }
        });

        setModalConfig({
            visible: true,
            mode: "amend",
            selectedLease: {
                ...lease,
                formattedStartDate: dayjs(lease.leaseStartDate),
                formattedEndDate: dayjs(lease.leaseEndDate),
            }
        });

        // Log state change after setting it
        setTimeout(() => {
            console.log("Modal config after state update:", modalConfig);
        }, 0);
    };

    const handleTerminate = async (leaseId: number) => {
        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Authentication token is required');
            }

            const payload = {
                id: leaseId,
                updated_by: 100, // You might want to use the actual user ID here
            };

            const response = await fetch(`${API_URL}/admin/leases/terminate/${leaseId}`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to terminate lease');
            }

            message.success("Lease successfully terminated");

            // Invalidate the query to trigger a refetch
            queryClient.invalidateQueries({ queryKey: ['tenants', 'leases'] });

        } catch (err) {
            console.error("Error terminating lease:", err);
            message.error("Failed to terminate lease");
        }
    };
    // TODO: Cancel Lease Mutation (for pending_approval leases)
    // const cancelLeaseMutation = useMutation({
    //     mutationFn: async (leaseId: number) => {
    //         const token = await getToken();
    //         if (!token) throw new Error("Authentication token required");

    //         // You might need to create a new endpoint for cancel if it doesn't exist yet
    //         const response = await fetch(
    //             `${API_URL}/admin/leases/cancel/${leaseId}`,
    //             {
    //                 method: 'POST',
    //                 headers: {
    //                     'Authorization': `Bearer ${token}`,
    //                     'Content-Type': 'application/json'
    //                 }
    //             }
    //         );

    //         if (!response.ok) {
    //             const errorData = await response.text();
    //             throw new Error(errorData || response.statusText);
    //         }

    //         return await response.json();
    //     },
    //     onSuccess: () => {
    //         setStatus('success');
    //         message.success("Lease canceled successfully!");
    //         queryClient.invalidateQueries({ queryKey: ['tenants', 'leases'] });

    //         setTimeout(() => {
    //             onClose();
    //         }, 2000);
    //     },
    //     onError: (error: Error) => {
    //         setStatus('error');
    //         const errMsg = error.message || "Failed to cancel lease";
    //         setErrorMessage(`Server error: ${errMsg}`);
    //         message.error(`Error: ${errMsg}`);
    //         console.error("Error in cancel operation:", error);
    //     }
    // });
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
            ...getColumnSearchProps("rentAmount", "Rent Amount"),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => {
                // Format the status to display in Title Case (e.g., "pending_approval" -> "Pending Approval")
                const formattedStatus: string = status
                    .split('_')
                    .map((word: string): string => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                // Determine alert type based on status
                let alertType: "success" | "info" | "warning" | "error" = "warning";
                if (status === "active") alertType = "success";
                else if (status === "draft" || status === "pending_approval") alertType = "info";
                else if (status === "terminated" || status === "expired") alertType = "error";

                return (
                    <Alert
                        className="flex text-left"
                        message={formattedStatus}
                        type={alertType}
                        showIcon
                        style={{ padding: '4px 8px' }}
                        closable={false}
                    />
                );
            },
            filters: statusFilters,
            onFilter: (value, record) => record.status === value,
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (

                <Space size="middle" wrap={true}>
                    {record.admin_doc_url && (
                        <a
                            href={record.admin_doc_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-info"
                            style={{ padding: '4px 10px', borderRadius: 4 }}
                        >
                            <FileTextOutlined style={{ marginRight: 4 }} />
                            View Lease
                        </a>
                    )}
                    {record.status === "draft" && (
                        <ButtonComponent
                            type="primary"
                            title="Send Lease"
                            onClick={() => showSendModal(record)}
                        />
                    )}
                    {(record.status === "expired" || record.status === "expires_soon") && (
                        <ButtonComponent
                            type="default"
                            title="Renew Lease"
                            onClick={() => handleRenew(record)}
                        />
                    )}
                    {(record.status === "active" || record.status === "expires_soon" || record.status === "draft") && (
                        <ButtonComponent
                            type="info"
                            title="Amend Lease"
                            onClick={() => handleAmend(record)}
                        />
                    )}
                    {(record.status === "active" || record.status === "pending_approval" || record.status === "expires_soon") && (
                        <ButtonComponent
                            type="danger"
                            title="Terminate Lease"
                            onClick={() => handleTerminate(record.id)}
                        />
                    )}
                    {/* TODO: {(record.status === "pending_approval") && (
                        <ButtonComponent
                            type="danger"
                            title="Terminate Lease"
                            onClick={() => handleCancel(record.id)}
                        />
                    )} */}
                </Space>
            ),
        }

    ];

    // Render authentication errors if needed
    if (!authLoaded) {
        return (
            <div className="container overflow-hidden">
                <h1 className="p-3 text-primary">Admin View & Edit Leases</h1>
                <Spin size="large" tip="Loading authentication..." />
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="container overflow-hidden">
                <h1 className="p-3 text-primary">Admin View & Edit Leases</h1>
                <Alert
                    message="Authentication Required"
                    description="You need to sign in to view this page."
                    type="error"
                    showIcon
                />
            </div>
        );
    }

    if (authError) {
        return (
            <div className="container overflow-hidden">
                <h1 className="p-3 text-primary">Admin View & Edit Leases</h1>
                <Alert
                    message="Authentication Error"
                    description={authError}
                    type="error"
                    showIcon
                />
            </div>
        );
    }

    // Render loading, error, or table
    return (
        <div className="container overflow-hidden">
            <h1 className="p-3 text-primary">Admin View & Edit Leases</h1>

            <div className="mb-3">
                <ButtonComponent
                    type="primary"
                    title="Add New Lease"
                    onClick={handleAddLease}
                />
            </div>

            {
                isLoading ? (
                    <Spin size="large" />
                ) : isError ? (
                    // Check for Documenso configuration error
                    (error instanceof Error && error.message === 'DOCUMENSO_NOT_CONFIGURED') ? (
                        <div className="mb-4">
                            <AlertComponent
                                type="warning"
                                title="Documenso Configuration Required"
                                message="Please configure your Documenso API key and webhook before accessing leases"
                                description="Digital lease signing requires Documenso integration. Go to the Admin Setup page to configure your Documenso API key and webhook."
                            />
                            <div className="mt-4 text-center">
                                <ButtonComponent
                                    type="primary"
                                    title="Go to Admin Setup"
                                    onClick={() => window.location.href = '/admin/settings'}
                                />
                            </div>
                        </div>
                    ) : (
                        <Alert
                            message="Error Loading Leases"
                            description={(error as Error)?.message || "Failed to fetch leases"}
                            type="error"
                            showIcon
                        />
                    )
                ) : (
                    <TableComponent<LeaseData>
                        columns={leaseColumns}
                        dataSource={filteredData}
                        scroll={{ x: "100%" }}
                        onChange={(pagination, filters, sorter, extra) => {
                            // This properly forwards the event to the underlying Table component
                            console.log('Table changed:', { pagination, filters, sorter, extra });
                        }}
                    />
                )}
            <LeaseModalComponent
                visible={modalConfig.visible}
                onClose={handleModalClose}
                mode={modalConfig.mode}
                selectedLease={modalConfig.selectedLease}
                API_URL={API_URL}
            />
        </div>
    );
}

