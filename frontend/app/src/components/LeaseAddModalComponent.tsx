import { useState, useEffect } from "react";
import { Form, Input, Modal, Select, Spin, DatePicker, message } from "antd";
import ButtonComponent from "./reusableComponents/ButtonComponent";
import axios from "axios";
import dayjs from "dayjs";

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

interface LeaseAddModalComponentProps {
    visible: boolean;
    onClose: () => void;
}

export const LeaseAddModalComponent: React.FC<LeaseAddModalComponentProps> = ({ visible, onClose }) => {
    const [form] = Form.useForm();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loadingTenants, setLoadingTenants] = useState(false);
    const [loadingApartments, setLoadingApartments] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>("");

    // Fetch data when modal opens
    useEffect(() => {
        if (visible) {
            fetchTenantsWithoutLease();
            fetchAvailableApartments();
            // Reset state and form when modal opens
            setStatus('idle');
            setErrorMessage("");
            form.resetFields();
        }
    }, [visible, form]);

    const fetchTenantsWithoutLease = async () => {
        try {
            setLoadingTenants(true);
            const response = await axios.get(`${API_URL}/admin/tenants/leases/without-lease`);

            // Transform the data to match our interface
            const formattedTenants = response.data.map((tenant: any) => ({
                id: tenant.id,
                firstName: tenant.first_name,
                lastName: tenant.last_name,
                email: tenant.email,
                unitNumber: tenant.unit_number?.value
            }));

            setTenants(formattedTenants);
        } catch (err) {
            console.error("Error fetching tenants without lease:", err);
            message.error("Failed to fetch tenants without lease");
            setTenants([]); // Initialize with empty array on error
        } finally {
            setLoadingTenants(false);
        }
    };

    const fetchAvailableApartments = async () => {
        try {
            setLoadingApartments(true);
            const response = await axios.get(`${API_URL}/admin/tenants/leases/apartments-available`);
            setApartments(response.data || []);
        } catch (err) {
            console.error("Error fetching available apartments:", err);
            message.error("Failed to fetch available apartments");
            setApartments([]); // Initialize with empty array on error
        } finally {
            setLoadingApartments(false);
        }
    };

    const handleAddLease = async () => {
        try {
            // Validate form fields
            await form.validateFields();
            setStatus('loading');

            const values = form.getFieldsValue();

            // Find the selected tenant
            const selectedTenant = tenants.find(t => t.id === values.tenant_id);
            if (!selectedTenant) {
                throw new Error("Selected tenant not found");
            }

            // Find selected apartment
            const selectedApartment = apartments.find(a => a.id === values.apartment_id);
            let propertyAddress = values.property_address;

            // If an apartment is selected, use its unit number as the property address (as a string)
            if (selectedApartment) {
                propertyAddress = String(selectedApartment.unit_number);
            }

            // Format dates
            const startDateStr = values.start_date.format('YYYY-MM-DD');
            const endDateStr = values.end_date.format('YYYY-MM-DD');


            // Prepare payload
            const payload = {
                tenant_id: values.tenant_id,
                apartment_id: values.apartment_id,
                tenant_name: `${selectedTenant.firstName} ${selectedTenant.lastName}`,
                tenant_email: selectedTenant.email,
                property_address: propertyAddress, // This is now guaranteed to be a string
                rent_amount: values.rent_amount || (selectedApartment ? selectedApartment.price : 0),
                start_date: startDateStr,
                end_date: endDateStr,
                document_title: `Lease Agreement for ${propertyAddress}`,
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

    // When apartment is selected, update the rent amount if available
    const handleApartmentChange = (apartmentId: number) => {
        const selectedApartment = apartments.find(a => a.id === apartmentId);
        if (selectedApartment) {
            form.setFieldsValue({
                rent_amount: selectedApartment.price,
                property_address: String(selectedApartment.unit_number) // Convert to string
            });
        }
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
                        <h3 className="text-lg font-semibold mb-2">Failed to Create Lease</h3>
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
                            label="Tenant"
                            name="tenant_id"
                            rules={[{ required: true, message: "Please select a tenant" }]}
                        >
                            <Select
                                placeholder="Select a tenant"
                                loading={loadingTenants}
                                notFoundContent={loadingTenants ? <Spin size="small" /> : "No tenants available"}
                            >
                                {tenants && tenants.length > 0 ? tenants.map(tenant => (
                                    <Option key={tenant.id} value={tenant.id}>
                                        {`${tenant.firstName} ${tenant.lastName}`}
                                        {tenant.unitNumber ? ` (Unit: ${tenant.unitNumber})` : ''}
                                    </Option>
                                )) : null}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="Apartment"
                            name="apartment_id"
                            rules={[{ required: true, message: "Please select an apartment" }]}
                        >
                            <Select
                                placeholder="Select an apartment"
                                loading={loadingApartments}
                                notFoundContent={loadingApartments ? <Spin size="small" /> : "No apartments available"}
                                onChange={handleApartmentChange}
                            >
                                {apartments && apartments.length > 0 ? apartments.map(apartment => (
                                    <Option key={apartment.id} value={apartment.id}>
                                        {`Unit ${apartment.unit_number} - $${apartment.price}/month`}
                                        {apartment.size ? ` (${apartment.size} sq ft)` : ''}
                                    </Option>
                                )) : null}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="Property Address"
                            name="property_address"
                            rules={[{ required: true, message: "Please enter property address" }]}
                        >
                            <Input />
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
                            initialValue={dayjs()}
                            rules={[{ required: true, message: "Please select lease start date" }]}
                        >
                            <DatePicker style={{ width: "100%" }} />
                        </Form.Item>

                        <Form.Item
                            label="Lease End Date"
                            name="end_date"
                            initialValue={dayjs().add(1, 'year')}
                            rules={[
                                { required: true, message: "Please select lease end date" },
                                { validator: validateEndDate }
                            ]}
                        >
                            <DatePicker style={{ width: "100%" }} />
                        </Form.Item>
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
                title="Create Lease"
                onClick={handleAddLease}
                loading={status === 'loading'}
                disabled={status === 'loading'}
            />
        ];
    };

    return (
        <Modal
            title={status === 'success' ? "Success" :
                status === 'error' ? "Error" :
                    "Add New Lease"}
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

export default LeaseAddModalComponent;