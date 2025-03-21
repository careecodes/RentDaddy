// Comment to git add .
// TODO: Once we have the tenant info from the backend, make sure to populate the fields in the edit tenant modal so that the user can edit the tenant info easily
import { Form, Input, Modal, Spin, message } from "antd";
import ButtonComponent from "./reusableComponents/ButtonComponent";
import axios from "axios";
import { useState, useEffect } from "react";
import { DatePicker } from "antd";

const API_URL = `${import.meta.env.VITE_DOMAIN_URL}:${import.meta.env.VITE_PORT}`.replace(/\/$/, "");

interface LeaseSendModalComponentProps {
    visible: boolean;
    onClose: () => void;
    selectedLease: any; // Type should match your lease data structure
}

export const LeaseSendModalComponent: React.FC<LeaseSendModalComponentProps> = ({ visible, onClose, selectedLease }) => {
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>("");

    // Initialize form values when the selected lease changes
    useEffect(() => {
        if (selectedLease && visible) {
            // Reset state on new modal open
            setStatus('idle');
            setErrorMessage("");

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
            setStatus('loading');

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
                document_title: `Lease Agreement for ${values.property_address}`,

                // Flag for checking existing leases
                check_existing: true
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

            // Set success state instead of redirecting
            setStatus('success');

            // Determine if this was an update or new lease
            const isUpdate = response.data && response.data.action === "updated";
            const successMsg = isUpdate
                ? "Existing lease has been updated and sent for signing!"
                : "New lease has been generated and sent for signing!";

            message.success(successMsg);
            console.log("Lease operation:", response.data);

        } catch (error: any) {
            // Handle different types of errors appropriately
            setStatus('error');

            if (error.response) {
                // Server responded with an error status code
                const errorMessage = error.response.data || "Failed to send lease";
                setErrorMessage(`Server error: ${errorMessage}`);
                message.error(`Error: ${errorMessage}`);
                console.error("Server error:", error.response);
            } else if (error.request) {
                // Request was made but no response received
                setErrorMessage("No response from server. Please try again.");
                message.error("No response from server. Please try again.");
                console.error("No response:", error.request);
            } else {
                // Form validation error or other client-side error
                setErrorMessage("Please check the form fields and try again.");
                message.error("Please check the form fields and try again.");
                console.error("Request error:", error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Function to reset the modal state
    const handleReset = () => {
        setStatus('idle');
        setErrorMessage("");
    };

    // Function to check if end date is after start date
    const validateEndDate = (_: any, value: { isBefore: (arg0: any, arg1: string) => any; }) => {
        const startDate = form.getFieldValue('start_date');
        if (!value || !startDate) {
            return Promise.resolve();
        }

        // Compare the DatePicker values
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
                        <p style={{ marginTop: '10px' }}>Processing lease and sending for signature...</p>
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
                        <h3 className="text-lg font-semibold mb-2">Lease Successfully Sent!</h3>
                        <p className="text-gray-500 mb-4">The lease has been processed and sent for signing.</p>
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
                        <h3 className="text-lg font-semibold mb-2">Failed to Send Lease</h3>
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

                        <div className="text-gray-500 text-sm mb-2">
                            <p>Note: If a lease already exists for this tenant and apartment, it will be updated.</p>
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
                disabled={isLoading}
            />,
            <ButtonComponent
                key="send"
                type="primary"
                title="Send for Signing"
                onClick={handleSendLease}
                loading={isLoading}
                disabled={status === 'loading'}
            />
        ];
    };

    return (
        <Modal
            title={status === 'success' ? "Success" :
                status === 'error' ? "Error" :
                    "Send Lease for Signing"}
            open={visible}
            onCancel={status === 'loading' ? undefined : onClose}
            footer={renderFooter()}
            closable={status !== 'loading'}
            maskClosable={status !== 'loading'}
        >
            {renderModalContent()}
        </Modal>
    );
};

export default LeaseSendModalComponent;