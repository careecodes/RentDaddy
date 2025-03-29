import Icon, { ToolOutlined, WarningOutlined, InboxOutlined, CalendarOutlined, UserOutlined, CarOutlined } from "@ant-design/icons";
import { Link } from "react-router";
import { Modal, Button, Divider, Form, Input, Select } from "antd";
import { useState, useEffect } from "react";
import ModalComponent from "../components/ModalComponent";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import { CardComponent } from "../components/reusableComponents/CardComponent";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import MyChatBot from "../components/ChatBot";
import { useAuth } from "@clerk/react-router";
import LeaseCard from "../components/LeaseCardComponent";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { ComplaintsData, Parking, ParkingEntry, TenantLeaseStatusAndURL, WorkOrderData } from "../types/types";

const serverUrl = import.meta.env.VITE_SERVER_URL;
const absoluteServerUrl = `${serverUrl}`;

export const TenantDashBoard = () => {
    const [isSigningModalVisible, setSigningModalVisible] = useState(false);
    const { getToken, userId } = useAuth();

    async function getParkingPermit() {
        const authToken = await getToken();
        if (!authToken) {
            throw new Error("[TENANT_DASHBOARD] Error unauthorized");
        }
        const res = await fetch(`${absoluteServerUrl}/tenant/parking`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
        });

        if (!res.ok) {
            throw new Error("[TENANT_DASHBOARD] Error parking_permits request failed");
        }


        const permits = (await res.json()) as Parking[];
        console.log("Parking permits:", permits);
        return permits;
    }

    async function getComplaints() {
        const authToken = await getToken();
        if (!authToken) {
            throw new Error("[TENANT_DASHBOARD] Error unauthorized");
        }
        const res = await fetch(`${absoluteServerUrl}/tenant/complaints`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
        });

        if (!res.ok) {
            throw new Error("[TENANT_DASHBOARD] Error complaints request failed");
        }
        return (await res.json()) as ComplaintsData[];
    }

    async function getWorkOrders() {
        const authToken = await getToken();
        if (!authToken) {
            throw new Error("[TENANT_DASHBOARD] Error unauthorized");
        }
        const res = await fetch(`${absoluteServerUrl}/tenant/work_orders`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
        });

        if (!res.ok) {
            throw new Error("[TENANT_DASHBOARD] Error complaints request failed");
        }
        return (await res.json()) as WorkOrderData[];
    }

    async function getLockers() {
        const authToken = await getToken();
        if (!authToken) {
            throw new Error("[TENANT_DASHBOARD] Error unauthorized");
        }
        const res = await fetch(`${absoluteServerUrl}/tenant/lockers`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
        });

        if (!res.ok) {
            throw new Error("[TENANT_DASHBOARD] Error complaints request failed");
        }
        return (await res.json()) as ComplaintsData[];
    }

    const [complaints, workOrders, lockers, parking] = useQueries({
        queries: [
            { queryKey: [`${userId}-complaints`], queryFn: getComplaints },
            { queryKey: [`${userId}-work-orders`], queryFn: getWorkOrders },
            { queryKey: [`${userId}-lockers`], queryFn: getLockers },
            { queryKey: [`${userId}-parking`], queryFn: getParkingPermit },
        ],
    });

    // Fetch lease status using TanStack Query
    const { data: leaseData, isLoading, isError } = useQuery({
        queryKey: ["leaseStatus", userId], // Unique key for the query
        queryFn: async () => {
            if (!userId) {
                console.log("`userId` variable is not populated");
                return null;
            }
            const response = await fetch(` ${absoluteServerUrl}/tenant/leases/${userId}/signing-url`);
            if (!response.ok) {
                return null;
            }

            // If empty, return null so tenant dashboard can still load
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                return null;
            }

            const leaseData: TenantLeaseStatusAndURL | null = await response.json();
            return leaseData;
        },
        enabled: !!userId,
    });

    // This is the recommended approach in newer versions of TanStack Query. `onSuccess` is deprecated
    useEffect(() => {
        if (leaseData && leaseData.status) {
            console.log("Lease status updated:", leaseData.status);
            if (["pending_approval", "terminated", "expired"].includes(leaseData.status)) {
                console.log("Setting modal visible based on lease status");
                setSigningModalVisible(true);
            }
        }
    }, [leaseData]);

    // This is used to redirect to signing URL when button is clicked
    const handleOk = () => {
        if (leaseData && leaseData.url) {
            window.location.href = leaseData.url;
        } else {
            console.error("No signing URL available");
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container">
            {/* <h1 className="my-4">Tenant Dashboard</h1> */}
            <PageTitleComponent title="Tenant Dashboard" />
            {/* <div className="alert-container"> */}
            <AlertComponent
                title=""
                message="Welcome to the Tenant Dashboard"
                description="Sign Yo Lease. Pay Daddy Rent"
                type="warning"
            />
            {/* </div> */}

            {/* Dashboard Statistics Cards */}
            <h2 className="my-3 p-3 text-center">Quick Actions</h2>
            <div className="flex-container my-3">
                <CardComponent
                    title="Complaints"
                    value={complaints.data?.length ?? 0}
                    description="Something not working right or disturbing you? Let us know."
                    hoverable={true}
                    icon={<ToolOutlined className="icon" />}
                    button={
                        <Link to="/tenant/tenant-work-orders-and-complaints">
                            <ButtonComponent
                                title="View All"
                                type="primary"
                                onClick={() => { }}
                            />
                        </Link>
                    }
                    button={<TenantCreateComplaintsModal />}
                />
                <CardComponent
                    title="Package info"
                    value={lockers.data?.length ?? 0}
                    description={`${lockers.data?.length ? "You have a package. Click the button at your locker to open it." : "When package arrives you will be notified here."}`}
                    hoverable={true}
                    icon={<InboxOutlined className="icon" />}
                    button={<TenantOpenLockerModal numberOfPackages={lockers.data?.length ?? 0} />}
                />
                <CardComponent
                    title="Guest Parking"
                    value={parking.data?.length ?? `0/2`}
                    description="Got a guest coming to visit? Make sure they have spots to park"
                    hoverable={true}
                    icon={<CarOutlined className="icon" />}
                    button={
                        <ModalComponent
                            type="Guest Parking"
                            buttonTitle="Add Guest"
                            content="Add guest to be able to park in the complex"
                            buttonType="primary"
                            handleOkay={() => { }}
                        />
                    }
                    button={<TenantParkingPeritModal userParkingPermitsUsed={parking.data?.length ?? 0} />}
                />
            </div>

            {/* Quick Access Documents Section */}
            <h2 className="my-3 p-3 text-center">Quick Access Documents Section</h2>
            <div className="flex-container mb-3">
                <LeaseCard />
                <CardComponent
                    title="Work Orders"
                    description={"View your work orders here."}
                    hoverable={true}
                    button={
                        <Link to="/tenant/tenant-work-orders-and-complaints">
                            <ButtonComponent
                                title="View all workorders"
                                type="primary"
                                onClick={() => { }}
                            />
                        </Link>
                    }
                    value={workOrders.data?.length}
                    button={<TenantViewWorkOrdersModal data={workOrders.data} />}
                />
                <CardComponent
                    title="Complaints"
                    description={"View your complaints here."}
                    hoverable={true}
                    button={
                        <ModalComponent
                            type="default"
                            buttonTitle="View all complaints"
                            content="Complaint should go here"
                            buttonType="primary"
                            handleOkay={() => { }}
                        />
                    }
                    value={complaints.data?.length}
                    button={<TenantViewComplaintsModal data={complaints.data} />}
                />

                <MyChatBot />
            </div>

            {/* Inescapable Modal for lease signing */}
            <Modal
                title="Action Required: Lease Signing"
                open={isSigningModalVisible}
                onOk={handleOk}
                onCancel={() => { }} // Empty function prevents closing
                maskClosable={false} // Prevents closing when clicking outside
                keyboard={false} // Prevents closing with ESC key
                closable={false} // Removes the X button
                footer={[
                    <Button
                        key="submit"
                        type="primary"
                        onClick={handleOk}>
                        Sign Lease Now
                    </Button>,
                ]}>
                <div style={{ textAlign: "center" }}>
                    <WarningOutlined style={{ fontSize: "4rem", color: "#faad14", marginBottom: "1rem" }} />
                    <h3 style={{ marginBottom: "1rem" }}>Your Lease Requires Attention</h3>
                    <p>
                        Your lease status is <strong>{leaseData?.status === "pending_approval" ? "Pending Approval" : leaseData?.status}</strong>.
                    </p>
                    <p>You must sign your lease to continue using the tenant portal.</p>
                    <p style={{ marginTop: "1rem", fontStyle: "italic" }}>This action is required and cannot be dismissed.</p>
                </div>
            </Modal>
        </div>
    );
};

