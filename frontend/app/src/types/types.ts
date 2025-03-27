import dayjs from 'dayjs';
export type GetApartment = {
    id: number;
    unitNumber: number | null;
    price: number | null;
    size: number | null;
    managementId: number;
    availability: boolean;
};
export interface LeaseData {
    id: number;
    tenantId: number;
    apartmentId: number;
    tenantEmail: string;
    tenantName: string;
    apartment: string;
    leaseStartDate: string;
    leaseEndDate: string;
    rentAmount: number;
    status: string;
}

export type WorkCategory = "plumbing" | "electric" | "carpentry" | "hvac" | "other";
export type WorkStatus = "open" | "in_progress" | "resolved" | "closed";

export type WorkOrderEntry = {
    category: WorkCategory;
    title: string;
    description: string;
    UnitNumber: number;
};

export interface WorkOrderData {
    key: number;
    workOrderNumber: number;
    creatingBy: number; // this is the user from tenant table that created ticket
    category: WorkCategory;
    title: string;
    description: string;
    unitNumber: string;
    status: WorkStatus;
    createdAt: Date;
    updatedAt: Date;
}

export type ComplaintCategory = "maintenance" | "noise" | "security" | "parking" | "neighbor" | "trash" | "internet" | "lease" | "natural_disaster" | "other";
export type ComplaintStatus = "open" | "in_progress" | "resolved" | "closed";

export interface ComplaintData {
    id: number;
    complaintNumber: number;
    createdBy: number;
    category: ComplaintCategory;
    title: string;
    description: string;
    unitNumber: number;
    status: ComplaintStatus;
    updatedAt: string;
    createdAt: string;
}

export type ComplaintEntry = {
    title: string;
    description: string;
    category: ComplaintCategory;
    unit_number: number;
};

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

export interface Parking {
    id: number;
    created_by: number;
    updated_at: string;
    // 2 days long
    expires_at: string;
}

export interface ParkingEntry {
    created_by: number;
    car_color: string;
    car_make: string;
    license_plate: string;
}

export type ClerkPublicMetadata = {
    Db_id: number;
    role: Role;
};
