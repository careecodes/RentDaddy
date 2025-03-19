// Comment to git add .
// TODO: Once we have the tenant info from the backend, make sure to populate the fields in the edit tenant modal so that the user can edit the tenant info easily
import { Button, Divider, Form, Input, Modal, Spin, message } from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import ButtonComponent from "./reusableComponents/ButtonComponent";
import axios from "axios";
import { useState, useEffect } from "react";
import { DatePicker } from "antd";


const API_URL = `${import.meta.env.VITE_DOMAIN_URL}:${import.meta.env.VITE_PORT}`.replace(/\/$/, "");

interface Lease {
    id: string | number;
    title: string;
}


interface LeaseTemplate {
    id: number;
    title: string;
}

interface SendLeaseModalProps {
    visible: boolean;
    onClose: () => void;
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
    type: "default" | "Smart Locker" | "Guest Parking" | "Add Tenant" | "Edit Tenant" | "View Tenant Complaints" | "View Tenant Work Orders" | "Send Tenant Lease" | "Edit Apartment Building";
    handleOkay: () => void;
    modalTitle?: string;
    apartmentBuildingEditProps?: Building;
    apartmentBuildingSetEditBuildingState: React.Dispatch<React.SetStateAction<Building>>;
    userRole?: string;
}


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
        "Add Tenant": "Add Tenant",
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
            {props.type === "Add Tenant" && (
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
                                <Input
                                    placeholder="Tenant Phone"
                                    type="number"
                                />
                            </Form.Item>
                            <Form.Item name="unit-number">
                                <Input
                                    placeholder="Unit Number"
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
                        onOk={handleSubmit}
                        onCancel={handleCancel}
                        okButtonProps={{ disabled: !selectedTemplate }}
                    >
                        <Form form={form} layout="vertical">
                            <p>Please generate a lease template.</p>
                            {/* Tenant Details */}
                            <Form.Item label="Tenant Name" name="tenant_name" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item label="Property Address" name="property_address" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item label="Rent Amount" name="rent_amount" rules={[{ required: true }]}>
                                <Input type="number" />
                            </Form.Item>
                            <Form.Item label="Start Date" name="start_date" rules={[{ required: true }]}>
                                <Input type="date" />
                            </Form.Item>
                            <Form.Item label="End Date" name="end_date" rules={[{ required: true }]}>
                                <Input type="date" />
                            </Form.Item>
                        </Form>
                    </Modal>
                </>
            )}
        </>
    );
};

export default ModalComponent;
interface SendLeaseModalProps {
    visible: boolean;
    onClose: () => void;
    selectedLease: any; // Type should match your lease data structure
}

interface SendLeaseModalProps {
    visible: boolean;
    onClose: () => void;
    selectedLease: any; // Type should match your lease data structure
}

export const SendLeaseModal: React.FC<SendLeaseModalProps> = ({ visible, onClose, selectedLease }) => {
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState(false);

    // Initialize form values when the selected lease changes
    useEffect(() => {
        if (selectedLease && visible) {
            // Use the date objects that were prepared in AdminViewEditLeases
            form.setFieldsValue({
                tenant_name: selectedLease.tenantName,
                property_address: selectedLease.apartment,
                rent_amount: selectedLease.rentAmount,
                start_date: selectedLease.formattedStartDate,
                end_date: selectedLease.formattedEndDate,
            });
        }
    }, [selectedLease, visible, form]);

    const handleSendLease = async () => {
        try {
            // Validate all form fields
            await form.validateFields();
            setIsLoading(true);

            const values = form.getFieldsValue();

            // Get the start and end dates in YYYY-MM-DD format
            const startDateStr = values.start_date.format('YYYY-MM-DD');
            const endDateStr = values.end_date.format('YYYY-MM-DD');

            // Prepare the payload for the API
            const payload = {
                // Use the selected lease key as tenant_id and apartment_id
                tenant_id: selectedLease.key,
                apartment_id: selectedLease.key,

                // Include tenant & property details from form
                tenant_name: values.tenant_name,
                tenant_email: `${values.tenant_name.replace(/\s+/g, '.').toLowerCase()}@example.com`, // This is a fallback
                property_address: values.property_address,

                // Financial and time details
                rent_amount: parseFloat(values.rent_amount),
                start_date: startDateStr,
                end_date: endDateStr,

                // Document details
                document_title: `Lease Agreement for ${values.property_address}`
            };

            const response = await axios.post(
                `${API_URL}/admin/tenants/leases/upload-with-signers`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            message.success("Lease has been generated and sent for signing!");
            console.log("Lease generated:", response.data);

            // Close the modal on success
            onClose();
        } catch (error: any) {
            // Handle different types of errors appropriately
            if (error.response) {
                // Server responded with an error status code
                const errorMessage = error.response.data || "Failed to send lease";
                message.error(`Error: ${errorMessage}`);
                console.error("Server error:", error.response);
            } else if (error.request) {
                // Request was made but no response received
                message.error("No response from server. Please try again.");
                console.error("No response:", error.request);
            } else {
                // Form validation error or other client-side error
                message.error("Please check the form fields and try again.");
                console.error("Request error:", error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Function to check if end date is after start date (without using dayjs directly)
    const validateEndDate = (_, value) => {
        const startDate = form.getFieldValue('start_date');
        if (!value || !startDate) {
            return Promise.resolve();
        }

        // Compare the DatePicker values
        // We're using the DatePicker component's method isBefore/isAfter
        if (value.isBefore(startDate, 'day')) {
            return Promise.reject(new Error('End date must be after start date'));
        }
        return Promise.resolve();
    };

    return (
        <Modal
            title="Send Lease for Signing"
            open={visible}
            onCancel={onClose}
            footer={[
                <ButtonComponent
                    key="cancel"
                    type="default"
                    title="Cancel"
                    onClick={onClose}
                    disabled={isLoading}
                />,
                <ButtonComponent
                    key="send"
                    type="primary"
                    title="Send for Signing"
                    onClick={handleSendLease}
                    loading={isLoading}
                />
            ]}
        >
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin />
                    <p style={{ marginTop: '10px' }}>Generating lease and sending for signature...</p>
                </div>
            ) : (
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="Tenant Name"
                        name="tenant_name"
                        rules={[{ required: true, message: "Please enter tenant name" }]}
                    >
                        <Input disabled />
                    </Form.Item>

                    <Form.Item
                        label="Property Address/Apartment"
                        name="property_address"
                        rules={[{ required: true, message: "Please enter property address" }]}
                    >
                        <Input disabled />
                    </Form.Item>

                    <Form.Item
                        label="Monthly Rent ($)"
                        name="rent_amount"
                        rules={[{ required: true, message: "Please enter rent amount" }]}
                    >
                        <Input type="number" />
                    </Form.Item>

                    <Form.Item
                        label="Lease Start Date"
                        name="start_date"
                        rules={[{ required: true, message: "Please select lease start date" }]}
                    >
                        <DatePicker style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item
                        label="Lease End Date"
                        name="end_date"
                        rules={[
                            { required: true, message: "Please select lease end date" },
                            { validator: validateEndDate }
                        ]}
                    >
                        <DatePicker style={{ width: "100%" }} />
                    </Form.Item>
                </Form>
            )}
        </Modal>
    );
};