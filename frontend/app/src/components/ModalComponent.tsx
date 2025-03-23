// Comment to git add .
// TODO: Once we have the tenant info from the backend, make sure to populate the fields in the edit tenant modal so that the user can edit the tenant info easily
import { useEffect, useState } from "react";
import { Button, Divider, Form, Input, Modal, Select } from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import ButtonComponent from "./reusableComponents/ButtonComponent";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/react-router";

type InviteTenant = {
    email: string;
    unitNumber: number; //TODO: this is no longer needed
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
    type: "default" | "Smart Locker" | "Guest Parking" | "Invite Tenant" | "Edit Tenant" | "View Tenant Complaints" | "View Tenant Work Orders" | "Send Tenant Lease" | "Edit Apartment Building";
    handleOkay: () => void;
    modalTitle?: string;
    apartmentBuildingEditProps?: Building;
    apartmentBuildingSetEditBuildingState: React.Dispatch<React.SetStateAction<Building>>;
    userRole?: string;
    setInviteTenantObjProps?: React.Dispatch<React.SetStateAction<InviteTenant>>;
    leases?: Lease[];
    isModalOpen?: boolean;
    onCancel?: () => void;
}

interface InviteStatusNotification {
    show: boolean;
    message: string;
    type: "success" | "error";
}

// In code we are sending management_id

const ModalComponent = (props: ModalComponentProps) => {
    const { getToken } = useAuth();
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const isModalOpen = props.isModalOpen !== undefined ? props.isModalOpen : internalModalOpen;
    const [tenantInviteForm] = Form.useForm<InviteTenant>();

    const [inviteStatus, setInviteStatus] = useState<InviteStatusNotification>({
        show: false,
        message: "",
        type: "success",
    });

    async function handleInviteTenant() {
        const authToken = await getToken();
        if (!authToken) {
            throw new Error("Error tenant email empty");
        }

        if (!tenantInviteForm.getFieldValue("email") || !tenantInviteForm.getFieldValue("unitNumber")) {
            throw new Error("Tenant ivnite schema invalid");
        }

        const resp = await fetch("http://localhost:8080/admin/tenants/invite", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(tenantInviteForm.getFieldsValue()),
        });
        if (!resp.ok) {
            throw new Error("Error request failed");
        }
        return;
    }

    const { mutate: inviteTenant, isPending } = useMutation({
        mutationFn: handleInviteTenant,
        onSuccess: () => {
            setInviteStatus({
                show: true,
                message: "Successfully invited tenant",
                type: "success",
            });
            tenantInviteForm.resetFields();
        },
        onError: () => {
            setInviteStatus({
                show: true,
                message: "Oops try again another time",
                type: "error",
            });
        },
    });

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
        "Guest Parking": "Register someone in Guest Parking",
        "Invite Tenant": "Invite Tenant",
        "Edit Tenant": "Edit Tenant",
        "View Tenant Complaints": "View Tenant Complaints",
        "View Tenant Work Orders": "View Tenant Work Orders",
        "Send Tenant Lease": "Send Tenant Lease",
        "Edit Apartment Building": "Edit Apartment Building",
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setInviteStatus((prev) => ({ ...prev, show: false }));
        }, 5000);

        return () => clearTimeout(timer);
    }, [inviteStatus.show]);

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
                        onOk={tenantInviteForm.submit}
                        onCancel={handleCancel}
                        okButtonProps={{ disabled: isPending ? true : false }}
                        // cancelButtonProps={{ hidden: true, disabled: true }}
                    >
                        <Divider />
                        <Form
                            form={tenantInviteForm}
                            onFinish={() => {
                                inviteTenant();
                            }}
                            initialValues={{ email: "", unitNumber: 0 }}>
                            <Form.Item name="email">
                                <Input
                                    placeholder="Tenant Email"
                                    value={tenantInviteForm.getFieldValue("email")}
                                    onChange={(e) => {
                                        tenantInviteForm.setFieldValue("email", e.target.value);
                                    }}
                                />
                            </Form.Item>
                            <Form.Item name="unitNumber">
                                <Input
                                    placeholder="Unit Number"
                                    type="number"
                                    value={tenantInviteForm.getFieldValue("unitNumber")}
                                    onChange={(e) => {
                                        tenantInviteForm.setFieldValue("unitNumber", e.target.valueAsNumber);
                                    }}
                                />
                            </Form.Item>
                            <Divider />
                            {inviteStatus.show ? (
                                <p className={`${inviteStatus.type === "success" ? "text-success" : "text-danger"}`}>{inviteStatus.message}</p>
                            ) : (
                                <p style={{ minHeight: "10px" }}></p>
                            )}
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
        </>
    );
};

export default ModalComponent;
