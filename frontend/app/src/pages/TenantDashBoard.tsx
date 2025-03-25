import { ToolOutlined, WarningOutlined, InboxOutlined, CarOutlined } from "@ant-design/icons";
import { Tag, Modal, Button, Divider, Form, Input } from "antd";
import { useState, useEffect } from "react";
import { Link } from "react-router";
import ModalComponent from "../components/ModalComponent";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import { CardComponent } from "../components/reusableComponents/CardComponent";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import MyChatBot from "../components/ChatBot";
import { useAuth } from "@clerk/react-router";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { ComplaintsData, Parking } from "../types/types";

export const TenantDashBoard = () => {
    const [isSigningModalVisible, setSigningModalVisible] = useState(false);
    const { getToken, userId } = useAuth();

    async function getParkingPermit() {
        const authToken = await getToken();
        if (!authToken) {
            throw new Error("[TENANT_DASHBOARD] Error unauthorized");
        }
        const res = await fetch("http://localhost:8080/tenant/parking", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
        });

        if (!res.ok) {
            throw new Error("[TENANT_DASHBOARD] Error parking_permits request failed");
        }
        return (await res.json()) as Parking[];
    }

    async function getComplaints() {
        const authToken = await getToken();
        if (!authToken) {
            throw new Error("[TENANT_DASHBOARD] Error unauthorized");
        }
        const res = await fetch("http://localhost:8080/tenant/complaints", {
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

    const [parking, complaints] = useQueries({
        queries: [
            { queryKey: ["parking"], queryFn: getParkingPermit },
            { queryKey: ["complaints"], queryFn: getComplaints },
        ],
    });

    // Simulate fetching lease status using TanStack Query
    const {
        data: leaseStatus,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ["leaseStatus", userId], // Unique key for the query
        queryFn: async () => {
            // Simulate a delay to mimic network request and give dummy data
            await new Promise((resolve) => setTimeout(resolve, 500));
            const leaseData = {
                // userId: userId,
                userId: "notme",
                lease_status: "pending_approval",
            };
            // const response = await fetch(`/api/leases?tenantId=${userId}`);
            // if (!response.ok) {
            //     throw new Error("Failed to fetch lease status");
            // }
            // const data = await response.json();

            // Return dummy data if the userId matches
            if (userId === leaseData.userId) {
                console.log(leaseData.lease_status);
                return leaseData.lease_status;
            } else {
                return "active";
            }
        },
        enabled: !!userId,
    });

    // This is the recommended approach in newer versions of TanStack Query. `onSuccess` is deprecated
    useEffect(() => {
        if (leaseStatus) {
            console.log("Lease status updated:", leaseStatus);
            if (["pending_approval", "terminated", "expired"].includes(leaseStatus)) {
                console.log("Setting modal visible based on lease status");
                setSigningModalVisible(true);
            }
        }
    }, [leaseStatus]);

    const handleOk = () => {
        // Redirect to the lease signing page (THIS ISNT IT AT ALL, NEEDS documenso uri. TMP for now)
        window.location.href = "/tenant/sign-lease";
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (isError) {
        return <div>Error fetching tenant's lease status. Please try again later.</div>;
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
                    description="Something not working right or disturbing you? Let us know."
                    hoverable={true}
                    icon={<ToolOutlined className="icon" />}
                    button={
                        <Link to="/tenant/tenant-work-orders-and-complaints">
                            <ButtonComponent
                                title="Create Complaint"
                                type="primary"
                                onClick={() => {}}
                            />
                        </Link>
                    }
                />
                <CardComponent
                    title="Package info"
                    value={10}
                    description="You have a package. Click the button at your locker to open it"
                    hoverable={true}
                    icon={<InboxOutlined className="icon" />}
                    button={
                        <ModalComponent
                            type="Smart Locker"
                            userRole="tenant"
                            buttonTitle="Open Locker"
                            content="Open Locker"
                            buttonType="primary"
                            handleOkay={() => handleOpenLocker()}
                        />
                    }
                />
                <CardComponent
                    title="Guest Parking"
                    value={parking.data?.length}
                    description="Got a guest coming to visit? Make sure they have spots to park"
                    hoverable={true}
                    icon={<CarOutlined className="icon" />}
                    button={<TenantParkingPeritModal />}
                />
            </div>

            {/* Quick Access Documents Section */}
            <h2 className="my-3 p-3 text-center">Quick Access Documents Section</h2>
            <div className="flex-container mb-3">
                <CardComponent
                    title="Lease"
                    description="View or Resign your lease"
                    hoverable={true}
                    button={
                        <ModalComponent
                            type="default"
                            buttonTitle="View Lease"
                            content="Lease should go here"
                            buttonType="primary"
                            handleOkay={() => {}}
                        />
                    }
                />
                <CardComponent
                    title="Work Order"
                    description={<Tag color="orange">Current In Progress</Tag>}
                    hoverable={true}
                    button={
                        <ModalComponent
                            type="default"
                            buttonTitle="View all work orders"
                            content="Work orders should go here"
                            buttonType="primary"
                            handleOkay={() => {}}
                        />
                    }
                />
                <CardComponent
                    title="Complaint Received"
                    description={`Our office received your complaint and will investigate immediately. "From: onegreatuser@hotmail.com: there are loud techo raves every night, even m..."`}
                    hoverable={true}
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
                onCancel={() => {}} // Empty function prevents closing
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
                        Your lease status is <strong>{leaseStatus === "pending_approval" ? "Pending Approval" : leaseStatus}</strong>.
                    </p>
                    <p>You must sign your lease to continue using the tenant portal.</p>
                    <p style={{ marginTop: "1rem", fontStyle: "italic" }}>This action is required and cannot be dismissed.</p>
                </div>
            </Modal>
        </div>
    );
};

function TenantParkingPeritModal() {
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const { userId, getToken } = useAuth();
    const { mutate: createParkingPermit, isPending: isParkingPending } = useMutation({
        mutationKey: [`${userId}-create-parking`],
        mutationFn: async () => {
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_DASHBOARD] Error unauthorized");
            }
            const res = await fetch("http://localhost:8080/tenant/parking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
            });

            if (!res.ok) {
                throw new Error("[TENANT_DASHBOARD] Error creating parking_permit");
            }
            return;
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
                <Form>
                    <p className="fs-6">Guest Name</p>
                    <Form.Item
                        name="tenant-name"
                        required={true}>
                        <Input placeholder="John Doe" />
                    </Form.Item>
                    <p className="fs-6">Car Color</p>
                    <Form.Item
                        name="car-color"
                        required={true}>
                        <Input placeholder="Blue" />
                    </Form.Item>
                    <p className="fs-6">Car Model</p>
                    <Form.Item
                        name="car-make"
                        required={true}>
                        <Input placeholder="Car Make" />
                    </Form.Item>
                    <p className="fs-6">License Plate</p>
                    <Form.Item
                        name="license-plate-number"
                        required={true}>
                        <Input placeholder="3ha3-3213" />
                    </Form.Item>
                </Form>
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
                onOk={() => {}}
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
