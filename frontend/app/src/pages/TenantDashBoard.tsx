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
            <div className="row">
                <div className="col-sm-12">
                    <AlertComponent
                        message="Welcome to the Tenant Dashboard"
                        description="Sign Yo Lease. Pay Daddy Rent"
                        type="warning"
                    />
                </div>
            </div>

            {/* Dashboard Statistics Cards */}
            <h2 className="my-3 p-3">Quick Actions</h2>
            <div className="row">
                <div className="col-sm-12 col-md-4 p-sm-3">
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
                </div>
                <div className="col-sm-12 col-md-4 p-sm-3">
                    <CardComponent
                        title="Package info"
                        value={10}
                        description="You have a package, head to your locker and click the button to open it"
                        hoverable={true}
                        icon={<InboxOutlined className="icon" />}
                        button={
                            <ModalComponent
                                type="Smart Locker"
                                buttonTitle="Open Locker"
                                content="Open Locker"
                                buttonType="primary"
                                handleOkay={() => handleOpenLocker()}
                            />
                        }
                    />
                </div>

                <div className="col-sm-12 col-md-4 p-sm-3">
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
            </div>
            <div className="row p-3">
                {/* Quick access cod */}
                <h2 className="my-3">Quick Access Documents Section</h2>

                <div className="row">
                    <div className="col-sm-12 col-md-4 p-sm-3">
                        <CardComponent
                            title={"Lease"}
                            description={"View or Resign your lease"}
                            hoverable={true}
                            button={
                                <ModalComponent
                                    type="default"
                                    buttonTitle="Work order"
                                    content="Work order should go here"
                                    buttonType="primary"
                                    handleOkay={() => {}}
                                />
                            }
                        />
                    </div>

                    <div className="col-sm-12 col-md-4 p-sm-3">
                        <CardComponent
                            title={"Work Order"}
                            description={<Tag color="orange">In Progress</Tag>}
                            hoverable={true}
                            button={
                                <ModalComponent
                                    type="default"
                                    buttonTitle="Work order"
                                    content="Work order should go here"
                                    buttonType="primary"
                                    handleOkay={() => {}}
                                />
                            }
                        />
                    </div>

                    <div className="col-sm-12 col-md-4 p-sm-3">
                        <CardComponent
                            title={"Complaint Received"}
                            description={`Our office received your complaint and will investiage immediately. "From: onegreatuser@hotmail.com: there are loud techo raves every night, even m..."`}
                            hoverable={true}
                            button={
                                <ModalComponent
                                    type="default"
                                    buttonTitle="Complaint"
                                    content="Complaint should go here"
                                    buttonType="primary"
                                    handleOkay={() => {}}
                                />
                            }
                        />
                    </div>
                </div>
                <div className="row p-3">
                    <div className="col-sm-12 col-md-4 p-sm-3">
                        <CardComponent
                            title={"Work Order"}
                            description={<Tag color="green">Done</Tag>}
                            hoverable={true}
                            button={
                                <ModalComponent
                                    type="default"
                                    buttonTitle="Work order"
                                    content="Work order should go here"
                                    buttonType="primary"
                                    handleOkay={() => {}}
                                />
                            }
                        />
                    </div>

                    <div className="col-sm-12 col-md-4 p-sm-3">
                        <CardComponent
                            title={"Work Order"}
                            description={<Tag color="green">Done</Tag>}
                            hoverable={true}
                            button={
                                <ButtonComponent
                                    title="View Details"
                                    type="primary"
                                    onClick={() => {
                                        <ModalComponent
                                            type="default"
                                            buttonTitle="Work order"
                                            content="Work order should go here"
                                            buttonType="primary"
                                            handleOkay={() => {}}
                                        />;
                                    }}
                                />
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
