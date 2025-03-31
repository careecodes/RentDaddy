import { ToolOutlined, WarningOutlined, InboxOutlined, CarOutlined, KeyOutlined as KeyIcon } from "@ant-design/icons";
import { Divider, Form, Input, Select } from "antd";
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

import {
    ComplaintsData,
    Parking,
    ParkingEntry,
    TenantLeaseStatusAndURL,
    WorkOrderData,
    ComplaintEntry
} from "../types/types";

const isDevelopment = import.meta.env.MODE === 'development';
const absoluteServerUrl = isDevelopment
    ? import.meta.env.VITE_SERVER_URL
    : '/api';

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

    if (isError) {
        return <div>Error fetching lease information. Please try again later.</div>;
    }
    return (
        <div className="container">
            <PageTitleComponent title="Tenant Dashboard" />
            <AlertComponent
                title=""
                message="Welcome to the Tenant Dashboard"
                description="Sign Yo Lease. Pay Daddy Rent"
                type="warning"
            />

            {/* Dashboard Statistics Cards */}
            <h2 className="my-3 p-3 text-center">Quick Actions</h2>
            <div className="flex-container my-3">
                <CardComponent
                    title="Complaints"
                    value={complaints.data?.length ?? 0}
                    description="Something not working right or disturbing you? Let us know."
                    hoverable={true}
                    icon={<ToolOutlined className="icon" />}
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
                    value={parking.data?.length ?? 0}
                    description="Got a guest coming to visit? Make sure they have spots to park"
                    hoverable={true}
                    icon={<CarOutlined className="icon" />}
                    button={<TenantParkingPermitModal userParkingPermitsUsed={parking.data?.length ?? 0} />}
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
                    value={workOrders.data?.length}
                    button={<TenantViewWorkOrdersModal data={workOrders.data} />}
                />
                <CardComponent
                    title="Complaints"
                    description={"View your complaints here."}
                    hoverable={true}
                    value={complaints.data?.length}
                    button={<TenantViewComplaintsModal data={complaints.data} />}
                />

                <MyChatBot />
            </div>

            {/* Inescapable Modal for lease signing */}
            {isSigningModalVisible && (
                <ModalComponent
                    buttonTitle="" // No button title since we're controlling visibility externally
                    buttonType="primary"
                    modalTitle="Action Required: Lease Signing"
                    type="default"
                    content={
                        <div className="text-center">
                            <WarningOutlined className="warning-icon" />
                            <h3 className="lease-modal-title">Your Lease Requires Attention</h3>
                            <p>
                                Your lease status is <strong>{leaseData?.status === "pending_approval" ? "Pending Approval" : leaseData?.status}</strong>.
                            </p>
                            <p>You must sign your lease to continue using the tenant portal.</p>
                            <p className="lease-modal-note">This action is required and cannot be dismissed.</p>
                        </div>
                    }
                    handleOkay={async () => handleOk()}
                    isModalOpen={isSigningModalVisible}
                    onCancel={() => { }} // Empty function to prevent closing
                    setUserId={() => { }} // Required by ModalComponent but not used here
                    setAccessCode={() => { }} // Required by ModalComponent but not used here
                    selectedUserId=""
                    accessCode=""
                />
            )}
        </div>
    );
};

interface ParkingPermitModalProps {
    userParkingPermitsUsed: number;
}

