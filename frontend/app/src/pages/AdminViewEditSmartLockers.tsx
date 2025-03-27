// TODO: I was last working on setting up the tanstack mutations for updatePassword and unlockLocker between the action menu and the modals. I need to make sure I am passing the right states that are needed. For the Unlock, I need to unlock the locker using the access code, that belongs to a user. For the update locker, I need to update the access code, that belongs to a user
import { useMutation, useQuery, UseMutateFunction } from "@tanstack/react-query";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import TableComponent from "../components/reusableComponents/TableComponent";
import { useAuth } from "@clerk/react-router";
import { ColumnsType } from "antd/es/table";
import ModalComponent, { Tenant } from "../components/ModalComponent";
import { useState } from "react";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import { ArrowRightOutlined } from "@ant-design/icons";
import { Button, Dropdown, MenuProps, Modal } from "antd";

const DOMAIN_URL = import.meta.env.VITE_DOMAIN_URL;
const PORT = import.meta.env.VITE_PORT;
const API_URL = `${DOMAIN_URL}:${PORT}`.replace(/\/$/, ""); // :white_check_mark: Remove trailing slashes

type Locker = {
    id: number;
    user_id: string | null;
    access_code: string | null;
    in_use: boolean;
};

interface ActionsDropdownProps {
    lockerId: number;
    password: string;
}

interface UpdatePasswordModalProps {
    lockerId: number;
    password: string;
    handleOkay: UseMutateFunction<Locker, Error, void, unknown>;
    setLockerId: (id: number) => void;
    setAccessCode: (code: string) => void;
}

interface UnlockLockerModalProps {
    lockerId: number;
    handleOkay: UseMutateFunction<Locker, Error, void, unknown>;
    setAccessCode: (code: string) => void;
}

