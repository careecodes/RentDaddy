export type LeaseStatus = "draft" | "pending_approval" | "active" | "expired" | "terminated" | "renewed";

export interface LeaseData {
    key: number;
    tenantName: string;
    apartment: string;
    leaseStartDate: string;
    leaseEndDate: string;
    rentAmount: number;
    status: string;
}

export interface WorkOrderData {
    key: number;
    workOrderNumber: number;
    creatingBy: number; // this is the user from tenant table that created ticket
    category: "plumbing" | "electrical" | "carpentry" | "hvac" | "other";
    title: string;
    description: string;
    unitNumber: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    createdAt: Date;
    updatedAt: Date;
}

export interface ComplaintsData {
    key: number;
    complaintNumber: number;
    createdBy: number;
    category: "maintenance" | "noise" | "security" | "parking" | "neighbor" | "trash" | "internet" | "lease" | "natural_disaster" | "other";
    title: string;
    description: string;
    unitNumber: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    createdAt: Date;
    updatedAt: Date;
}

// Defines a generic type for user-related tables
export interface UserData {
    key: React.Key;
    name: string;
    email: string;
    role: "admin" | "user";
}
export type Role = "admin" | "tenant";
export type AccountStatus = "active" | "inactive" | "suspended";

export type User = {
    id: number;
    clerk_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: Role;
    unit_number: number | null;
    status: AccountStatus;
    created_at: string;
};

export type TenantsWithLeaseStatus = {
    id: number;
    clerk_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: Role;
    unit_number: number | null;
    status: AccountStatus;
    created_at: string;
    lease_status: string;
    lease_start_date: string;
    lease_end_date: string;
};
// The below is from the examples of Ant Design.
export interface DataType {
    key: string;
    name: string;
    age: number;
    address: string;
}
