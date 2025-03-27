// LeaseModalComponent.tsx with TanStack Query using fetch API - TypeScript fixed
import { useState, useEffect } from "react";
import { Form, Input, Modal, Select, Spin, DatePicker, message } from "antd";
import ButtonComponent from "./reusableComponents/ButtonComponent";
import dayjs from "dayjs";
import { LeaseData } from "../types/types.ts";
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";


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
type ModalMode = "add" | "send" | "renew" | "amend";

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

    const { getToken } = useAuth();
    const queryClient = useQueryClient();

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
            case "amend": return "Amend Lease";
        }
    };

    // Query for tenants without lease
    const {
        data: tenants = [],
        isLoading: loadingTenants,
    } = useQuery<Tenant[]>({
        queryKey: ['tenants', 'without-lease'],
        queryFn: async () => {
            const token = await getToken();
            if (!token) throw new Error("Authentication token required");

            const response = await fetch(`${API_URL}/admin/leases/without-lease`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tenants: ${response.statusText}`);
            }

            const data = await response.json();

            // Transform the data to match our interface
            return data.map((tenant: any) => ({
                id: tenant.id,
                firstName: tenant.first_name,
                lastName: tenant.last_name,
                email: tenant.email,
                unitNumber: tenant.unit_number?.value
            }));
        },
        enabled: visible && mode === "add",
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1
    });

    // Query for available apartments
    const {
        data: apartments = [],
        isLoading: loadingApartments,
    } = useQuery<Apartment[]>({
        queryKey: ['apartments', 'available'],
        queryFn: async () => {
            const token = await getToken();
            if (!token) throw new Error("Authentication token required");

            const response = await fetch(`${API_URL}/admin/leases/apartments-available`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch apartments: ${response.statusText}`);
            }

            const data = await response.json();
            return data || [];
        },
        enabled: visible && (mode === "add" || mode === "amend"), // Enable for both modes
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1
    });

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




    // Terminate Lease Mutation (for active leases)
    const terminateLeaseMutation = useMutation({
        mutationFn: async (leaseId: number) => {
            const token = await getToken();
            if (!token) throw new Error("Authentication token required");

            const response = await fetch(
                `${API_URL}/admin/leases/terminate/${leaseId}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || response.statusText);
            }

            return await response.json();
        },
        onSuccess: () => {
            setStatus('success');
            message.success("Lease terminated successfully!");
            queryClient.invalidateQueries({ queryKey: ['tenants', 'leases'] });

            setTimeout(() => {
                onClose();
            }, 2000);
        },
        onError: (error: Error) => {
            setStatus('error');
            const errMsg = error.message || "Failed to terminate lease";
            setErrorMessage(`Server error: ${errMsg}`);
            message.error(`Error: ${errMsg}`);
            console.error("Error in terminate operation:", error);
        }
    });

    // Cancel Lease Mutation (for pending_approval leases)
    const cancelLeaseMutation = useMutation({
        mutationFn: async (leaseId: number) => {
            const token = await getToken();
            if (!token) throw new Error("Authentication token required");

            // You might need to create a new endpoint for cancel if it doesn't exist yet
            const response = await fetch(
                `${API_URL}/admin/leases/cancel/${leaseId}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || response.statusText);
            }

            return await response.json();
        },
        onSuccess: () => {
            setStatus('success');
            message.success("Lease canceled successfully!");
            queryClient.invalidateQueries({ queryKey: ['tenants', 'leases'] });

            setTimeout(() => {
                onClose();
            }, 2000);
        },
        onError: (error: Error) => {
            setStatus('error');
            const errMsg = error.message || "Failed to cancel lease";
            setErrorMessage(`Server error: ${errMsg}`);
            message.error(`Error: ${errMsg}`);
            console.error("Error in cancel operation:", error);
        }
    });
    // Add Lease Mutation
    const addLeaseMutation = useMutation({
        mutationFn: async (values: any) => {
            const token = await getToken();
            if (!token) throw new Error("Authentication token required");

            // Find the selected tenant
            const selectedTenant = tenants.find(t => t.id === values.tenant_id);
            if (!selectedTenant) throw new Error("Selected tenant not found");

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

            const response = await fetch(
                `${API_URL}/admin/leases/create`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(addPayload)
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || response.statusText);
            }

            return await response.json();
        },
        onSuccess: () => {
            setStatus('success');
            message.success("New lease has been created in draft status!");
            // Invalidate and refetch relevant queries
            queryClient.invalidateQueries({ queryKey: ['tenants', 'leases'] });

            // Wait 2 seconds before closing for user to see success message
            setTimeout(() => {
                onClose();
            }, 2000);
        },
        onError: (error: Error) => {
            setStatus('error');
            const errMsg = error.message || "Failed to create lease";
            setErrorMessage(`Server error: ${errMsg}`);
            message.error(`Error: ${errMsg}`);
            console.error("Error in add operation:", error);
        }
    });

    // Send Lease Mutation
    const sendLeaseMutation = useMutation({
        mutationFn: async () => {
            if (!selectedLease?.id) {
                throw new Error("Missing lease ID");
            }

            const token = await getToken();
            if (!token) throw new Error("Authentication token required");

            const response = await fetch(
                `${API_URL}/admin/leases/send/${selectedLease.id}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || response.statusText);
            }

            return await response.json();
        },
        onSuccess: () => {
            setStatus("success");
            message.success("Lease successfully sent for signing!");
            queryClient.invalidateQueries({ queryKey: ['tenants', 'leases'] });

            setTimeout(() => {
                onClose();
            }, 2000);
        },
        onError: (error: Error) => {
            setStatus('error');
            const errMsg = error.message || "Failed to send lease";
            setErrorMessage(`Server error: ${errMsg}`);
            message.error(`Error: ${errMsg}`);
            console.error("Error in send operation:", error);
        }
    });

    // Renew Lease Mutation
    const renewLeaseMutation = useMutation({
        mutationFn: async (values: any) => {
            const token = await getToken();
            if (!token) throw new Error("Authentication token required");

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
                status: "pending_approval",
                check_existing: true
            };

            const response = await fetch(
                `${API_URL}/admin/leases/renew`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(renewPayload)
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || response.statusText);
            }

            return await response.json();
        },
        onSuccess: () => {
            setStatus('success');
            message.success("Lease renewed successfully!");
            queryClient.invalidateQueries({ queryKey: ['tenants', 'leases'] });

            setTimeout(() => {
                onClose();
            }, 2000);
        },
        onError: (error: Error) => {
            setStatus('error');
            const errMsg = error.message || "Failed to renew lease";
            setErrorMessage(`Server error: ${errMsg}`);
            message.error(`Error: ${errMsg}`);
            console.error("Error in renew operation:", error);
        }
    });

    const amendLeaseMutation = useMutation({
        mutationFn: async (values: any) => {
            const token = await getToken();
            if (!token) throw new Error("Authentication token required");

            // Format dates
            const amendStartDateStr = values.start_date.format('YYYY-MM-DD');
            const amendEndDateStr = values.end_date.format('YYYY-MM-DD');

            // Determine apartment ID and property address
            // If new apartment is selected, use that; otherwise use the existing one
            const apartmentId = values.new_apartment_id || selectedLease?.apartmentId;
            const propertyAddress = values.new_apartment_id ?
                values.new_property_address :
                values.property_address;

            // Build a reason that includes apartment change if applicable
            let amendmentReason = values.amendment_reason;
            if (values.new_apartment_id) {
                amendmentReason = `Apartment change to ${values.new_property_address}. ${values.amendment_reason}`;
            }

            const amendPayload = {
                tenant_id: selectedLease?.tenantId || selectedLease?.id,
                apartment_id: apartmentId,
                tenant_name: values.tenant_name,
                tenant_email: selectedLease?.tenantEmail || `${values.tenant_name.replace(/\s+/g, '.')}@example.com`,
                property_address: String(propertyAddress),
                rent_amount: parseFloat(values.rent_amount),
                start_date: amendStartDateStr,
                end_date: amendEndDateStr,
                document_title: `Lease Agreement Amendment for ${propertyAddress}`,
                previous_lease_id: selectedLease?.id,
                amendment_reason: amendmentReason,
                status: "pending_approval",
                check_existing: false, // Don't check for existing as this is an amendment
                is_amendment: true
            };

            console.log("Sending amend payload:", amendPayload);

            const response = await fetch(
                `${API_URL}/admin/leases/amend`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(amendPayload)
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || response.statusText);
            }

            return await response.json();
        },
        onSuccess: () => {
            setStatus('success');
            message.success("Lease amendment created successfully!");
            queryClient.invalidateQueries({ queryKey: ['tenants', 'leases'] });

            setTimeout(() => {
                onClose();
            }, 2000);
        },
        onError: (error: Error) => {
            setStatus('error');
            const errMsg = error.message || "Failed to amend lease";
            setErrorMessage(`Server error: ${errMsg}`);
            message.error(`Error: ${errMsg}`);
            console.error("Error in amend operation:", error);
        }
    });

    // Initialize form values based on mode and selected lease
    useEffect(() => {
        if (visible) {
            // Reset state on new modal open
            setStatus('idle');
            setErrorMessage("");

            // Mode-specific initializations
            if (mode === "add") {
                form.resetFields();
                // Set default values
                form.setFieldsValue({
                    start_date: dayjs(),
                    end_date: dayjs().add(1, 'year')
                });
            } else if (mode === "send") {
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
            } else if (mode === "renew") {
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
            } else if (mode === "amend") {
                // Set form values from selectedLease for amendment
                if (selectedLease) {
                    console.log("Setting form values for amend mode with selectedLease:", selectedLease);
                    form.setFieldsValue({
                        tenant_name: selectedLease.tenantName,
                        property_address: selectedLease.apartment,
                        rent_amount: selectedLease.rentAmount,
                        start_date: selectedLease.formattedStartDate,
                        end_date: selectedLease.formattedEndDate,
                        amendment_reason: '',
                        new_apartment_id: undefined,
                        new_property_address: undefined
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
                                showSearch
                                optionFilterProp="children"
                                filterOption={(input, option) => {
                                    // Make sure we have a valid string to search against
                                    const childText = option?.children ? String(option.children) : '';
                                    return childText.toLowerCase().includes(input.toLowerCase());
                                }}
                                notFoundContent={loadingTenants ? <Spin size="small" /> : "No tenants available"}
                                listHeight={256}
                                virtual={true}
                                popupMatchSelectWidth={false}
                                style={{ width: '100%' }}
                            >
                                {tenants && tenants.length > 0 ? tenants.map((tenant: Tenant) => (
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
                                showSearch
                                optionFilterProp="children"
                                filterOption={(input, option) => {
                                    // Make sure we have a valid string to search against
                                    const childText = option?.children ? String(option.children) : '';
                                    return childText.toLowerCase().includes(input.toLowerCase());
                                }}
                                notFoundContent={loadingApartments ? <Spin size="small" /> : "No apartments available"}
                                onChange={handleApartmentChange}
                                listHeight={256}
                                virtual={true}
                                popupMatchSelectWidth={false}
                                style={{ width: '100%' }}
                            >
                                {apartments && apartments.length > 0 ? apartments.map((apartment: Apartment) => (
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
                            <DatePicker style={{ width: "100%" }} disabled />
                        </Form.Item>

                        <Form.Item
                            label="Lease End Date"
                            name="end_date"
                            rules={[
                                { required: true, message: "Please select lease end date" },
                                { validator: validateEndDate }
                            ]}
                        >
                            <DatePicker style={{ width: "100%" }} disabled />
                        </Form.Item>

                        <div className="text-gray-500 text-sm mb-2">
                            <p>Note: The lease will be sent with the original start and end dates. These dates cannot be modified.</p>
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

            case "amend":
                return (
                    <Form form={form} layout="vertical">
                        <Form.Item label="Tenant Name" name="tenant_name">
                            <Input disabled />
                        </Form.Item>

                        {/* Current Apartment (read-only) */}
                        <Form.Item label="Current Property/Apartment" name="property_address">
                            <Input disabled />
                        </Form.Item>

                        {/* New Apartment Selection */}
                        <Form.Item
                            label="New Apartment (Optional)"
                            name="new_apartment_id"
                            help="Select only if changing apartments. Leave blank to keep current apartment."
                        >
                            <Select
                                placeholder="Select a new apartment"
                                loading={loadingApartments}
                                allowClear
                                showSearch
                                optionFilterProp="children"
                                filterOption={(input, option) => {
                                    // Make sure we have a valid string to search against
                                    const childText = option?.children ? String(option.children) : '';
                                    return childText.toLowerCase().includes(input.toLowerCase());
                                }}
                                notFoundContent={loadingApartments ? <Spin size="small" /> : "No apartments available"}
                                listHeight={256} // Set a fixed height for the dropdown
                                virtual={true}   // Enable virtual scrolling for better performance
                                popupMatchSelectWidth={false} // Allow dropdown to be wider than the select
                                style={{ width: '100%' }}
                                onChange={(value) => {
                                    if (value) {
                                        const selectedApt = apartments.find((a: Apartment) => a.id === value);
                                        if (selectedApt) {
                                            form.setFieldsValue({
                                                new_property_address: `Unit ${selectedApt.unit_number}`,
                                                // Optionally update rent if needed
                                                // rent_amount: selectedApt.price
                                            });
                                        }
                                    } else {
                                        form.setFieldsValue({
                                            new_property_address: undefined
                                        });
                                    }
                                }}
                            >
                                {apartments && apartments.length > 0 ? apartments.map((apartment: Apartment) => (
                                    <Option key={apartment.id} value={apartment.id}>
                                        {`Unit ${apartment.unit_number} - $${apartment.price}/month`}
                                        {apartment.size ? ` (${apartment.size} sq ft)` : ''}
                                    </Option>
                                )) : null}
                            </Select>
                        </Form.Item>

                        {/* New Property Address (auto-populated) */}
                        <Form.Item
                            label="New Property Address"
                            name="new_property_address"
                            hidden={!form.getFieldValue('new_apartment_id')}
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

                        <Form.Item
                            label="Reason for Amendment"
                            name="amendment_reason"
                            rules={[{ required: true, message: "Please provide a reason for the amendment" }]}
                        >
                            <Input.TextArea rows={4} placeholder="Describe the changes being made to the lease agreement" />
                        </Form.Item>

                        <div className="text-gray-500 text-sm mb-2">
                            <p>Note: Amending this lease will create a new version that requires tenant approval. The original lease remains active until the amendment is approved.</p>
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

            // Call the appropriate mutation based on mode
            switch (mode) {
                case "add":
                    addLeaseMutation.mutate(values);
                    break;

                case "send":
                    sendLeaseMutation.mutate();
                    break;

                case "renew":
                    renewLeaseMutation.mutate(values);
                    break;

                case "amend":
                    amendLeaseMutation.mutate(values);
                    break;
            }
        } catch (error: any) {
            console.error(`Form validation error:`, error);
            message.error("Please check the form fields and try again.");
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
                                    mode === "renew" ? "Renewing lease..." :
                                        "Creating lease amendment..."}
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
                                    mode === "renew" ? "Lease Successfully Renewed!" :
                                        "Lease Amendment Successfully Created!"}
                        </h3>
                        <p className="text-gray-500 mb-4">
                            {mode === "add" ? "The lease has been created in draft status." :
                                mode === "send" ? "The lease has been sent for signing." :
                                    mode === "renew" ? "The lease has been renewed and sent for signing." :
                                        "The lease amendment has been created and sent for tenant approval."}
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
                                    mode === "renew" ? "Failed to Renew Lease" :
                                        "Failed to Create Amendment"}
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

        const isLoading =
            addLeaseMutation.isPending ||
            sendLeaseMutation.isPending ||
            renewLeaseMutation.isPending ||
            amendLeaseMutation.isPending;

        return [
            <ButtonComponent
                key="cancel"
                type="default"
                title="Cancel"
                onClick={onClose}
                disabled={isLoading}
            />,
            <ButtonComponent
                key="submit"
                type="primary"
                title={mode === "add" ? "Create Draft Lease" :
                    mode === "send" ? "Send for Signing" :
                        mode === "renew" ? "Renew Lease" :
                            "Create Amendment"}
                onClick={handleSubmit}
                loading={isLoading}
                disabled={isLoading}
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