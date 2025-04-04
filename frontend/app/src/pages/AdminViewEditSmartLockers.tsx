// TODO: I was last working on setting up the tanstack mutations for updatePassword and unlockLocker between the action menu and the modals. I need to make sure I am passing the right states that are needed. For the Unlock, I need to unlock the locker using the access code, that belongs to a user. For the update locker, I need to update the access code, that belongs to a user
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import { useAuth } from "@clerk/react-router";
import Table, { ColumnsType } from "antd/es/table";
import { Tenant } from "../components/ModalComponent";
import { useState } from "react";
import { NumberOutlined, SyncOutlined, UnlockOutlined } from "@ant-design/icons";
import { Button, Dropdown, Form, InputNumber, MenuProps, Modal, Select } from "antd";
import { generateAccessCode } from "../lib/utils";
import { TableRowSelection } from "antd/es/table/interface";

const serverUrl = import.meta.env.VITE_SERVER_URL;
const absoluteServerUrl = `${serverUrl}`;

type Locker = {
    id: number;
    user_id: number | null;
    access_code: string | null;
    in_use: boolean;
};

interface ActionsDropdownProps {
    lockerId: number;
    userId: number;
    password: string;
}

const AdminViewEditSmartLockers = () => {
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [loading, setLoading] = useState(false);
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    const start = () => {
        setLoading(true);
        // ajax request after empty completing
        setTimeout(() => {
            setSelectedRowKeys([]);
            setLoading(false);
        }, 1000);
    };

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        console.log("selectedRowKeys changed: ", newSelectedRowKeys);
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const rowSelection: TableRowSelection<Locker> = {
        selectedRowKeys,
        onChange: onSelectChange,
    };

    const hasSelected = selectedRowKeys.length > 0;

    // Query for getting all tenants clerk_id
    const { data: tenants } = useQuery<Tenant[]>({
        queryKey: ["tenants"],
        queryFn: async () => {
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

            const data = await res.json();
            console.log("Response data for tenants query:", data);
            return data;
        },
    });

    // Query for fetching lockers
    const { data: lockers, isLoading: isLoadingLockers } = useQuery<Locker[]>({
        queryKey: ["lockers"],
        queryFn: async () => {
            // console.log("Fetching lockers...");
            const token = await getToken();
            if (!token) {
                throw new Error("No authentication token available");
            }

            const res = await fetch(`${absoluteServerUrl}/admin/lockers`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            // console.log("Locker response status:", res.status);

            if (!res.ok) {
                throw new Error(`Failed to fetch lockers: ${res.status}`);
            }

            const data = (await res.json()) as Locker[];
            // console.log("Locker response data:", data);
            return data;
        },
        // retry: 3, // Retry failed requests 3 times
        staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    });

    const { mutate: updatePassword } = useMutation({
        mutationFn: async ({ lockerID, accessCode }: { lockerID: number; accessCode: string }) => {
            if (!lockerID) {
                throw new Error("Invalid locker ID");
            }
            if (!accessCode) {
                throw new Error("Invalid access code");
            }

            const token = await getToken();
            if (!token) {
                throw new Error("No authentication token available");
            }

            const res = await fetch(`${absoluteServerUrl}/admin/lockers/${lockerID}/code`, {
                method: "PATCH",
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
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lockers"] });
            queryClient.invalidateQueries({ queryKey: ["numberOfLockersInUse"] });
        },
    });

    const { mutate: unlockLocker } = useMutation({
        mutationFn: async ({ lockerID, tenantID, accessCode }: { lockerID: number; tenantID: number; accessCode: string }) => {
            const token = await getToken();

            if (!token) {
                throw new Error("No authentication token available");
            }

            const res = await fetch(`${absoluteServerUrl}/admin/lockers/${lockerID}/unlock`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    access_code: accessCode,
                    in_use: false,
                    user_id: tenantID,
                }),
            });

            if (!res.ok) {
                throw new Error(`Failed to unlock locker: ${res.status}`);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lockers"] });
            queryClient.invalidateQueries({ queryKey: ["numberOfLockersInUse"] });
        },
    });

    function ActionMenu(props: ActionsDropdownProps) {
        const items: MenuProps["items"] = [
            {
                key: "1",
                label: (
                    <div onClick={() => updatePassword({ lockerID: props.lockerId, accessCode: generateAccessCode() })}>
                        <SyncOutlined className="me-1" />
                        Update Password
                    </div>
                ),
            },
            {
                key: "2",
                label: (
                    <div onClick={() => unlockLocker({ lockerID: props.lockerId, tenantID: props.userId, accessCode: props.password })}>
                        <UnlockOutlined className="me-1" />
                        Unlock
                    </div>
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

    const columns: ColumnsType<Locker> = [
        {
            title: "Id",
            dataIndex: "id",
            key: "Id",
            render: (lockerId: number) => <span>{lockerId}</span>,
        },
        {
            title: "Access Code",
            dataIndex: "access_code",
            key: "access_code",
            render: (accessCode: string | null) => <span>{accessCode ?? "N/A"}</span>,
        },
        {
            title: "User Id",
            dataIndex: "user_id",
            key: "user_id",
            render: (id: number | null) => <span>{id ?? "N/A"}</span>,
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
                        userId={record.user_id ?? 0}
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
        <div className="container ">
            <PageTitleComponent title="Admin View Edit Smart Lockers" />
            <p className="text-muted mb-4 text-center">View and manage all smart lockers in the system</p>
            <div className="d-flex mb-4 gap-2">
                <AddLockersModal />
                <AddPackageModal tenants={tenants ?? []} />
            </div>
            <div style={{ position: "relative" }}>
                {hasSelected ? (
                    <span className="d-flex">
                        <Button
                            type="primary"
                            style={{ position: "absolute", top: "2%", left: "3%", zIndex: 5 }}
                            onClick={start}
                            disabled={!hasSelected}
                            loading={loading}>
                            Unlock ({selectedRowKeys.length})
                        </Button>
                        <Button
                            className="btn btn-danger"
                            style={{ position: "absolute", top: "2%", left: "11%", zIndex: 5 }}
                            onClick={start}
                            disabled={!hasSelected}
                            loading={loading}>
                            Delete ({selectedRowKeys.length})
                        </Button>
                    </span>
                ) : null}
                <Table
                    rowSelection={rowSelection}
                    columns={columns}
                    dataSource={dataSource}
                />
            </div>
            {/* <TableComponent */}
            {/*     columns={columns} */}
            {/*     dataSource={dataSource} */}
            {/*     loading={isLoadingLockers} */}
            {/* /> */}
        </div>
    );
};

export default AdminViewEditSmartLockers;

interface AddPackageModalProps {
    tenants: Tenant[];
}

interface AddPackageFormShcema {
    selectedUserId: string;
    accessCode: string;
}

function AddPackageModal(props: AddPackageModalProps) {
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const [accessCode, setAccessCode] = useState(generateAccessCode());
    const [addPackageForm] = Form.useForm<AddPackageFormShcema>();
    const queryClient = useQueryClient();
    const { getToken } = useAuth();

    const { mutate: addPackage, isPending: addPackageIsPending } = useMutation({
        mutationKey: ["admin-add-package"],
        mutationFn: async ({ selectedUserId, accessCode }: { selectedUserId: string; accessCode: string }) => {
            if (!selectedUserId) {
                console.error("Please select a tenant");
                return;
            }

            if (!accessCode) {
                console.error("Please enter an access code");
                return;
            }
            const token = await getToken();
            if (!token) {
                throw new Error("No authentication token available");
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
            addPackageForm.resetFields();
            handleCancel();
        },
    });

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
                onClick={() => showModal()}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    className="lucide lucide-package-plus-icon lucide-package-plus">
                    <path d="M16 16h6" />
                    <path d="M19 13v6" />
                    <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
                    <path d="m7.5 4.27 9 5.15" />
                    <polyline points="3.29 7 12 12 20.71 7" />
                    <line
                        x1="12"
                        x2="12"
                        y1="22"
                        y2="12"
                    />
                </svg>
                Add Package
            </Button>
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3 style={{ fontWeight: "bold" }}>Add Package</h3>}
                open={internalModalOpen}
                onCancel={handleCancel}
                onOk={() => {
                    addPackageForm.setFieldValue("accessCode", accessCode);
                    addPackage({ selectedUserId: addPackageForm.getFieldValue("selectedUserId"), accessCode: addPackageForm.getFieldValue("accessCode") });
                }}
                okButtonProps={{ hidden: false, disabled: addPackageIsPending ? true : false }}
            // cancelButtonProps={{ hidden: true, disabled: true }}>
            >
                <div>
                    <Form
                        form={addPackageForm}
                        layout="vertical">
                        <p className="fs-6">User</p>
                        <Form.Item
                            name="selectedUserId"
                            rules={[{ required: true, message: "Please select a user" }]}>
                            <Select
                                onChange={(v) => addPackageForm.setFieldValue("selectedUserId", v)}
                                placeholder="Select a user">
                                {props.tenants.map((user) => (
                                    <Select.Option
                                        key={user.id}
                                        value={user.clerk_id}>
                                        {user.first_name} {user.last_name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <p className="fs-6">Access Code</p>
                        <Form.Item name="accessCode">
                            <p style={{ color: "black" }}>{accessCode}</p>
                        </Form.Item>
                    </Form>
                </div>
            </Modal>
        </>
    );
}

interface LockerFormSchema {
    numberOfLockers: number;
}

function AddLockersModal() {
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const [lockerForm] = Form.useForm<LockerFormSchema>();
    const queryClient = useQueryClient();
    const { getToken } = useAuth();

    const { mutate: addLockers, isPending } = useMutation({
        mutationKey: ["admin-add-lockers"],
        mutationFn: async (amount: number) => {
            const token = await getToken();
            if (!token) {
                throw new Error("No authentication token available");
            }

            const res = await fetch(`${absoluteServerUrl}/admin/lockers/many`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ count: amount }),
            });
            if (!res.ok) {
                throw new Error(`Failed creating new locker`);
            }
        },
        onSuccess: () => {
            // queryClient.invalidateQueries({ queryKey: ["numberOfLockersInUse"] });
            queryClient.invalidateQueries({ queryKey: ["lockers"] });
            queryClient.invalidateQueries({ queryKey: ["numberOfLockersInUse"] });
            lockerForm.resetFields();
            handleCancel();
        },
    });

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
                onClick={() => showModal()}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    className="lucide lucide-square-plus-icon lucide-square-plus">
                    <rect
                        width="18"
                        height="18"
                        x="3"
                        y="3"
                        rx="2"
                    />
                    <path d="M8 12h8" />
                    <path d="M12 8v8" />
                </svg>
                Add Lockers
            </Button>
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3 style={{ fontWeight: "bold" }}>Create New Lockers</h3>}
                open={internalModalOpen}
                onCancel={handleCancel}
                onOk={() => addLockers(lockerForm.getFieldValue("numberOfLockers"))}
                okButtonProps={{ hidden: false, disabled: isPending ? true : false }}
            // cancelButtonProps={{ hidden: true, disabled: true }}>
            >
                <div>
                    <Form
                        form={lockerForm}
                        layout="vertical">
                        <p className="fs-6">Locker Amount</p>
                        <Form.Item
                            name="numberOfLockers"
                            rules={[{ required: true, message: "Please select an amount of lockers you wish to create", type: "number", min: 1, max: 100 }]}>
                            <InputNumber prefix={<NumberOutlined />} />
                        </Form.Item>
                    </Form>
                </div>
            </Modal>
        </>
    );
}
