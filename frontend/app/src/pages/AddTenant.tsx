import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import TableComponent from "../components/reusableComponents/TableComponent";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react-router";
import { Button, Divider, Dropdown, Form, Input, MenuProps, Modal } from "antd";
import { CheckOutlined, CloseCircleOutlined, MailOutlined, PlusOutlined } from "@ant-design/icons";
import { ComplaintsData, TenantsWithLeaseStatus, User, WorkOrderData } from "../types/types";
import { ColumnsType } from "antd/es/table";

type InviteTenant = {
    email: string;
};

interface InviteStatusNotification {
    show: boolean;
    message: string;
    type: "default" | "success" | "error";
}

const AddTenant = () => {
    const { getToken } = useAuth();
    const { data: tenants } = useQuery({
        queryKey: ["tenants"],
        queryFn: async () => {
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_TABLE] Error unauthorized");
            }

            const res = await fetch(`http://localhost:8080/admin/tenants`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
            });
            if (!res.ok) {
                throw new Error("[TENANT_TABLE] Error request failed");
            }

            return (await res.json()) as TenantsWithLeaseStatus[];
        },
    });

    console.log(`data: ${JSON.stringify(tenants)}\n\n`);

    // Mock data for tenant table
    const columns: ColumnsType<TenantsWithLeaseStatus> = [
        {
            title: "ID",
            dataIndex: "id",
            key: "id",
            fixed: "left",
        },
        {
            title: "Name",
            dataIndex: "",
            key: "fullName",
            render: (record: User) => `${record.first_name} ${record.last_name}`,
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
        },
        {
            title: "Phone",
            dataIndex: "phone",
            key: "phone",
            render: (phone: string | null) => phone ?? "N/A",
        },
        {
            title: "Role",
            dataIndex: "role",
            key: "role",
        },
        {
            title: "Unit Number",
            dataIndex: "unitNumber",
            key: "unitNumber",
            render: (unitNumber: number | null) => unitNumber ?? "N/A",
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
        },
        {
            title: "Created At",
            dataIndex: "created_at",
            key: "createdAt",
            render: (createdAt: string) =>
                new Date(createdAt).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                }),
        },
        {
            title: "Lease Status",
            dataIndex: "lease_status",
            key: "leaseStatus",
            render: (status: { Lease_Status: string; valid: boolean }) => status?.Lease_Status || "Draft",
        },
        {
            title: "Lease Start",
            dataIndex: "lease_start_date",
            key: "leaseStart",
            render: (date: string | null) => date ?? "N/A",
        },
        {
            title: "Lease End",
            dataIndex: "lease_end_date",
            key: "leaseEnd",
            render: (date: string | null) => date ?? "N/A",
        },
        {
            title: "Actions",
            key: "actions",
            fixed: "right",
            render: (record: User) => (
                <div className="flex flex-column gap-2">
                    {/* View Tenant Complaints */}
                    {/* View Tenant Work Orders */}
                    <ActionMenu
                        key={record.id}
                        tenantClerkId={record.clerk_id}
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

    return (
        <div className="container">
            {/* <h1 className="p-3">View or Add Tenants</h1> */}
            <PageTitleComponent title="Manage Tenants" />
            <div className="mb-3 flex">
                <InviteUserModal />
            </div>
            <TableComponent
                columns={columns}
                dataSource={tenants}
                onChange={() => {}}
            />
        </div>
    );
};

export default AddTenant;

interface ActionsDropdownProps {
    tenantClerkId: string;
}

function ActionMenu(props: ActionsDropdownProps) {
    const items: MenuProps["items"] = [
        {
            key: "1",
            label: <TenantComplaintModal tenantClerkId={props.tenantClerkId} />,
        },
        {
            key: "2",
            label: <TenantWorkOrderModal tenantClerkId={props.tenantClerkId} />,
        },
        {
            key: "3",
            label: <TenantDeleteModal tenantClerkId={props.tenantClerkId} />,
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

function InviteUserModal() {
    const queryClient = useQueryClient();
    const { getToken } = useAuth();
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const [tenantInviteForm] = Form.useForm<InviteTenant>();

    const [inviteStatus, setInviteStatus] = useState<InviteStatusNotification>({
        show: false,
        message: "",
        type: "default",
    });
    const { mutate: inviteTenant, isPending } = useMutation({
        mutationKey: ["inviteTenant"],
        mutationFn: async () => {
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_TABLE] Error unauthorized");
            }

            if (!tenantInviteForm.getFieldValue("email")) {
                throw new Error("[TENANT_TABLE] Error tenant email invalid");
            }

            const res = await fetch(`http://localhost:8080/admin/tenants/invite`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(tenantInviteForm.getFieldsValue()),
            });
            if (!res.ok) {
                throw new Error("[TENANT_TABLE] Error request failed");
            }
            return;
        },
        onSuccess: () => {
            setInviteStatus({
                show: true,
                message: "Successfully invited tenant",
                type: "success",
            });
            tenantInviteForm.resetFields();
            queryClient.invalidateQueries({
                queryKey: ["tenants"],
            });
        },
        onError: () => {
            setInviteStatus({
                show: true,
                message: "Oops try again another time",
                type: "error",
            });
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

    useEffect(() => {
        const timer = setTimeout(() => {
            setInviteStatus((prev) => ({ ...prev, show: false }));
        }, 3000);

        return () => clearTimeout(timer);
    }, [inviteStatus.show]);

    return (
        <>
            <Button
                type="primary"
                onClick={showModal}>
                <PlusOutlined />
                Invite Tenant
            </Button>
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3>Invite Tenant</h3>}
                open={internalModalOpen}
                okText="Invite"
                onOk={tenantInviteForm.submit}
                onCancel={handleCancel}
                okButtonProps={{ disabled: isPending ? true : false }}
                // cancelButtonProps={{ hidden: true, disabled: true }}
            >
                <Divider />
                <Form
                    form={tenantInviteForm}
                    onFinish={() => {
                        inviteTenant();
                    }}
                    initialValues={{ email: "", unitNumber: 0 }}
                    className="">
                    <p>Tenant Email</p>
                    <Form.Item
                        name="email"
                        rules={[{ required: true, message: "Please provide a valid email" }, { type: "email" }, { min: 5 }, { max: 255 }]}>
                        <Input
                            prefix={<MailOutlined />}
                            placeholder="Tenant Email"
                            value={tenantInviteForm.getFieldValue("email")}
                            onChange={(e) => {
                                tenantInviteForm.setFieldValue("email", e.target.value);
                            }}
                        />
                    </Form.Item>
                    {inviteStatus.show ? (
                        <div className="d-flex align-items-center">
                            {inviteStatus.type === "success" ? <CheckOutlined className="text-success fs-6 mb-3 mx-1" /> : <CloseCircleOutlined className="text-danger fs-6 mb-3 mx-1" />}
                            <p className={`fs-6 ${inviteStatus.type === "success" ? "text-success" : "text-danger"}`}>{inviteStatus.message}</p>
                        </div>
                    ) : (
                        <p style={{ minHeight: "16px" }}></p>
                    )}
                </Form>
            </Modal>
        </>
    );
}

interface TenantModalProps {
    tenantClerkId: string;
}
function TenantWorkOrderModal(props: TenantModalProps) {
    const { getToken } = useAuth();
    const [internalModalOpen, setInternalModalOpen] = useState(false);

    const { data } = useQuery({
        queryKey: [`${props.tenantClerkId}-work-orders`],
        queryFn: async () => {
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_TABLE] Error unauthorized");
            }

            if (!props.tenantClerkId) {
                throw new Error("[TENANT_TABLE] Invalid tenant Clerk Id");
            }

            const res = await fetch(`http://localhost:8080/admin/tenants/${props.tenantClerkId}/work_orders`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
            });
            if (!res.ok) {
                throw new Error("[TENANT_TABLE] Error request failed");
            }

            return (await res.json()) as WorkOrderData[];
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
            <div onClick={showModal}>Work Orders</div>
            <Modal
                className="p-3"
                title={<h3>Tenant Work Orders</h3>}
                open={internalModalOpen}
                onCancel={handleCancel}
                okButtonProps={{ hidden: true, disabled: true }}
                cancelButtonProps={{ hidden: true, disabled: true }}>
                <div>
                    {data?.length ? (
                        <div
                            className="space-y-4 d-flex flex-column"
                            style={{ maxHeight: "600px", overflowY: "auto" }}>
                            {data.map((order, idx) => (
                                <div
                                    key={idx}
                                    className="p-3 border rounded my-1 shadow-md bg-white d-flex flex-column">
                                    <span className="d-flex flex-column">
                                        <p className="fs-6">Title</p>
                                        <p>{order.title}</p>
                                    </span>
                                    <div className="d-flex align-items-center">
                                        <span className="d-flex align-items-center me-5">
                                            <p className="fs-6 me-1">Category</p>
                                            <p className="text-success">{order.category}</p>
                                        </span>
                                        <span className="d-flex align-items-center ms-1">
                                            <p className="fs-6 me-1">Status</p>
                                            <p className="text-success">{order.status}</p>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-body-seconday">No work orders...</p>
                    )}
                </div>
            </Modal>
        </>
    );
}

function TenantComplaintModal(props: TenantModalProps) {
    const { getToken } = useAuth();
    const [internalModalOpen, setInternalModalOpen] = useState(false);

    const { data } = useQuery({
        queryKey: [`${props.tenantClerkId}-complaints`],
        queryFn: async () => {
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_TABLE] Error unauthorized");
            }

            if (!props.tenantClerkId) {
                throw new Error("[TENANT_TABLE] Invalid tenant Clerk Id");
            }

            const res = await fetch(`http://localhost:8080/admin/tenants/${props.tenantClerkId}/complaints`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
            });
            if (!res.ok) {
                throw new Error("[TENANT_TABLE] Error request failed");
            }

            return (await res.json()) as ComplaintsData[];
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
            <div onClick={showModal}>Complaints</div>
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3>Tenant Complaints</h3>}
                open={internalModalOpen}
                onCancel={handleCancel}
                okButtonProps={{ hidden: true, disabled: true }}
                cancelButtonProps={{ hidden: true, disabled: true }}>
                <div>
                    {data?.length ? (
                        <div
                            className="space-y-3 d-flex flex-column"
                            style={{ maxHeight: "600px", overflowY: "auto" }}>
                            {data.map((order, idx) => (
                                <div
                                    key={idx}
                                    className="p-3 border rounded shadow-sm bg-white d-flex flex-column">
                                    <div className="mb-2">
                                        <p className="fs-6 fw-semibold mb-1">Title</p>
                                        <p className="mb-0">{order.title}</p>
                                    </div>

                                    <div className="d-flex align-items-center">
                                        <div className="d-flex align-items-center me-4">
                                            <p className="fs-6 fw-semibold mb-0 me-1">Category:</p>
                                            <p className="text-success mb-0">{order.category}</p>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <p className="fs-6 fw-semibold mb-0 me-1">Status:</p>
                                            <p className="text-success mb-0">{order.status}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-body-seconday">No complaints....</p>
                    )}
                </div>
            </Modal>
        </>
    );
}

function TenantDeleteModal(props: TenantModalProps) {
    const queryClient = useQueryClient();
    const { getToken } = useAuth();
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const showModal = () => {
        setInternalModalOpen(true);
    };

    const { mutate: deleteTenant, isPending } = useMutation({
        mutationKey: [`${props.tenantClerkId}-delete`],
        mutationFn: async () => {
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_TABLE] Error unauthorized");
            }

            if (!props.tenantClerkId) {
                throw new Error("[TENANT_TABLE] Invalid tenant Clerk Id");
            }

            const res = await fetch(`http://localhost:8080/admin/tenants/${props.tenantClerkId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
            });
            if (!res.ok) {
                throw new Error("[TENANT_TABLE] Error deleting tenant failed");
            }

            return (await res.json()) as ComplaintsData[];
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["tenants"],
            });
            handleCancel();
        },
        onError: () => {},
    });

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
            <div onClick={showModal}>Delete</div>
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3>Are you absolutely sure?</h3>}
                open={internalModalOpen}
                onOk={() => deleteTenant()}
                okText="Delete"
                okType="danger"
                onCancel={handleCancel}
                okButtonProps={{ disabled: isPending ? true : false }}
                // cancelButtonProps={{ hidden: true, disabled: true }}
            >
                <p>This action cannot be undone. This will permanently delete this account and remove this data from our servers.</p>
            </Modal>
        </>
    );
}
