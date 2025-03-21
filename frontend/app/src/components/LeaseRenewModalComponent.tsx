import React, { useState, useEffect } from "react";
import { Form, Input, Modal, Select, Spin, DatePicker, message } from "antd";
import ButtonComponent from "./reusableComponents/ButtonComponent";
import axios from "axios";
import dayjs from "dayjs";
import { LeaseData } from "../types/types"; //

const { Option } = Select;

const API_URL = `${import.meta.env.VITE_DOMAIN_URL}:${import.meta.env.VITE_PORT}`.replace(/\/$/, "");

interface Tenant {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    unitNumber?: number;
}

interface Apartment {
    id: number;
    unit_number: string;
    price: number;
    size: number;
    management_id: number;
    availability: boolean;
}
interface LeaseRenewModalComponentProps {
    visible: boolean;
    onClose: () => void;
    lease: LeaseData | null;
}


interface LeaseRenewModalComponentProps {
    visible: boolean;
    onClose: () => void;
    lease: LeaseData | null;
}

export const LeaseRenewModalComponent: React.FC<LeaseRenewModalComponentProps> = ({
    visible,
    onClose,
    lease
}) => {
    const [form] = Form.useForm();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loadingTenants, setLoadingActiveLease] = useState(false);
    const [loadingApartments, setLoadingApartments] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>("");

    // Fetch data when modal opens
    useEffect(() => {
        if (visible && lease) {
            setStatus('idle');
            setErrorMessage("");
            form.setFieldsValue({
                tenant_name: lease.tenantName,
                property_address: lease.apartment,
                rent_amount: lease.rentAmount,
                start_date: dayjs().add(1, 'day'),
                end_date: dayjs().add(1, 'year')
            });
        }
    }, [visible, lease]);


    const handleRenewLease = async () => {
        try {
            // Validate form fields
            await form.validateFields();
            setStatus('loading');

            // Prepare payload
            const payload = {
                tenant_id: lease?.tenantId,
                apartment_id: lease?.apartmentId,
                tenant_name: form.getFieldValue("tenant_name"),
                tenant_email: lease?.tenantEmail || `${form.getFieldValue("tenant_name").replace(/\s+/g, '.')}@example.com`,
                property_address: form.getFieldValue("property_address"),
                rent_amount: parseFloat(form.getFieldValue("rent_amount")),
                start_date: form.getFieldValue("start_date").format("YYYY-MM-DD"),
                end_date: form.getFieldValue("end_date").format("YYYY-MM-DD"),
                document_title: `Lease Agreement Renewal for ${form.getFieldValue("property_address")}`,
                previous_lease_id: lease?.id,
                check_existing: true
            };


            const response = await axios.post(`${API_URL}/admin/tenants/leases/renew`, payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            setStatus('success');
            message.success("New lease has been generated and sent for signing!");
            console.log("Lease created:", response.data);

        } catch (error: any) {
            setStatus('error');

            if (error.response) {
                const errorMessage = error.response.data || "Failed to create lease";
                setErrorMessage(`Server error: ${errorMessage}`);
                message.error(`Error: ${errorMessage}`);
            } else if (error.request) {
                setErrorMessage("No response from server. Please try again.");
                message.error("No response from server. Please try again.");
            } else {
                setErrorMessage("Please check the form fields and try again.");
                message.error("Please check the form fields and try again.");
            }

            console.error("Error creating lease:", error);
        }
    };

    // Function to reset the modal state
    const handleReset = () => {
        setStatus('idle');
        setErrorMessage("");
    };

    // Function to validate end date is after start date
    const validateEndDate = (_: any, value: any) => {
        const startDate = form.getFieldValue('start_date');
        if (!value || !startDate) {
            return Promise.resolve();
        }

        if (value.isBefore(startDate, 'day')) {
            return Promise.reject(new Error('End date must be after start date'));
        }
        return Promise.resolve();
    };


    // Content based on current status
    const renderModalContent = () => {
        switch (status) {
            case 'loading':
                return (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <Spin size="large" />
                        <p style={{ marginTop: '10px' }}>Creating lease and sending for signature...</p>
                    </div>
                );

            case 'success':
                return (
                    <div className="text-center p-4">
                        <div className="mb-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                                <span className="text-green-600 text-2xl">✓</span>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Lease Successfully Created!</h3>
                        <p className="text-gray-500 mb-4">The lease has been generated and sent for signing.</p>
                        <ButtonComponent
                            type="primary"
                            title="Close"
                            onClick={onClose}
                        />
                    </div>
                );

            case 'error':
                return (
                    <div className="text-center p-4">
                        <div className="mb-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                                <span className="text-red-600 text-2xl">✗</span>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Failed to Renew Lease</h3>
                        <p className="text-gray-500 mb-4">{errorMessage || "There was an error processing your request."}</p>
                        <div className="flex justify-center gap-2">
                            <ButtonComponent
                                type="primary"
                                title="Try Again"
                                onClick={handleReset}
                            />
                            <ButtonComponent
                                type="default"
                                title="Close"
                                onClick={onClose}
                            />
                        </div>
                    </div>
                );

            case 'idle':
            default:
                return (
                    <Form form={form} layout="vertical">
                        <Form.Item label="Tenant Name" name="tenant_name">
                            <Input disabled />
                        </Form.Item>

                        <Form.Item label="Property Address/Apartment" name="property_address">
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

                        <div className="text-gray-500 text-sm mb-2">
                            <p>Note: Renewing this lease will create a new document linked to the existing agreement.</p>
                        </div>
                    </Form>

                );
        }
    };

    // Dynamic footer based on current status
    const renderFooter = () => {
        if (status === 'success' || status === 'error') {
            return null; // No footer for success/error states as actions are in the content
        }

        return [
            <ButtonComponent
                key="cancel"
                type="default"
                title="Cancel"
                onClick={onClose}
                disabled={status === 'loading'}
            />,
            <ButtonComponent
                key="send"
                type="primary"
                title="Renew Lease"
                onClick={handleRenewLease}
                loading={status === 'loading'}
                disabled={status === 'loading'}
            />

        ];
    };

    return (
        <Modal
            title={status === 'success' ? "Success" :
                status === 'error' ? "Error" :
                    "Renew Lease Agreement"}

            open={visible}
            onCancel={status === 'loading' ? undefined : onClose}
            footer={renderFooter()}
            closable={status !== 'loading'}
            maskClosable={status !== 'loading'}
        >
            <div className="p-2">{renderModalContent()}</div>

        </Modal>
    );
};

export default LeaseRenewModalComponent;