interface ParkingPermitModalProps {
    userParkingPermitsUsed: number;
}

function TenantParkingPeritModal(props: ParkingPermitModalProps) {
    const queryClient = useQueryClient();
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const { userId, getToken } = useAuth();
    const [parkingPermitForm] = Form.useForm<ParkingEntry>();
    console.log(`FORM VALUES: ${JSON.stringify(parkingPermitForm.getFieldsValue())}`);
    const { mutate: createParkingPermit, isPending: isParkingPending } = useMutation({
        mutationKey: [`${userId}-create-parking`],
        mutationFn: async () => {
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_DASHBOARD] Error unauthorized");
            }

            // console.log(`FORM VALUES: ${JSON.stringify(parkingPermitForm.getFieldsValue())}`);
            const res = await fetch(`${absoluteServerUrl}/tenant/parking`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(parkingPermitForm.getFieldsValue()),
            });

            if (!res.ok) {
                throw new Error("[TENANT_DASHBOARD] Error creating parking_permit");
            }
            return;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [`${userId}-parking`],
            });
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
            <ButtonComponent
                title="Add Guest Parking"
                type="primary"
                onClick={showModal}
                disabled={props.userParkingPermitsUsed >= 2 ? true : false}
            />
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3>Guest Parking Permit</h3>}
                open={internalModalOpen}
                onOk={() => {
                    createParkingPermit();
                }}
                okText={"Create"}
                onCancel={handleCancel}
                okButtonProps={{ disabled: isParkingPending ? true : false }}
                cancelButtonProps={{ disabled: isParkingPending ? true : false }}>
                <Divider />
                <Form form={parkingPermitForm}>
                    <p className="fs-6">Guest Name</p>
                    <Form.Item
                        name="name"
                        rules={[{ required: true, message: "Please enter a guest name", type: "string" }]}>
                        <Input placeholder="John Doe" />
                    </Form.Item>
                    <p className="fs-6">Car Color</p>
                    <Form.Item
                        name="car-color"
                        rules={[{ required: true, message: "Enter guest's car color", type: "string" }]}>
                        <Input placeholder="Blue" />
                    </Form.Item>
                    <p className="fs-6">Car Model</p>
                    <Form.Item
                        name="car-model"
                        rules={[{ required: true, message: "Enter guest's car model", type: "string" }]}>
                        <Input
                            placeholder="Car Make"
                            type="text"
                        />
                    </Form.Item>
                    <p className="fs-6">License Plate</p>
                    <Form.Item
                        name="license-plate-number"
                        rules={[{ required: true, message: "Enter guest's license plate", type: "string" }]}>
                        <Input placeholder="3ha3-3213" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}

