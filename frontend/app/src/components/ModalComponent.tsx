import { useState } from "react";
import { Button, Divider, Form, FormProps, Input, Modal, Select } from "antd";
import { EditOutlined } from "@ant-design/icons";
import ButtonComponent from "./reusableComponents/ButtonComponent";

type InviteTenant = {
    email: string;
    unitNumber: number;
    management_id: string;
};

interface Lease {
    id: string | number;
    title: string;
}

type Building = {
    buildingNumber: number;
    floorNumbers: number;
    numberOfRooms: number;
};

interface ModalComponentProps {
    buttonTitle: string;
    buttonType: "default" | "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "danger";
    content: string | React.ReactNode;
    type:
        | "default"
        | "Smart Locker"
        | "Guest Parking"
        | "Invite Tenant"
        | "Edit Tenant"
        | "View Tenant Complaints"
        | "View Tenant Work Orders"
        | "Send Tenant Lease"
        | "Edit Apartment Building"
        | "Update Password Locker"
        | "Edit Tenant"
        | "Admin Unlock Locker";
    handleOkay: (data?: any) => void;
    modalTitle?: string;
    apartmentBuildingEditProps?: Building;
    apartmentBuildingSetEditBuildingState: React.Dispatch<React.SetStateAction<Building>>;
    userRole?: string;
    leases?: Lease[];
    isModalOpen?: boolean;
    onCancel?: () => void;
}

const onFinish: FormProps<any>["onFinish"] = (values: any) => {
    console.log("Success:", values);
    props;
};

// In code we are sending management_id