function TenantParkingPermitModal(props: ParkingPermitModalProps) {
    const queryClient = useQueryClient();
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const { userId, getToken } = useAuth();
    const [parkingPermitForm] = Form.useForm<ParkingEntry>();

    const { mutate: createParkingPermit, isPending: isParkingPending } = useMutation({
        mutationKey: [`${userId}-create-parking`],
        mutationFn: async () => {
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_DASHBOARD] Error unauthorized");
            }

            // Transform form values to match the ParkingEntry interface
            const formValues = parkingPermitForm.getFieldsValue();
            const parkingData: ParkingEntry = {
                created_by: userId ? parseInt(userId) : 0,
                car_color: formValues["car_color"] || "",
                car_make: formValues["car_make"] || "",
                license_plate: formValues["license_plate"] || ""
            };

            const res = await fetch(`${absoluteServerUrl}/tenant/parking`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(parkingData),
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
        setInternalModalOpen(false);
    };

    return (
        <>
            <ButtonComponent
                title="Add Guest Parking"
                type="primary"
                onClick={showModal}
                disabled={props.userParkingPermitsUsed >= 2 ? true : false}
            />
            <ModalComponent
                buttonTitle="Add Guest Parking"
                buttonType="primary"
                modalTitle="Guest Parking Permit"
                type="Guest Parking"
                content={
                    <Form form={parkingPermitForm}>
                        {/* Add a loading indicator when the form is submitting */}
                        {isParkingPending && (
                            <div className="text-center mb-3">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p>Creating parking permit...</p>
                            </div>
                        )}
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
                            <Input placeholder="Car Make" type="text" />
                        </Form.Item>
                        <p className="fs-6">License Plate</p>
                        <Form.Item
                            name="license-plate-number"
                            rules={[{ required: true, message: "Enter guest's license plate", type: "string" }]}>
                            <Input placeholder="3ha3-3213" />
                        </Form.Item>
                    </Form>
                }
                handleOkay={async () => {
                    createParkingPermit();
                    return Promise.resolve();
                }}
                setUserId={() => { }}
                setAccessCode={() => { }}
                selectedUserId=""
                accessCode=""
                isModalOpen={internalModalOpen}
                onCancel={handleCancel}
            />
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
                title="View Work Orders"
                type="primary"
                onClick={showModal}
            />
            <ModalComponent
                buttonTitle="View Work Orders"
                buttonType="primary"
                modalTitle="Work Orders"
                type="default"
                content={
                    <div className="modal-scroll-container">
                        {props.data ? (
                            <>
                                {props.data.map((order, idx) => (
                                    <div
                                        key={idx}
                                        className="flex gap-2 mb-2 mt-2 border-b-2 pb-2 border-gray-300">
                                        <p>{order.title}</p>
                                        <p>
                                            Category: <span className="text-success">{order.category}</span>
                                        </p>
                                        <p>
                                            Status: <span className="text-success">{order.status}</span>
                                        </p>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <p>No work orders found.</p>
                        )}
                    </div>
                }
                handleOkay={async () => Promise.resolve()}
                setUserId={() => { }}
                setAccessCode={() => { }}
                selectedUserId=""
                accessCode=""
                isModalOpen={internalModalOpen}
                onCancel={handleCancel}
            />
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
            <ModalComponent
                buttonTitle="View Complaints"
                buttonType="primary"
                modalTitle="Complaints"
                type="default"
                content={
                    <div className="modal-scroll-container">
                        {props.data ? (
                            <>
                                {props.data.map((order, idx) => (
                                    <div
                                        key={idx}
                                        className="flex gap-2 mb-2 mt-2 border-b-2 pb-2 border-gray-300">
                                        <p>{order.title}</p>
                                        <p>
                                            Category: <span className="text-success">{order.category}</span>
                                        </p>
                                        <p>
                                            Status: <span className="text-success">{order.status}</span>
                                        </p>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <p>No complaints found.</p>
                        )}
                    </div>
                }
                handleOkay={async () => Promise.resolve()}
                setUserId={() => { }}
                setAccessCode={() => { }}
                selectedUserId=""
                accessCode=""
                isModalOpen={internalModalOpen}
                onCancel={handleCancel}
            />
        </>
    );
}

function TenantCreateComplaintsModal() {
    const queryClient = useQueryClient();
    const { getToken, userId } = useAuth();
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const [complaintForm] = Form.useForm<ComplaintEntry>();
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

            // Transform form values to match the ComplaintEntry interface
            const formValues = complaintForm.getFieldsValue();
            const complaintData: ComplaintEntry = {
                title: formValues.title,
                description: formValues.description,
                category: formValues.category,
                unit_number: 0 // This should be obtained from user profile or the form
            };

            const res = await fetch(`${absoluteServerUrl}/tenant/complaints`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(complaintData),
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
            <ModalComponent
                buttonTitle="Create Complaint"
                buttonType="primary"
                modalTitle="Create Complaint"
                type="default"
                content={
                    <>
                        <p>Enter information about a complaint that you're having here.</p>
                        <Divider />
                        {/* Add loading indicator when the complaint is being submitted */}
                        {isPendingComplaint && (
                            <div className="text-center mb-3">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p>Submitting complaint...</p>
                            </div>
                        )}
                        <Form form={complaintForm}>
                            <p className="fs-7">Title</p>
                            <Form.Item
                                name="title"
                                rules={[{ required: true, type: "string", min: 3, max: 50 }]}>
                                <Input placeholder="Enter a title" type="text" />
                            </Form.Item>
                            <p className="fs-7">Description</p>
                            <Form.Item
                                name="description"
                                rules={[{ required: true, type: "string", min: 5, max: 500 }]}>
                                <Input.TextArea placeholder="Enter a brief description for complaint" rows={4} />
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
                    </>
                }
                handleOkay={async () => {
                    createComplaint();
                    return Promise.resolve();
                }}
                setUserId={() => { }}
                setAccessCode={() => { }}
                selectedUserId=""
                accessCode=""
                isModalOpen={internalModalOpen}
                onCancel={handleCancel}
            />
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
            const res = await fetch(`${absoluteServerUrl}/tenant/lockers/unlock`, {
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
            <ModalComponent
                buttonTitle="Open Locker"
                buttonType="primary"
                modalTitle="Locker Notification"
                type="Unlock Locker"
                content={
                    <span className="d-flex align-items-center text-success">
                        <KeyIcon className="mb-3 me-1" size={24} color="currentColor" />
                        <p className="fs-5">Locker is open!</p>
                    </span>
                }
                handleOkay={async () => Promise.resolve()}
                setUserId={() => { }}
                setAccessCode={() => { }}
                selectedUserId=""
                accessCode=""
                isModalOpen={internalModalOpen}
                onCancel={handleCancel}
            />
        </>
    );
}