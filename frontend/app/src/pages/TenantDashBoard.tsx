import Icon, { ToolOutlined, WarningOutlined, InboxOutlined, CalendarOutlined, UserOutlined, CarOutlined } from "@ant-design/icons";
import { Tag, Modal, Button } from "antd";
import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { TenantLeaseStatusAndURL } from "../types/types";
import ModalComponent from "../components/ModalComponent";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import { CardComponent } from "../components/reusableComponents/CardComponent";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import { useAuth } from "@clerk/react-router";
import { useQuery } from "@tanstack/react-query";

const DOMAIN_URL = import.meta.env.VITE_DOMAIN_URL || import.meta.env.DOMAIN_URL || 'http://localhost';
const PORT = import.meta.env.VITE_PORT || import.meta.env.PORT || '8080';
const API_URL = `${DOMAIN_URL}:${PORT}`.replace(/\/$/, "");


export const TenantDashBoard = () => {
    const handleOpenLocker = () => {
        console.log("handle open locker");
        // Add your logic for getting a package here
    };

    const [isSigningModalVisible, setSigningModalVisible] = useState(false);
    const { userId } = useAuth();

    // Fetch lease status using TanStack Query
    const { data: leaseData, isLoading, isError } = useQuery({
        queryKey: ["leaseStatus", userId], // Unique key for the query
        queryFn: async () => {
            const response = await fetch(`${API_URL}/leases/${userId}/signing-url`);
            if (!response.ok) {
                throw new Error("Failed to fetch lease status");
            }
            const leaseData: TenantLeaseStatusAndURL = await response.json();
            return leaseData;
        },
        enabled: !!userId,
    });
    if (isError) {
        throw new Error("error found fetching signing url");
    } else if (!leaseData) {
        throw new Error("lease data returned empty");
    }

    // This is the recommended approach in newer versions of TanStack Query. `onSuccess` is deprecated
    useEffect(() => {
        if (leaseData.status) {
            console.log("Lease status updated:", leaseData.status);
            if (["pending_approval", "terminated", "expired"].includes(leaseData.status)) {
                console.log("Setting modal visible based on lease status");
                setSigningModalVisible(true);
            }
        }
    }, [leaseData.status]);

    // This is used to redirect to signing URL when button is clicked
    const handleOk = () => {
        if (leaseData.url) {
            window.location.href = leaseData.url;
        } else {
            console.error("No signing URL available");
        }
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
                message="Welcome to the Tenant Dashboard"
                description="Sign Yo Lease. Pay Daddy Rent"
                type="warning"
            />
            {/* </div> */}

            {/* Dashboard Statistics Cards */}
            <h2 className="my-3 p-3 text-center">Quick Actions</h2>
            <div className="flex-container my-3">
                <CardComponent
                    title="Open Complaint form"
                    value={10}
                    description="Something not working right or disturbing you? Let us know."
                    hoverable={true}
                    icon={<ToolOutlined className="icon" />}
                    button={
                        <Link to="/tenant/tenant-view-and-edit-work-orders-and-complaints">
                            <ButtonComponent
                                title="View All"
                                type="primary"
                                onClick={() => { }}
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
                    value={10}
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
                            handleOkay={() => { }}
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
                            handleOkay={() => { }}
                        />
                    }
                />
                <CardComponent
                    title="Complaint Received"
                    description={`Our office received your complaint and will investigate immediately. "From: onegreatuser@hotmail.com: there are loud techo raves every night, even m..."`}
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
                />
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
                    <Button key="submit" type="primary" onClick={handleOk}>
                        Sign Lease Now
                    </Button>
                ]}
            >
                <div style={{ textAlign: "center" }}>
                    <WarningOutlined style={{ fontSize: "4rem", color: "#faad14", marginBottom: "1rem" }} />
                    <h3 style={{ marginBottom: "1rem" }}>Your Lease Requires Attention</h3>
                    <p>Your lease status is <strong>{leaseStatus === "pending_approval" ? "Pending Approval" : leaseStatus}</strong>.</p>
                    <p>You must sign your lease to continue using the tenant portal.</p>
                    <p style={{ marginTop: "1rem", fontStyle: "italic" }}>
                        This action is required and cannot be dismissed.
                    </p>
                </div>
            </Modal>
        </div>
    );
};