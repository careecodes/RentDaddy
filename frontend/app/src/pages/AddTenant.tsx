import { useMutation, useQuery } from "@tanstack/react-query";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import TableComponent from "../components/reusableComponents/TableComponent";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react-router";
import { Button, Divider, Dropdown, Form, Input, MenuProps, Modal } from "antd";
import { CheckOutlined, CloseCircleOutlined, MailOutlined, NumberOutlined, PlusOutlined } from "@ant-design/icons";
import { ComplaintsData, User, WorkOrderData } from "../types/types";
import { ColumnsType } from "antd/es/table";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const PORT = import.meta.env.VITE_PORT;
const API_URL = `${SERVER_URL}:${PORT}`.replace(/\/$/, ""); // :white_check_mark: Remove trailing slashes

// type InviteTenant = {
//     email: string;
//     unitNumber: number;
//     management_id: string;
// };
type InviteTenant = {
    email: string;
    unitNumber: number; //TODO: this is no longer needed
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

            return (await res.json()) as User[];
        },
    });

    // Mock data for tenant table
    const columns: ColumnsType<User> = [
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
                new Date(createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                }),
        },
        // {
        //     title: "Lease Status",
        //     dataIndex: "leaseStatus",
        //     key: "leaseStatus",
        // },
        // {
        //     title: "Lease Start",
        //     dataIndex: "leaseStart",
        //     key: "leaseStart",
        // },
        // {
        //     title: "Lease End",
        //     dataIndex: "leaseEnd",
        //     key: "leaseEnd",
        // },
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
            <PageTitleComponent title="View or Add Tenants" />
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

            if (!tenantInviteForm.getFieldValue("email") || !tenantInviteForm.getFieldValue("unitNumber")) {
                throw new Error("[TENANT_TABLE] Error ivnite schema invalid");
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
                    <p>Tenant Unit Number</p>
                    <Form.Item name="unitNumber">
                        <Input
                            prefix={<NumberOutlined />}
                            placeholder="Unit Number"
                            type="number"
                            value={tenantInviteForm.getFieldValue("unitNumber")}
                            onChange={(e) => {
                                tenantInviteForm.setFieldValue("unitNumber", e.target.valueAsNumber);
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

interface TenantWorkOrderProps {
    tenantClerkId: string;
}
function TenantWorkOrderModal(props: TenantWorkOrderProps) {
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
                className="p-3 flex-wrap-row"
                title={<h3>Tenant Work Orders</h3>}
                open={internalModalOpen}
                onCancel={handleCancel}
                okButtonProps={{ hidden: true, disabled: true }}
                cancelButtonProps={{ hidden: true, disabled: true }}>
                <div>
                    {data ? (
                        <>
                            {data.map((order, idx) => (
                                <div
                                    key={idx}
                                    className="flex gap-2 mb-2 mt-2 border-b-2 pb-2 border-gray-300">
                                    {/* Title */}
                                    <p>{order.title}</p>
                                    {/* Category */}
                                    <p>
                                        Category: <span style={{ color: "green" }}>{order.category}</span>
                                    </p>
                                    {/* Status */}
                                    <p>
                                        Status: <span style={{ color: "green" }}>{order.status}</span>
                                    </p>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p>No work orders....</p>
                    )}
                </div>
            </Modal>
        </>
    );
}

interface TenantComplaintProps {
    tenantClerkId: string;
}
function TenantComplaintModal(props: TenantComplaintProps) {
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
                    {data ? (
                        <>
                            {data.map((order, idx) => (
                                <div
                                    key={idx}
                                    className="flex gap-2 mb-2 mt-2 border-b-2 pb-2 border-gray-300">
                                    {/* Title */}
                                    <p>{order.title}</p>
                                    {/* Category */}
                                    <p>
                                        Category: <span style={{ color: "green" }}>{order.category}</span>
                                    </p>
                                    {/* Status */}
                                    <p>
                                        Status: <span style={{ color: "green" }}>{order.status}</span>
                                    </p>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p>No complaints....</p>
                    )}
                </div>
            </Modal>
        </>
    );
}