const ModalComponent = (props: ModalComponentProps) => {
    const [internalModalOpen, setInternalModalOpen] = useState(false);

    const isModalOpen = props.isModalOpen !== undefined ? props.isModalOpen : internalModalOpen;

    const onFinish: FormProps<any>["onFinish"] = (values: any) => {
        console.log("Success:", values);
        props;
    };

    if (props.userRole === "") {
        props.userRole = "admin";
    }

    const showModal = () => {
        if (props.isModalOpen === undefined) {
            setInternalModalOpen(true);
        }
    };

    const handleCancel = () => {
        if (props.onCancel) {
            props.onCancel();
        }
        if (props.isModalOpen === undefined) {
            setInternalModalOpen(false);
        }
    };

    const titles = {
        default: "Default Modal",
        "Smart Locker": "Smart Locker Modal",
        "Guest Parking": "Create a parking pass",
        "Invite Tenant": "Invite Tenant",
        "Edit Tenant": "Edit Tenant",
        "View Tenant Complaints": "View Tenant Complaints",
        "View Tenant Work Orders": "View Tenant Work Orders",
        "Send Tenant Lease": "Send Tenant Lease",
    };

    const getAdminSmartLocker = () => {
        return (
            <>
                <Button
                    type="primary"
                    onClick={showModal}>
                    {props.buttonTitle}
                </Button>
                <Modal
                    className="p-3 flex-wrap-row"
                    title={<h3>{titles[props.type]}</h3>}
                    open={isModalOpen}
                    onOk={props.handleOkay}
                    onCancel={handleCancel}
                    okButtonProps={{ hidden: true, disabled: true }}
                    cancelButtonProps={{ hidden: true, disabled: true }}>
                    <Divider />
                    <Form>
                        <Form.Item name="search">
                            <Input placeholder="Search for a Tenant" />
                        </Form.Item>
                        <Form.Item name="locker-number">
                            <Input
                                placeholder="Locker Number"
                                type="number"
                            />
                        </Form.Item>
                        <Divider />
                        <div className="flex justify-content-end gap-2">
                            {/* Cancel button */}
                            <Form.Item name="cancel">
                                <Button
                                    type="default"
                                    onClick={() => {
                                        handleCancel();
                                    }}>
                                    Cancel
                                </Button>
                            </Form.Item>
                            <Form.Item name="submit">
                                <Button
                                    type="primary"
                                    htmlType="submit">
                                    Submit
                                </Button>
                            </Form.Item>
                        </div>
                    </Form>
                </Modal>
            </>
        );
    };

    const getTenantSmartLocker = () => {
        return (
            <>
                <Button
                    type="primary"
                    onClick={showModal}>
                    {props.buttonTitle}
                </Button>
                <Modal
                    className="p-3 flex-wrap-row"
                    title={<h3>{titles[props.type]}</h3>}
                    open={isModalOpen}
                    onOk={props.handleOkay}
                    onCancel={handleCancel}
                    okButtonProps={{ hidden: true, disabled: true }}
                    cancelButtonProps={{ hidden: true, disabled: true }}>
                    <Divider />

                    <p>Your locker has now been opened. Make sure to lock up when you are done</p>
                    <div className="flex justify-content-end">
                        <Button
                            type="primary"
                            onClick={() => {
                                props.handleOkay;
                                handleCancel();
                            }}>
                            Okay
                        </Button>
                    </div>
                </Modal>
            </>
        );
    };

    return (
        <>
            {props.type === "default" && (
                <>
                    <ButtonComponent
                        title={props.buttonTitle}
                        type={props.buttonType}
                        onClick={showModal}
                    />
                    <Modal
                        title={<h3>{props.modalTitle}</h3>}
                        open={isModalOpen}
                        onOk={props.handleOkay}
                        onCancel={handleCancel}
                        okButtonProps={{ hidden: true, disabled: true }}
                        cancelButtonProps={{ hidden: true, disabled: true }}>
                        <Divider />
                        <p>{props.content}</p>
                        <Divider />
                        <div className="flex justify-content-end gap-2">
                            <Button
                                type="default"
                                onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                onClick={props.handleOkay}>
                                Confirm
                            </Button>
                        </div>
                    </Modal>
                </>
            )}
            {props.type === "Smart Locker" && <>{props.userRole === "admin " ? getAdminSmartLocker() : getTenantSmartLocker()}</>}
            {props.type === "Guest Parking" && (
                <>
                    <Button
                        type="primary"
                        onClick={showModal}>
                        {props.buttonTitle}
                    </Button>
                    <Modal
                        className="p-3 flex-wrap-row"
                        title={<h3>{titles[props.type]}</h3>}
                        open={isModalOpen}
                        onOk={() => props.handleOkay()}
                        onCancel={handleCancel}
                        okButtonProps={{ hidden: true, disabled: true }}
                        cancelButtonProps={{ hidden: true, disabled: true }}>
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
                            <div className="flex justify-content-end gap-2">
                                {/* Cancel button */}
                                <Form.Item name="cancel">
                                    <Button
                                        type="default"
                                        onClick={() => {
                                            handleCancel();
                                        }}>
                                        Cancel
                                    </Button>
                                </Form.Item>
                                <Form.Item name="submit">
                                    <Button
                                        type="primary"
                                        htmlType="submit">
                                        Submit
                                    </Button>
                                </Form.Item>
                            </div>
                        </Form>
                    </Modal>
                </>
            )}
            {props.type === "Edit Apartment Building" && (
                <>
                    <Button
                        type="primary"
                        onClick={showModal}>
                        <EditOutlined />
                        {props.buttonTitle}
                    </Button>
                    <Modal
                        className="p-3 flex-wrap-row"
                        title={<h3>{props.modalTitle}</h3>}
                        open={isModalOpen}
                        onOk={props.handleOkay}
                        onCancel={handleCancel}
                        // okButtonProps={{ hidden: true, disabled: true }}
                        // cancelButtonProps={{ hidden: true, disabled: true }}
                    >
                        <Divider />
                        <Form>
                            <Form.Item name="Building #">
                                <Input
                                    placeholder={props.apartmentBuildingEditProps?.buildingNumber.toString() || ""}
                                    type="number"
                                    onChange={(e) => {
                                        const updatedValue = Number(e.target.value);

                                        props.apartmentBuildingSetEditBuildingState({
                                            ...props.apartmentBuildingEditProps!,
                                            buildingNumber: updatedValue,
                                        });
                                    }}
                                />
                            </Form.Item>
                            <Form.Item name="Amount of Floors">
                                <Input
                                    placeholder={props.apartmentBuildingEditProps?.floorNumbers.toString() || ""}
                                    type="number"
                                    onChange={(e) => {
                                        const updatedValue = Number(e.target.value);

                                        props.apartmentBuildingSetEditBuildingState({
                                            ...props.apartmentBuildingEditProps!,
                                            floorNumbers: updatedValue,
                                        });
                                    }}
                                />
                            </Form.Item>
                            <Form.Item name="# of Rooms/Floor">
                                <Input
                                    placeholder={props.apartmentBuildingEditProps?.numberOfRooms.toString() || ""}
                                    type="number"
                                    onChange={(e) => {
                                        const updatedValue = Number(e.target.value);

                                        props.apartmentBuildingSetEditBuildingState({
                                            ...props.apartmentBuildingEditProps!,
                                            numberOfRooms: updatedValue,
                                        });
                                    }}
                                />
                            </Form.Item>
                            <Divider />
                        </Form>
                    </Modal>
                </>
            )}

            {props.type === "Edit Tenant" && (
                <>
                    <Button
                        type="primary"
                        onClick={showModal}>
                        {props.buttonTitle}
                    </Button>
                    <Modal
                        className="p-3 flex-wrap-row"
                        title={<h3>{props.modalTitle}</h3>}
                        open={isModalOpen}
                        onOk={props.handleOkay}
                        onCancel={handleCancel}
                        okButtonProps={{ hidden: true, disabled: true }}
                        cancelButtonProps={{ hidden: true, disabled: true }}>
                        <Divider />
                        <Form>
                            <Form.Item name="tenant-name">
                                <Input placeholder="Tenant Name" />
                            </Form.Item>
                            <Form.Item name="tenant-email">
                                <Input placeholder="Tenant Email" />
                            </Form.Item>
                            <Form.Item name="tenant-phone">
                                <Input placeholder="Tenant Phone" />
                            </Form.Item>
                            <Form.Item name="unit-number">
                                <Input placeholder="Unit Number" />
                            </Form.Item>
                            <Form.Item name="lease-status">
                                <Input placeholder="Lease Status" />
                            </Form.Item>
                            {/* <Form.Item name="lease-start" label="Lease Start">
                                <Input placeholder='Lease Start' type='date' />
                            </Form.Item> */}
                            <Form.Item
                                name="lease-end"
                                label="Lease End">
                                <Input
                                    placeholder="Lease End"
                                    type="date"
                                />
                            </Form.Item>
                            <Divider />
                            <div className="flex justify-content-end gap-2">
                                {/* Cancel button */}
                                <Form.Item name="cancel">
                                    <Button
                                        type="default"
                                        onClick={() => {
                                            handleCancel();
                                        }}>
                                        Cancel
                                    </Button>
                                </Form.Item>
                                <Form.Item name="submit">
                                    <Button
                                        type="primary"
                                        htmlType="submit">
                                        Submit
                                    </Button>
                                </Form.Item>
                            </div>
                        </Form>
                    </Modal>
                </>
            )}
            {/* View Recent (3) Tenant Complaints */}
            {props.type === "View Tenant Complaints" && (
                <>
                    <ButtonComponent
                        type="primary"
                        onClick={showModal}
                        title={props.buttonTitle}
                    />
                    <Modal
                        className="p-3 flex-wrap-row"
                        title={<h3>{props.modalTitle}</h3>}
                        open={isModalOpen}
                        onOk={props.handleOkay}
                        onCancel={handleCancel}
                        okButtonProps={{ hidden: true, disabled: true }}
                        cancelButtonProps={{ hidden: true, disabled: true }}>
                        <Divider />
                        <p>{props.content}</p>
                        <Divider />
                        <div className="flex justify-content-end gap-2">
                            <Button
                                type="default"
                                onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                onClick={props.handleOkay}>
                                Confirm
                            </Button>
                        </div>
                    </Modal>
                </>
            )}
            {/* View Recent (3) Tenant Work Orders */}
            {props.type === "View Tenant Work Orders" && (
                <>
                    <ButtonComponent
                        type="primary"
                        onClick={showModal}
                        title={props.buttonTitle}
                    />
                    <Modal
                        className="p-3 flex-wrap-row"
                        title={<h3>{props.modalTitle}</h3>}
                        open={isModalOpen}
                        onOk={props.handleOkay}
                        onCancel={handleCancel}
                        okButtonProps={{ hidden: true, disabled: true }}
                        cancelButtonProps={{ hidden: true, disabled: true }}>
                        <Divider />
                        <p>{props.content}</p>
                        <Divider />
                        <div className="flex justify-content-end gap-2">
                            <Button
                                type="default"
                                onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                onClick={props.handleOkay}>
                                Confirm
                            </Button>
                        </div>
                    </Modal>
                </>
            )}
            {props.type === "Send Tenant Lease" && (
                <>
                    <ButtonComponent
                        type="primary"
                        onClick={showModal}
                        title={props.buttonTitle}
                    />
                    <Modal
                        className="p-3 flex-wrap-row"
                        title={<h3>{props.modalTitle}</h3>}
                        open={isModalOpen}
                        onOk={props.handleOkay}
                        onCancel={handleCancel}
                        // leases={leaseTemplates || []} // Add null check
                        okButtonProps={{ disabled: !props.leases?.length }}
                        // cancelButtonProps={{ hidden: true, disabled: !props.leases?.length }}
                    >
                        <Form>
                            {/* Pick a Lease */}
                            <Form.Item name="lease-template">
                                <Select
                                    placeholder="Select a Lease Template"
                                    options={
                                        props.leases?.map((lease) => ({
                                            label: lease.title,
                                            value: lease.id,
                                        })) || []
                                    }
                                />
                            </Form.Item>
                            <p>Please go create a template in Documenso.</p>
                        </Form>
                    </Modal>
                </>
            )}
            {props.type === "Admin Unlock Locker" && (
                <>
                    <ButtonComponent
                        type="primary"
                        onClick={showModal}
                        title={props.buttonTitle}
                    />
                    <Modal
                        className="p-3 flex-wrap-row"
                        title={<h3>{props.modalTitle}</h3>}
                        open={isModalOpen}
                        onOk={props.handleOkay}
                        onCancel={handleCancel}
                        // okButtonProps={{ hidden: true, disabled: true }}
                        // cancelButtonProps={{ hidden: true, disabled: true }}
                    >
                        <Divider />
                        <p>{props.content}</p>
                        <Divider />
                    </Modal>
                </>
            )}
            {props.type === "Update Password Locker" && (
                <>
                    <ButtonComponent
                        type="primary"
                        onClick={showModal}
                        title={props.buttonTitle}
                    />
                    <Modal
                        className="p-3 flex-wrap-row"
                        title={<h3>{props.modalTitle}</h3>}
                        open={isModalOpen}
                        onOk={props.handleOkay}
                        onCancel={handleCancel}
                        // okButtonProps={{ hidden: true, disabled: true }}
                        // cancelButtonProps={{ hidden: true, disabled: true }}
                    >
                        <Divider />
                        <p>{props.content}</p>
                        <Form>
                            <Form.Item name="password">
                                <Input
                                    placeholder="New Password"
                                    maxLength={4}
                                />
                            </Form.Item>
                        </Form>
                        <Divider />
                    </Modal>
                </>
            )}
        </>
    );
};

export default ModalComponent;