interface WorkOrderModalProps {
    data: WorkOrderData[] | undefined;
}

function TenantViewWorkOrdersModal(props: WorkOrderModalProps) {
    const [internalModalOpen, setInternalModalOpen] = useState(false);
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
            <ButtonComponent
                title="View Complaints"
                type="primary"
                onClick={showModal}
            />
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3>Complaints</h3>}
                open={internalModalOpen}
                onOk={() => { }}
                onCancel={handleCancel}
                okButtonProps={{ hidden: true, disabled: true }}
                cancelButtonProps={{ hidden: true, disabled: true }}>
                <Divider />
                <div style={{ overflowY: "auto", height: "200px" }}>
                    {props.data ? (
                        <>
                            {props.data.map((order, idx) => (
                                <div
                                    key={idx}
                                    className="flex gap-2 mb-2 mt-2 border-b-2 pb-2 border-gray-300">
                                    <p>{order.title}</p>
                                    <p>
                                        Category: <span style={{ color: "green" }}>{order.category}</span>
                                    </p>
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

interface ComplaintModalProps {
    data: ComplaintsData[] | undefined;
}

function TenantViewComplaintsModal(props: ComplaintModalProps) {
    const [internalModalOpen, setInternalModalOpen] = useState(false);
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
            <ButtonComponent
                title="View Complaints"
                type="primary"
                onClick={showModal}
            />
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3>Complaints</h3>}
                open={internalModalOpen}
                onCancel={handleCancel}
                okButtonProps={{ hidden: true, disabled: true }}
                cancelButtonProps={{ hidden: true, disabled: true }}>
                <Divider />
                <div style={{ overflowY: "auto", height: "200px" }}>
                    {props.data ? (
                        <>
                            {props.data.map((order, idx) => (
                                <div
                                    key={idx}
                                    className="flex gap-2 mb-2 mt-2 border-b-2 pb-2 border-gray-300">
                                    <p>{order.title}</p>
                                    <p>
                                        Category: <span style={{ color: "green" }}>{order.category}</span>
                                    </p>
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
function TenantCreateComplaintsModal() {
    const queryClient = useQueryClient();
    const { getToken, userId } = useAuth();
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const [complaintForm] = Form.useForm<ComplaintsData>();
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

    const { mutate: createComplaint, isPending: isPendingComplaint } = useMutation({
        mutationKey: [`${userId}-create-complaint`],
        mutationFn: async () => {
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_DASHBOARD] Error unauthorized");
            }

            // console.log(`COMPLAINT FORM: ${JSON.stringify(complaintForm.getFieldsValue())}`);
            const res = await fetch(`${absoluteServerUrl}/tenant/complaints`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(complaintForm.getFieldsValue()),
            });

            if (!res.ok) {
                throw new Error("[TENANT_DASHBOARD] Error creating complaint");
            }
            return;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [`${userId}-complaints`],
            });
            handleCancel();
        },
    });
    return (
        <>
            <ButtonComponent
                type="primary"
                title="Create Complaint"
                onClick={showModal}
            />
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3>Complaints</h3>}
                open={internalModalOpen}
                onOk={() => {
                    createComplaint();
                }}
                okText={"Create"}
                onCancel={handleCancel}
                okButtonProps={{ disabled: isPendingComplaint ? true : false }}
                cancelButtonProps={{ disabled: isPendingComplaint ? true : false }}>
                <p>Enter information about a complaint that you're having here.</p>
                <Divider />
                <Form form={complaintForm}>
                    <p className="fs-7">Title</p>
                    <Form.Item
                        name="title"
                        rules={[{ required: true, type: "string", min: 3, max: 50 }]}>
                        <Input
                            placeholder="Enter a title"
                            type="text"
                        />
                    </Form.Item>
                    <p className="fs-7">Description</p>
                    <Form.Item
                        name="description"
                        rules={[{ required: true, type: "string", min: 5, max: 500 }]}>
                        <Input.TextArea
                            placeholder="Enter a breif description for complaint"
                            rows={4}
                        />
                    </Form.Item>
                    <p className="fs-7">Category</p>
                    <Form.Item
                        name="category"
                        rules={[{ required: true, type: "string" }]}>
                        <Select placeholder={"Select a category"}>
                            {["maintenance", "noise", "security", "parking", "neighbor", "trash", "internet", "lease", "natural_disaster", "other"].map((c) => (
                                <Select.Option key={c}>{c}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}

interface LockerModalProps {
    numberOfPackages: number;
}

function TenantOpenLockerModal(props: LockerModalProps) {
    const queryClient = useQueryClient();
    const { getToken, userId } = useAuth();
    const [internalModalOpen, setInternalModalOpen] = useState(false);
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
    const { mutate: openLocker } = useMutation({
        mutationKey: [`${userId}-locker`],
        mutationFn: async () => {
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_DASHBOARD] Error unauthorized");
            }
            const res = await fetch(`${absoluteServerUrl}/tenants/lockers/unlock`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
            });

            if (!res.ok) {
                throw new Error("[TENANT_DASHBOARD] Error opening locker");
            }
            return;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [`${userId}-lockers`],
            });
        },
    });

    useEffect(() => {
        if (internalModalOpen) {
            openLocker();
        }
    }, [internalModalOpen, setInternalModalOpen]);

    return (
        <>
            <ButtonComponent
                type="primary"
                title="Open Locker"
                onClick={showModal}
                disabled={props.numberOfPackages === 0 ? true : false}
            />
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3>Locker Notification</h3>}
                open={internalModalOpen}
                onCancel={handleCancel}
                okButtonProps={{ hidden: true, disabled: true }}
                cancelButtonProps={{ hidden: true, disabled: true }}>
                <Divider />
                <span className="d-flex align-items-center text-success">
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
                        className="lucide lucide-key-square-icon lucide-key-square mb-3 me-1">
                        <path d="M12.4 2.7a2.5 2.5 0 0 1 3.4 0l5.5 5.5a2.5 2.5 0 0 1 0 3.4l-3.7 3.7a2.5 2.5 0 0 1-3.4 0L8.7 9.8a2.5 2.5 0 0 1 0-3.4z" />
                        <path d="m14 7 3 3" />
                        <path d="m9.4 10.6-6.814 6.814A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814" />
                    </svg>
                    <p className="fs-5">Locker is open!</p>
                </span>
            </Modal>
        </>
    );
}