const AdminViewEditSmartLockers = () => {
    const { getToken } = useAuth();

    // Update the type to match clerk_id which is a string
    const [selectedUserId, setSelectedUserId] = useState<string>();
    const [accessCode, setAccessCode] = useState<string>("");

    const { mutate: updatePassword } = useMutation({
        mutationFn: async () => {
            const token = await getToken();
            if (!token) {
                throw new Error("No authentication token available");
            }

            const res = await fetch(`${API_URL}/admin/lockers/${selectedUserId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    access_code: accessCode,
                }),
            });

            if (!res.ok) {
                throw new Error(`Failed to update password: ${res.status}`);
            }

            return res.json();
        },
    });

    const { mutate: unlockLocker } = useMutation({
        mutationFn: async () => {
            const token = await getToken();

            if (!token) {
                throw new Error("No authentication token available");
            }

            const res = await fetch(`${API_URL}/admin/lockers/${selectedUserId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    in_use: false,
                }),
            });

            if (!res.ok) {
                throw new Error(`Failed to unlock locker: ${res.status}`);
            }

            return res.json();
        },
    });

    const UpdatePasswordLockerModal = ({ lockerId, password, handleOkay }: UpdatePasswordModalProps) => {
        return (
            <ModalComponent
                buttonTitle="Update Password"
                buttonType="primary"
                modalTitle="Update Password"
                content={`Current password: ${password}`}
                type="Update Password Locker"
                locker={lockerId}
                // setLockerId={setLockerId}
                setAccessCode={setAccessCode}
                handleOkay={async () => {
                    await handleOkay();
                }}
            />
        );
    };

    const UnlockLockerModal = ({ lockerId, handleOkay }: UnlockLockerModalProps) => {
        return (
            <ModalComponent
                buttonTitle="Unlock Locker"
                buttonType="primary"
                modalTitle="Unlock Locker"
                content="Are you sure that you would like to unlock the locker?"
                type="Admin Unlock Locker"
                // setLockerId={setLockerId}
                setAccessCode={setAccessCode}
                locker={lockerId}
                handleOkay={async () => {
                    await handleOkay();
                }}
            />
        );
    };

    function ActionMenu(props: ActionsDropdownProps) {
        const items: MenuProps["items"] = [
            {
                key: "1",
                label: (
                    <UpdatePasswordLockerModal
                        lockerId={props.lockerId}
                        password={props.password}
                        handleOkay={updatePassword}
                        setLockerId={(id: number) => setSelectedUserId(id.toString())}
                        setAccessCode={setAccessCode}
                    />
                ),
            },
            {
                key: "2",
                label: (
                    <UnlockLockerModal
                        lockerId={props.lockerId}
                        handleOkay={unlockLocker}
                        // setLockerId={setSelectedUserId}
                        setAccessCode={setAccessCode}
                    />
                ),
            },
        ];

        return (
            <div>
                <Dropdown
                    menu={{ items }}
                    placement="bottomRight"
                    overlayClassName={"custom-dropdown"}>
                    <Button>
                        <p className="fs-3 fw-bold">...</p>
                    </Button>
                </Dropdown>
            </div>
        );
    }

    // Query for getting all tenants clerk_id
    const { data: tenants } = useQuery<Tenant[]>({
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

    // Query for fetching lockers
    const {
        data: lockers,
        isLoading: isLoadingLockers,
        isError: isErrorLockers,
    } = useQuery<Locker[]>({
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
                return data;
            } catch (error) {
                console.error("Error fetching lockers:", error);
                throw error;
            }
        },
        retry: 3, // Retry failed requests 3 times
        staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
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
            throw error; // Re-throw to be caught by modal error handler
        }
    };

    const columns: ColumnsType<Locker> = [
        // {
        //     title: "ID",
        //     dataIndex: "id",
        //     key: "id",
        // },
        {
            title: "User ID",
            dataIndex: "user_id",
            key: "user_id",
            render: (userId: string | null) => <span>{userId ?? "N/A"}</span>,
        },
        {
            title: "Access Code",
            dataIndex: "access_code",
            key: "access_code",
            render: (accessCode: string | null) => <span>{accessCode ?? "N/A"}</span>,
        },
        {
            title: "In Use",
            dataIndex: "in_use",
            key: "in_use",
            render: (inUse: boolean) => (
                <span>
                    {inUse ? (
                        <>
                            <span style={{ color: "green" }}>●</span> Yes
                        </>
                    ) : (
                        <>
                            <span style={{ color: "red" }}>●</span> No
                        </>
                    )}
                </span>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            fixed: "right",
            render: (record: Locker) => (
                <div className="flex flex-column gap-2">
                    {/* View Tenant Complaints */}
                    {/* View Tenant Work Orders */}
                    <ActionMenu
                        key={record.id}
                        lockerId={record.id}
                        password={record.access_code ?? ""}
                    />
                    {/* Leaving these here because I think we might need them. */}
                    {/* Edit Tenant */}
                    {/* <ModalComponent type="Edit Tenant" modalTitle="Edit Tenant" buttonTitle="Edit" content="Edit Tenant" handleOkay={() => { }} buttonType="primary" /> */}
                    {/* Delete Tenant */}
                    {/* <ModalComponent type="default" modalTitle="Delete Tenant" buttonTitle="Delete" content="Warning! Are you sure that you would like to delete the tenant?" handleOkay={() => { }} buttonType="danger" /> */}
                </div>
            ),
        },
    ];

    const dataSource = lockers || [];

    console.log("Lockers data:", lockers);

    return (
        <div className="container">
            <PageTitleComponent title="Admin View Edit Smart Lockers" />
            <p className="text-muted mb-4 text-center">View and manage all smart lockers in the system</p>
            <div className="d-flex mb-4 gap-2">
                <ModalComponent
                    buttonTitle="Add Package"
                    buttonType="default"
                    modalTitle="Add Package"
                    content=""
                    tenant={tenants ?? []}
                    type="Smart Locker"
                    setUserId={setSelectedUserId}
                    setAccessCode={setAccessCode}
                    handleOkay={async () => {
                        await handleAddPackage();
                    }}
                />
                {/* Refresh button */}
                <ButtonComponent
                    title="Refresh"
                    type="default"
                    icon={<ArrowRightOutlined />}
                    onClick={() => {
                        window.location.reload();
                    }}
                />
            </div>
            <TableComponent
                columns={columns}
                dataSource={dataSource}
                loading={isLoadingLockers}
            />
        </div>
    );
};

export default AdminViewEditSmartLockers;
