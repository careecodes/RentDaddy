import "../styles/styles.scss";
import { Dropdown, Input, Space } from "antd";
import type { TableProps, TablePaginationConfig, MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";

import dayjs from "dayjs";
import TableComponent from "../components/reusableComponents/TableComponent.tsx";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import { DownOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnType } from "antd/es/table";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import { LeaseData } from "../types/types.ts";
import { ItemType } from "antd/es/menu/interface";

const today = dayjs();

// Dummy lease data
const leaseDataRaw = [
    { key: 1, tenantName: "Grace Hall", apartment: "B218", leaseStartDate: "2024-06-13", leaseEndDate: "2024-12-13", rentAmount: 2060, status: "draft" },
    { key: 2, tenantName: "James Smith", apartment: "A212", leaseStartDate: "2024-03-20", leaseEndDate: "2024-09-20", rentAmount: 2223, status: "pending_approval" },
    { key: 3, tenantName: "Diego Lewis", apartment: "C466", leaseStartDate: "2024-05-01", leaseEndDate: "2025-05-01", rentAmount: 1100, status: "active" },
    { key: 4, tenantName: "Hector Wilson", apartment: "B179", leaseStartDate: "2024-10-02", leaseEndDate: "2025-10-02", rentAmount: 2150, status: "active" },
    { key: 5, tenantName: "Charlie Davis", apartment: "C378", leaseStartDate: "2024-11-03", leaseEndDate: "2025-11-03", rentAmount: 1803, status: "active" },
    { key: 6, tenantName: "JJ SchraderBachar", apartment: "A333", leaseStartDate: "2024-07-15", leaseEndDate: "2024-08-30", rentAmount: 1950, status: "expires_soon" },
    { key: 7, tenantName: "Rosalind Franklin", apartment: "D401", leaseStartDate: "2023-02-10", leaseEndDate: "2024-02-10", rentAmount: 1200, status: "expired" },
    { key: 8, tenantName: "Malik Johnson", apartment: "C299", leaseStartDate: "2024-07-01", leaseEndDate: "2025-07-01", rentAmount: 1400, status: "active" },
    { key: 9, tenantName: "Carree Brown", apartment: "B155", leaseStartDate: "2024-05-01", leaseEndDate: "2024-07-01", rentAmount: 1750, status: "terminated" },
    { key: 10, tenantName: "John Doe", apartment: "A101", leaseStartDate: "2024-04-20", leaseEndDate: "2024-10-20", rentAmount: 2000, status: "active" },
    { key: 11, tenantName: "Jane Smith", apartment: "B221", leaseStartDate: "2024-06-25", leaseEndDate: "2024-07-25", rentAmount: 2100, status: "expired" },
    { key: 12, tenantName: "Jill Hall", apartment: "D450", leaseStartDate: "2024-01-10", leaseEndDate: "2024-02-10", rentAmount: 1300, status: "terminated" },
    { key: 13, tenantName: "Emily Wildaughter", apartment: "C310", leaseStartDate: "2024-09-10", leaseEndDate: "2025-09-10", rentAmount: 1900, status: "active" },
    { key: 14, tenantName: "Charlie Chill", apartment: "A450", leaseStartDate: "2024-03-01", leaseEndDate: "2024-03-30", rentAmount: 1600, status: "expired" },
    { key: 15, tenantName: "Planter Lewis", apartment: "D180", leaseStartDate: "2024-12-01", leaseEndDate: "2025-06-01", rentAmount: 1700, status: "active" },
    { key: 16, tenantName: "Unfrank Thomas", apartment: "B222", leaseStartDate: "2024-10-10", leaseEndDate: "2025-04-10", rentAmount: 2200, status: "active" },
    { key: 17, tenantName: "Henry Clark", apartment: "C199", leaseStartDate: "2024-07-15", leaseEndDate: "2025-01-15", rentAmount: 1450, status: "active" },
    { key: 18, tenantName: "Danny Thompson", apartment: "A205", leaseStartDate: "2024-11-05", leaseEndDate: "2025-05-05", rentAmount: 1800, status: "active" },
    { key: 19, tenantName: "Dennis Garcia", apartment: "D299", leaseStartDate: "2024-08-20", leaseEndDate: "2024-09-20", rentAmount: 1550, status: "expires_soon" },
    { key: 20, tenantName: "Yoon Soon", apartment: "B305", leaseStartDate: "2024-09-15", leaseEndDate: "2025-09-15", rentAmount: 2000, status: "active" },
];

// This is the dropdown that performs a search in each column
const getColumnSearchProps = (dataIndex: keyof LeaseData, title: string): ColumnType<LeaseData> => {
    return {
        filterDropdown: (filterDropdownProps) => {
            return (
                <div style={{ padding: 8 }}>
                    <Input
                        placeholder={"Search " + title}
                        value={filterDropdownProps.selectedKeys[0]}
                        onChange={(e) => filterDropdownProps.setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    />
                    <ButtonComponent
                        type="primary"
                        title="Search"
                        icon={<SearchOutlined />}
                        size="small"
                        onClick={() => filterDropdownProps.confirm()}
                    />
                    <ButtonComponent
                        type="default"
                        title="Reset"
                        size="small"
                        onClick={() => {
                            filterDropdownProps.clearFilters && filterDropdownProps.clearFilters();
                            filterDropdownProps.confirm();
                        }}
                    />
                </div>
            );
        },
        filterIcon: function (filtered) {
            return <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />;
        },
        onFilter: function (value, record) {
            return record[dataIndex].toString().toLowerCase().includes(value.toString().toLowerCase());
        },
    };
};

// This is to style and provide a title for each tenant status
const getStatusAlertType = (status: string) => {
    switch (status) {
        case "active":
            return { type: "success", message: "Active" };
        case "expired":
            return { type: "error", message: "Expired" };
        case "pending_approval":
            return { type: "info", message: "Pending Approval" };
        case "terminated":
            return { type: "error", message: "Terminated" };
        case "draft":
            return { type: "warning", message: "Draft" };
        case "expires_soon":
            return { type: "warning", message: "Expiring Soon" };
        default:
            return { type: "info", message: status };
    }
};

// Button actions -> will be used for backend calls
const sendLease = (record: LeaseData) => {
    console.log(`Sending lease for ${record.tenantName}`);
};

const terminateLease = (record: LeaseData) => {
    console.log(`Terminating lease for ${record.tenantName}`);
};

const sendRenewal = (record: LeaseData) => {
    console.log(`Sending renewal for ${record.tenantName}`);
};

// Setup of lease columns for all LeaseData properties

const leaseColumns: ColumnsType<LeaseData> = [
    {
        title: "Tenant Name",
        fixed: "left",
        dataIndex: "tenantName",
        key: "tenantName",
        sorter: (a, b) => a.tenantName.localeCompare(b.tenantName),
        ...getColumnSearchProps("tenantName", "Tenant Name"),
        className: "text-primary text-left",
    },
    {
        title: "Apt",
        dataIndex: "apartment",
        key: "apartment",
        ellipsis: true,
        sorter: (a, b) => a.apartment.localeCompare(b.apartment),
        ...getColumnSearchProps("apartment", "Apartment"),
        className: "text-secondary text-left",
    },
    {
        title: "Lease Start",
        dataIndex: "leaseStartDate",
        key: "leaseStartDate",
        ...getColumnSearchProps("leaseStartDate", "Lease Start"),
        sorter: (a, b) => dayjs(a.leaseStartDate).unix() - dayjs(b.leaseStartDate).unix(),
    },
    {
        title: "Lease End",
        dataIndex: "leaseEndDate",
        key: "leaseEndDate",
        ...getColumnSearchProps("leaseEndDate", "Lease End"),
        sorter: (a, b) => dayjs(a.leaseEndDate).unix() - dayjs(b.leaseEndDate).unix(),
    },
    {
        title: "Rent Amount ($)",
        dataIndex: "rentAmount",
        key: "rentAmount",
        sorter: (a, b) => a.rentAmount - b.rentAmount,
        ...getColumnSearchProps("rentAmount", "Rent Amount"),
        className: "fw-bold text-right",
    },
    {
        title: "Status",
        dataIndex: "status",
        filters: [
            { text: "Active", value: "active" },
            { text: "Expired", value: "expired" },
            { text: "Pending Approval", value: "pending_approval" },
            { text: "Terminated", value: "terminated" },
            { text: "Draft", value: "draft" },
            { text: "Expiring Soon", value: "expires_soon" },
        ],
        onFilter: (value, record) => record.status.includes(value as string),
        render: (status) => {
            const { type, message } = getStatusAlertType(status);
            return (
                <AlertComponent
                    title={message}
                    type={type}
                />
            );
        },
        sorter: (a, b) => a.status.localeCompare(b.status),
        className: "text-center",
    },
    {
        title: "Actions",
        fixed: "right",
        width: 100,
        key: "actions",
        render: (_, record) => (
            <Space size="middle">
                {record.status === "draft" && (
                    <ButtonComponent
                        type="primary"
                        title="Send Lease"
                        onClick={() => sendLease(record)}
                    />
                )}
                {record.status === "active" && (
                    <ButtonComponent
                        type="danger"
                        title="Terminate"
                        onClick={() => terminateLease(record)}
                    />
                )}
                {record.status === "expires_soon" && (
                    <>
                        <div className="flex flex-column gap-2">
                            {" "}
                            <ButtonComponent
                                type="danger"
                                title="Terminate"
                                onClick={() => terminateLease(record)}
                            />
                            <ButtonComponent
                                type="primary"
                                title="Send Renewal"
                                onClick={() => sendRenewal(record)}
                            />
                        </div>
                    </>
                )}
            </Space>
        ),
        className: "text-left",
    },
];

// Get the lease status of each record. We don't care about terminated, draft, or pending approval.
// For expired or expires_soon, we need to check against lease end date:
// 1) if it already ended, dynamically return "expired".
// 2) if it's less than 60 days, return "expires_soon"
// Otherwise, return active.
const getLeaseStatus = (record: { leaseEndDate: string; status: string }) => {
    const leaseEnd = dayjs(record.leaseEndDate);
    if (record.status === "terminated" || record.status === "draft" || record.status === "pending_approval") return record.status;
    if (leaseEnd.isBefore(today)) return "expired";
    if (leaseEnd.diff(today, "days") <= 60) return "expires_soon";
    return "active";
};

export default function AdminViewEditLeases() {
    const filteredData: LeaseData[] = leaseDataRaw.map(function (lease) {
        return {
            key: lease.key,
            tenantName: lease.tenantName,
            apartment: lease.apartment,
            leaseStartDate: lease.leaseStartDate,
            leaseEndDate: lease.leaseEndDate,
            rentAmount: lease.rentAmount,
            status: getLeaseStatus(lease),
        };
    });

    return (
        <div className="container overflow-hidden">
            <h1 className="p-3 text-primary">Admin View & Edit Leases</h1>

            <TableComponent<LeaseData>
                columns={leaseColumns}
                dataSource={filteredData}
                onChange={(
                    pagination: TablePaginationConfig,
                    filters: Parameters<NonNullable<TableProps<LeaseData>["onChange"]>>[1],
                    sorter: Parameters<NonNullable<TableProps<LeaseData>["onChange"]>>[2],
                    extra: Parameters<NonNullable<TableProps<LeaseData>["onChange"]>>[3]
                ) => {
                    console.log("Table changed:", pagination, filters, sorter, extra);
                }}
            />
        </div>
    );
}
