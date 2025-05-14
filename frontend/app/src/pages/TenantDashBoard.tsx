import { InboxOutlined, CarOutlined, PaperClipOutlined } from "@ant-design/icons";
import { Modal, Button, Divider, Form, Input } from "antd";
import { useState, useEffect } from "react";
import LeaseCardComponent from "../components/LeaseCardComponent";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import { CardComponent } from "../components/reusableComponents/CardComponent";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import MyChatBot from "../components/ChatBot";
import { useAuth } from "@clerk/react-router";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { ComplaintsData, Parking, ParkingEntry, TenantLeaseStatusAndURL, WorkOrderData } from "../types/types";
import { toast } from "sonner";
import { SERVER_API_URL } from "../utils/apiConfig";

const absoluteServerUrl = SERVER_API_URL;

export const TenantDashBoard = () => {
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
    const { data: leaseData, isLoading: isLeaseLoading } = useQuery({
        queryKey: ["leaseStatus", userId], // Unique key for the query
        queryFn: async () => {
            if (!userId) {
                console.log("`userId` variable is not populated");
                return null;
            }
            const token = await getToken();
            const response = await fetch(`${absoluteServerUrl}/tenant/leases/${userId}/signing-url`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!response.ok) {
                console.error("Error fetching lease data:", response.statusText);
                return null;
            }

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                return null;
            }

            const data: TenantLeaseStatusAndURL = await response.json();
            return data;
        },
        enabled: !!userId,
    });

    // No need for modal state or effects here - LeaseCardComponent handles all lease status UI

    // Loading indicator for all data sources
    if (isLeaseLoading || complaints.isLoading || workOrders.isLoading || lockers.isLoading || parking.isLoading) {
        return <div>Loading dashboard data...</div>;
    }

    return (
        <div className="container">
            {/* <h1 className="my-4">Tenant Dashboard</h1> */}
            <PageTitleComponent title="Tenant Dashboard" />
            
            <AlertComponent
                title=""
                message="Welcome to the Tenant Dashboard"
                description="Manage your apartment and services"
                type="info"
            />

            {/* Dashboard Statistics Cards */}
            <h2 className="my-3 p-3 text-center">Quick Actions</h2>
            <div className="flex-container my-3">
                {/* <CardComponent
                    title="Complaints"
                    value={complaints.data?.length ?? 0}
                    description="Something not working right or disturbing you? Let us know."
                    hoverable={true}
                    icon={<ToolOutlined className="icon" />}
                    button={<TenantCreateComplaintsModal />}
                /> */}
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
                {/* LeaseCardComponent handles all lease status logic including blocking modals */}
                <LeaseCardComponent externalLeaseData={leaseData} />
                <CardComponent
                    title="Work Orders"
                    description={"View your work orders here."}
                    hoverable={true}
                    value={workOrders.data?.length}
                    icon={<PaperClipOutlined className="icon" />}
                    button={<TenantViewWorkOrdersModal data={workOrders.data} />}
                />
                <CardComponent
                    title="Complaints"
                    description={"View your complaints here."}
                    hoverable={true}
                    value={complaints.data?.length}
                    button={<TenantViewComplaintsModal data={complaints.data} />}
                />
            </div>

            <MyChatBot />
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
            return toast.success("Success", { description: "Created new parking permit" });
        },

        onError: () => {
            return toast.error("Oops", { description: "Something happned please try again another time." });
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
                title="View Work Orders"
                type="primary"
                onClick={showModal}
            />
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3>Work Orders</h3>}
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
// function TenantCreateComplaintsModal() {
//     const queryClient = useQueryClient();
//     const { getToken, userId } = useAuth();
//     const [internalModalOpen, setInternalModalOpen] = useState(false);
//     const [complaintForm] = Form.useForm<ComplaintsData>();
//     const showModal = () => {
//         setInternalModalOpen(true);
//     };
//     const handleCancel = () => {
//         if (internalModalOpen) {
//             setInternalModalOpen(false);
//         }
//         if (internalModalOpen === undefined) {
//             setInternalModalOpen(false);
//         }//     };

//     const { mutate: createComplaint, isPending: isPendingComplaint } = useMutation({
//         mutationKey: [`${userId}-create-complaint`],
//         mutationFn: async () => {
//             const authToken = await getToken();
//             if (!authToken) {
//                 throw new Error("[TENANT_DASHBOARD] Error unauthorized");
//             }

//             // console.log(`COMPLAINT FORM: ${JSON.stringify(complaintForm.getFieldsValue())}`);
//             const res = await fetch(`${absoluteServerUrl}/tenant/complaints`, {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${authToken}`,
//                 },
//                 body: JSON.stringify(complaintForm.getFieldsValue()),
//             });

//             if (!res.ok) {
//                 throw new Error("[TENANT_DASHBOARD] Error creating complaint");
//             }
//             return;
//         },
//         onSuccess: () => {
//             queryClient.invalidateQueries({
//                 queryKey: [`${userId}-complaints`],
//             });
//             handleCancel();
//             return toast.success("Success", { description: "Created new complaint" });
//         },

//         onError: () => {
//             return toast.error("Oops", { description: "Something happned please try again another time." });
//         },
//     });
//     return (
//         <>
//             <ButtonComponent
//                 type="primary"
//                 title="Create Complaint"
//                 onClick={showModal}
//             />
//             <Modal
//                 className="p-3 flex-wrap-row"
//                 title={<h3>Complaints</h3>}
//                 open={internalModalOpen}
//                 onOk={() => {
//                     createComplaint();
//                 }}
//                 okText={"Create"}
//                 onCancel={handleCancel}
//                 okButtonProps={{ disabled: isPendingComplaint ? true : false }}
//                 cancelButtonProps={{ disabled: isPendingComplaint ? true : false }}>
//                 <p>Enter information about a complaint that you're having here.</p>
//                 <Divider />
//                 <Form form={complaintForm}>
//                     <p className="fs-7">Title</p>
//                     <Form.Item
//                         name="title"
//                         rules={[{ required: true, type: "string", min: 3, max: 50 }]}>
//                         <Input
//                             placeholder="Enter a title"
//                             type="text"
//                         />
//                     </Form.Item>
//                     <p className="fs-7">Description</p>
//                     <Form.Item
//                         name="description"
//                         rules={[{ required: true, type: "string", min: 5, max: 500 }]}>
//                         <Input.TextArea
//                             placeholder="Enter a breif description for complaint"
//                             rows={4}
//                         />
//                     </Form.Item>
//                     <p className="fs-7">Category</p>
//                     <Form.Item
//                         name="category"
//                         rules={[{ required: true, type: "string" }]}>
//                         <Select placeholder={"Select a category"}>
//                             {["maintenance", "noise", "security", "parking", "neighbor", "trash", "internet", "lease", "natural_disaster", "other"].map((c) => (
//                                 <Select.Option key={c}>{c}</Select.Option>
//                             ))}
//                         </Select>
//                     </Form.Item>
//                 </Form>
//             </Modal>
//         </>
//     );
// }

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
            const token = await getToken();
            if (!token) {
                throw new Error("[TENANT_DASHBOARD] Error unauthorized");
            }
            const res = await fetch(`${absoluteServerUrl}/tenant/lockers/unlock`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
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
                title="Open Lockers"
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
                    <p className="fs-5">Lockers opened!</p>
                </span>
            </Modal>
        </>
    );
}
