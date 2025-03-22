// LeaseModalComponent.tsx
import { useState, useEffect } from "react";
import { Form, Input, Modal, Select, Spin, DatePicker, message } from "antd";
import ButtonComponent from "./reusableComponents/ButtonComponent";
import axios from "axios";
import dayjs from "dayjs";
import { LeaseData } from "../types/types.ts";

const { Option } = Select;

// Add the interfaces from LeaseAddModalComponent
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

// Define the different modal modes
type ModalMode = "add" | "send" | "renew";

interface LeaseModalProps {
    visible: boolean;
    onClose: () => void;
    mode: ModalMode;
    selectedLease?: LeaseData | null;
    API_URL: string;
}

export const LeaseModalComponent = ({
    visible,
    onClose,
    mode,
    selectedLease,
    API_URL
}: LeaseModalProps) => {
    const [form] = Form.useForm();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loadingTenants, setLoadingTenants] = useState(false);
    const [loadingApartments, setLoadingApartments] = useState(false);

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

    // Function to reset the modal state
    const handleReset = () => {
        setStatus('idle');
        setErrorMessage("");
    };

    // Set titles and actions based on mode
    const getModalTitle = () => {
        switch (mode) {
            case "add": return "Add New Lease";
            case "send": return "Send Lease for Signing";
            case "renew": return "Renew Lease";
        }
    };

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

    // Initialize form values based on mode and selected lease
    useEffect(() => {
        if (visible) {
            // Reset state on new modal open
            setStatus('idle');
            setErrorMessage("");

            // Mode-specific initializations
            if (mode === "add") {
                fetchTenantsWithoutLease();
                fetchAvailableApartments();
                form.resetFields();
                // Set default values
                form.setFieldsValue({
                    start_date: dayjs(),
                    end_date: dayjs().add(1, 'year')
                });
            } else if (mode === "send" || mode === "renew") {
                // Set form values from selectedLease
                if (selectedLease) {
                    form.setFieldsValue({
                        tenant_name: selectedLease.tenantName,
                        property_address: selectedLease.apartment,
                        rent_amount: selectedLease.rentAmount,
                        start_date: selectedLease.formattedStartDate,
                        end_date: selectedLease.formattedEndDate
                    });
                }
            }
        }
    }, [visible, selectedLease, mode, form]);

    // Render different form fields based on mode
    const renderFormFields = () => {
        switch (mode) {
            case "add":
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

            case "send":
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

            case "renew":
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

    // Handle form submission based on mode
    const handleSubmit = async () => {
        try {
            // Validate form fields
            await form.validateFields();
            setStatus('loading');

            const values = form.getFieldsValue();
            let response;

            switch (mode) {
                case "add":
                    // Find the selected tenant
                    const selectedTenant = tenants.find(t => t.id === values.tenant_id);
                    if (!selectedTenant) {
                        throw new Error("Selected tenant not found");
                    }

                    // Find selected apartment
                    const selectedApartment = apartments.find(a => a.id === values.apartment_id);
                    let propertyAddress = values.property_address;

                    // If an apartment is selected, use its unit number as the property address
                    if (selectedApartment) {
                        propertyAddress = String(selectedApartment.unit_number);
                    }

                    // Format dates
                    const startDateStr = values.start_date.format('YYYY-MM-DD');
                    const endDateStr = values.end_date.format('YYYY-MM-DD');

                    // Prepare payload for add mode
                    const addPayload = {
                        tenant_id: values.tenant_id,
                        apartment_id: values.apartment_id,
                        tenant_name: `${selectedTenant.firstName} ${selectedTenant.lastName}`,
                        tenant_email: selectedTenant.email,
                        property_address: String(propertyAddress),
                        rent_amount: values.rent_amount || (selectedApartment ? selectedApartment.price : 0),
                        start_date: startDateStr,
                        end_date: endDateStr,
                        document_title: `Lease Agreement for ${propertyAddress}`,
                        status: "draft",
                        check_existing: true
                    };

                    console.log("Sending add lease payload:", addPayload);

                    response = await axios.post(
                        `${API_URL}/admin/tenants/leases/create`,
                        addPayload,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        }
                    );

                    setStatus('success');
                    message.success("New lease has been created in draft status!");
                    break;

                case "send":
                    if (!selectedLease?.id) {
                        throw new Error("Missing lease ID");
                    }

                    response = await axios.post(
                        `${API_URL}/admin/tenants/leases/send/${selectedLease.id}`,
                        {}, // No payload required
                        {
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );

                    setStatus("success");
                    message.success("Lease successfully sent for signing!");
                    break;


                case "renew":
                    // Handle renew logic
                    // Format dates
                    const renewStartDateStr = values.start_date.format('YYYY-MM-DD');
                    const renewEndDateStr = values.end_date.format('YYYY-MM-DD');

                    const renewPayload = {
                        tenant_id: selectedLease?.tenantId || selectedLease?.id,
                        apartment_id: selectedLease?.apartmentId || selectedLease?.id,
                        tenant_name: values.tenant_name,
                        tenant_email: selectedLease?.tenantEmail || `${values.tenant_name.replace(/\s+/g, '.')}@example.com`,
                        property_address: String(values.property_address),
                        rent_amount: parseFloat(values.rent_amount),
                        start_date: renewStartDateStr,
                        end_date: renewEndDateStr,
                        document_title: `Lease Agreement Renewal for ${values.property_address}`,
                        previous_lease_id: selectedLease?.id,
                        status: "pending_tenant_approval",
                        check_existing: true
                    };

                    response = await axios.post(
                        `${API_URL}/admin/tenants/leases/renew`,
                        renewPayload,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        }
                    );

                    setStatus('success');
                    message.success("Lease renewed successfully!");
                    break;
            }

            console.log(`${mode} operation result:`, response?.data);

            // Wait 2 seconds before closing for user to see success message
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (error: any) {
            setStatus('error');

            if (error.response) {
                const errMsg = error.response.data || `Failed to ${mode} lease`;
                setErrorMessage(`Server error: ${errMsg}`);
                message.error(`Error: ${errMsg}`);
            } else if (error.request) {
                setErrorMessage("No response from server. Please try again.");
                message.error("No response from server. Please try again.");
            } else {
                setErrorMessage(error.message || "Please check the form fields and try again.");
                message.error("Please check the form fields and try again.");
            }

            console.error(`Error in ${mode} operation:`, error);
        }
    };

    // Content based on current status
    const renderModalContent = () => {
        switch (status) {
            case 'loading':
                return (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <Spin size="large" />
                        <p style={{ marginTop: '10px' }}>
                            {mode === "add" ? "Creating lease..." :
                                mode === "send" ? "Sending lease for signing..." :
                                    "Renewing lease..."}
                        </p>
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
                        <h3 className="text-lg font-semibold mb-2">
                            {mode === "add" ? "Lease Successfully Created!" :
                                mode === "send" ? "Lease Successfully Sent!" :
                                    "Lease Successfully Renewed!"}
                        </h3>
                        <p className="text-gray-500 mb-4">
                            {mode === "add" ? "The lease has been created in draft status." :
                                mode === "send" ? "The lease has been sent for signing." :
                                    "The lease has been renewed and sent for signing."}
                        </p>
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
                        <h3 className="text-lg font-semibold mb-2">
                            {mode === "add" ? "Failed to Create Lease" :
                                mode === "send" ? "Failed to Send Lease" :
                                    "Failed to Renew Lease"}
                        </h3>
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
                return renderFormFields();
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
                key="submit"
                type="primary"
                title={mode === "add" ? "Create Draft Lease" :
                    mode === "send" ? "Send for Signing" :
                        "Renew Lease"}
                onClick={handleSubmit}
                loading={status === 'loading'}
                disabled={status === 'loading'}
            />
        ];
    };

    return (
        <Modal
            title={status === 'success' ? "Success" :
                status === 'error' ? "Error" :
                    getModalTitle()}
            open={visible}
            onCancel={status === 'loading' ? undefined : onClose}
            footer={renderFooter()}
            closable={status !== 'loading'}
            maskClosable={status !== 'loading'}
            width={700}
        >
            {renderModalContent()}
        </Modal>
    );
};