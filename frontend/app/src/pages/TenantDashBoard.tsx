import Icon, { ToolOutlined, WarningOutlined, InboxOutlined, CalendarOutlined, UserOutlined, CarOutlined } from "@ant-design/icons";
import { Tag } from "antd";
import React from "react";
import { Link } from "react-router";
import ModalComponent from "../components/ModalComponent";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import { CardComponent } from "../components/reusableComponents/CardComponent";

export const TenantDashBoard = () => {
    const handleOpenLocker = () => {
        console.log("handle open locker");
        // Add your logic for getting a package here
    };

    return (
        <div className="container">
            <h1 className="my-4">Tenant Dashboard</h1>
            <div className="alert-container">
                <AlertComponent
                    message="Welcome to the Tenant Dashboard"
                    description="Sign Yo Lease. Pay Daddy Rent"
                    type="warning"
                />
            </div>

            {/* Dashboard Statistics Cards */}
            <h2 className="my-3 p-3">Quick Actions</h2>
            <div className="flex-container my-3">
                <CardComponent
                    title="Open Complaint form"
                    value={10}
                    description="Something not working right or disturbing you? Let us know."
                    hoverable={true}
                    icon={<ToolOutlined className="icon" />}
                    button={
                        <Link to="/tenant/tenant-work-orders-and-complaints">
                            <ButtonComponent
                                title="View All"
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
                            handleOkay={() => {}}
                        />
                    }
                />
            </div>

            {/* Quick Access Documents Section */}
            <h2 className="my-3 p-3">Quick Access Documents Section</h2>
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
                        <Link to="/tenant/tenant-work-orders-and-complaints">
                            <ButtonComponent
                                title="View all workorders"
                                type="primary"
                                onClick={() => {}}
                            />
                        </Link>
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
                            handleOkay={() => {}}
                        />
                    }
                />
            </div>
        </div>
    );
};
