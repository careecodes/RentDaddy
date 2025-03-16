// Comment to git add .
// TODO: Once we have the tenant info from the backend, make sure to populate the fields in the edit tenant modal so that the user can edit the tenant info easily
import { useState } from "react";
import { Button, Divider, Form, Input, Modal } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ButtonComponent from "./reusableComponents/ButtonComponent";

type InviteTenant = {
    email: string;
    unitNumber: number;
    management_id: string;
};

interface ModalComponentProps {
    buttonTitle: string;
    buttonType: "default" | "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "danger";
    content: string | React.ReactNode;
    type: "default" | "Smart Locker" | "Guest Parking" | "Invite Tenant" | "Edit Tenant" | "View Tenant Complaints" | "View Tenant Work Orders";
    handleOkay: () => void;
    modalTitle?: string;
    userRole?: string;
    setInviteTenantObjProps?: React.Dispatch<React.SetStateAction<InviteTenant>>;
}

// In code we are sending management_id

const ModalComponent = (props: ModalComponentProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (props.userRole === "") {
        props.userRole = "admin";
    }

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    const titles = {
        default: "Default Modal",
        "Smart Locker": "Smart Locker Modal",
        "Guest Parking": "Register someone in Guest Parking",
        "Invite Tenant": "Invite Tenant",
        "Edit Tenant": "Edit Tenant",
        "View Tenant Complaints": "View Tenant Complaints",
        "View Tenant Work Orders": "View Tenant Work Orders",
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
                                        setIsModalOpen(false);
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
                                setIsModalOpen(false);
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
                        onOk={props.handleOkay}
                        onCancel={handleCancel}
                        okButtonProps={{ hidden: true, disabled: true }}
                        cancelButtonProps={{ hidden: true, disabled: true }}>
                        <Divider />
                        <Form>
                            <Form.Item name="tenant-name">
                                <Input placeholder="Tenant Name" />
                            </Form.Item>
                            <Form.Item name="license-plate-number">
                                <Input placeholder="License Plate Number" />
                            </Form.Item>
                            <Form.Item name="car-color">
                                <Input
                                    placeholder="Car Color"
                                    type="number"
                                />
                            </Form.Item>
                            <Form.Item name="car-make">
                                <Input placeholder="Car Make" />
                            </Form.Item>
                            <Form.Item name="duration-of-stay">
                                <Input
                                    placeholder="Duration of Stay"
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
                                            setIsModalOpen(false);
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
            {props.type === "Invite Tenant" && (
                <>
                    <Button
                        type="primary"
                        onClick={showModal}>
                        <PlusOutlined />

                        {props.buttonTitle}
                    </Button>
                    <Modal
                        className="p-3 flex-wrap-row"
                        title={<h3>{titles[props.type]}</h3>}
                        open={isModalOpen}
                        onOk={props.handleOkay}
                        onCancel={handleCancel}
                        // okButtonProps={{ hidden: true, disabled: true }}
                        // cancelButtonProps={{ hidden: true, disabled: true }}
                    >
                        <Divider />
                        <Form>
                            <Form.Item name="tenant-email">
                                <Input
                                    placeholder="Tenant Email"
                                    onChange={(e) => {
                                        const updatedValue = e.target.value;

                                        props.setInviteTenantObjProps!((prev) => ({
                                            ...prev,
                                            email: updatedValue,
                                        }));
                                    }}
                                />
                            </Form.Item>
                            <Form.Item name="unit-number">
                                <Input
                                    placeholder="Unit Number"
                                    type="number"
                                    onChange={(e) => {
                                        const updatedValue = Number(e.target.value);

                                        props.setInviteTenantObjProps!((prev) => ({
                                            ...prev,
                                            unitNumber: updatedValue,
                                        }));
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
                                            setIsModalOpen(false);
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
        </>
    );
};

export default ModalComponent;
