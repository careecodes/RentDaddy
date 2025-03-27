import { useState } from "react";
import { Button, Divider, Form, FormProps, Input, Modal, Select } from "antd";
import { EditOutlined } from "@ant-design/icons";
import ButtonComponent from "./reusableComponents/ButtonComponent";

type InviteTenant = {
    email: string;
    unitNumber: number;
    management_id: string;
};

import { useUser } from "@clerk/react-router";

interface Lease {
    id: string | number;
    title: string;
}

export interface Tenant {
    id: number;
    clerk_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    unit_number: number;
    status: string;
    created_at: string;
    role: string;
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
        | "Admin Unlock Locker"
        | "Update Password Locker"
        | "Unlock Locker";
    handleOkay: (data?: any) => Promise<void>;
    modalTitle?: string;
    apartmentBuildingEditProps?: Building;
    apartmentBuildingSetEditBuildingState?: React.Dispatch<React.SetStateAction<Building>>;
    userRole?: string;
    leases?: Lease[];
    isModalOpen?: boolean;
    onCancel?: () => void;
    locker?: number;
    tenant?: Tenant[];
    setUserId: (userId: string) => void;
    setAccessCode: (accessCode: string) => void;
    selectedUserId: string;
    accessCode: string;
}

// In code we are sending management_id

const ModalComponent = (props: ModalComponentProps) => {
    const { user } = useUser();
    const [internalModalOpen, setInternalModalOpen] = useState(false);

    const isModalOpen = props.isModalOpen !== undefined ? props.isModalOpen : internalModalOpen;

    const onFinish: FormProps<any>["onFinish"] = (values: any) => {
        console.log("Success:", values);
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

    const titles: Record<string, string> = {
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
                <ButtonComponent
                    title={props.buttonTitle}
                    type="primary"
                    onClick={showModal}
                />
                <Modal
                    className="p-3 flex-wrap-row"
                    title={<h3>{props.modalTitle}</h3>}
                    open={isModalOpen}
                    onOk={async () => {
                        try {
                            if (props.accessCode && props.accessCode) {
                                props.setUserId(props.selectedUserId);
                                props.setAccessCode(props.accessCode);
                                await props.handleOkay({ userId: props.selectedUserId, accessCode: props.accessCode });
                                setInternalModalOpen(false);
                            } else {
                                console.error("Missing required fields");
                            }
                        } catch (error) {
                            console.error("Error in modal onOk:", error);
                            // Keep modal open if there's an error
                        }
                    }}
                    onCancel={handleCancel}>
                    <Divider />
                    <Form layout="vertical">
                        <Form.Item
                            name="userId"
                            label="Tenant"
                            rules={[{ required: true, message: "Please pick a tenant" }]}>
                            <Select
                                placeholder="Please pick a tenant"
                                onChange={(value: string) => {
                                    console.log("Selected value:", value);
                                    props.setUserId(value);
                                }}
                                options={props.tenant?.map((tenant) => ({
                                    value: tenant.clerk_id,
                                    label: `${tenant.first_name} ${tenant.last_name}`,
                                }))}
                            />
                        </Form.Item>
                        <Form.Item
                            name="accessCode"
                            label="Access Code"
                            rules={[{ required: true, message: "Please enter an access code" }]}>
                            <Input.Password
                                placeholder="Enter access code"
                                maxLength={8}
                                onChange={(e) => props.setAccessCode(e.target.value)}
                            />
                        </Form.Item>
                        <Divider />
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
                    onOk={() => {
                        props.handleOkay();
                        setInternalModalOpen(false);
                    }}
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

    // Update the apartment building form handlers
    const handleBuildingNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const updatedValue = Number(e.target.value);
        if (props.apartmentBuildingSetEditBuildingState) {
            props.apartmentBuildingSetEditBuildingState({
                ...props.apartmentBuildingEditProps!,
                buildingNumber: updatedValue,
            });
        }
    };

    const handleFloorNumbersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const updatedValue = Number(e.target.value);
        if (props.apartmentBuildingSetEditBuildingState) {
            props.apartmentBuildingSetEditBuildingState({
                ...props.apartmentBuildingEditProps!,
                floorNumbers: updatedValue,
            });
        }
    };

    const handleRoomsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const updatedValue = Number(e.target.value);
        if (props.apartmentBuildingSetEditBuildingState) {
            props.apartmentBuildingSetEditBuildingState({
                ...props.apartmentBuildingEditProps!,
                numberOfRooms: updatedValue,
            });
        }
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
            {props.type === "Smart Locker" && <>{user?.publicMetadata.role === "admin" ? getAdminSmartLocker() : getTenantSmartLocker()}</>}
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
                        // okButtonProps={{ hidden: true, disabled: true }}
                        // cancelButtonProps={{ hidden: true, disabled: true }}
                        // okButtonProps={{ hidden: true, disabled: true }}
                        // cancelButtonProps={{ hidden: true, disabled: true }}
                    >
                        <Divider />
                        <Form>
                            <Form.Item name="Building #">
                                <Input
                                    placeholder={props.apartmentBuildingEditProps?.buildingNumber.toString() || ""}
                                    type="number"
                                    onChange={handleBuildingNumberChange}
                                />
                            </Form.Item>
                            <Form.Item name="Amount of Floors">
                                <Input
                                    placeholder={props.apartmentBuildingEditProps?.floorNumbers.toString() || ""}
                                    type="number"
                                    onChange={handleFloorNumbersChange}
                                />
                            </Form.Item>
                            <Form.Item name="# of Rooms/Floor">
                                <Input
                                    placeholder={props.apartmentBuildingEditProps?.numberOfRooms.toString() || ""}
                                    type="number"
                                    onChange={handleRoomsChange}
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
            {props.type === "Unlock Locker" && (
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
                            <Form.Item>
                                <Input
                                    placeholder="Enter New Password"
                                    type="password"
                                    // value={password}
                                    // onChange={(e) => setPassword(e.target.value)}
                                />
                            </Form.Item>
                        </Form>
                        <Divider />
                        {/* <div className="flex justify-content-end gap-2">
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
                        </div> */}
                    </Modal>
                </>
            )}
        </>
    );
};

export default ModalComponent;
