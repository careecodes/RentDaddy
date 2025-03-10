import "../styles/styles.scss"
import React, { useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { Input, Table, Button, Tag, Space, Tree } from "antd";
import type { ColumnsType } from "antd/es/table";

const { Search } = Input
import dayjs from "dayjs";
import { LeaseData } from "../types/types";
import TableComponent from "../components/TableComponent";

// Dummy lease data
const leaseDataRaw = [
    { key: 1, tenantName: "Grace Hall", apartment: "B218", leaseStartDate: "2024-06-13", leaseEndDate: "2024-12-10", rentAmount: 2060, isSigned: false },
    { key: 2, tenantName: "James Smith", apartment: "A212", leaseStartDate: "2024-03-20", leaseEndDate: "2024-03-20", rentAmount: 2223, isSigned: false },
    { key: 3, tenantName: "Diego Lewis", apartment: "C466", leaseStartDate: "2025-01-12", leaseEndDate: "2025-04-12", rentAmount: 1100, isSigned: false },
    { key: 4, tenantName: "Hector Wilson", apartment: "B179", leaseStartDate: "2024-10-02", leaseEndDate: "2025-03-31", rentAmount: 2150, isSigned: true },
    { key: 5, tenantName: "Charlie Davis", apartment: "C378", leaseStartDate: "2024-11-03", leaseEndDate: "2025-11-03", rentAmount: 1803, isSigned: true },
    { key: 6, tenantName: "JJ SchraderBachar", apartment: "A333", leaseStartDate: "2024-08-15", leaseEndDate: "2024-08-15", rentAmount: 1950, isSigned: false },
    { key: 7, tenantName: "Rosalind Franklin", apartment: "D401", leaseStartDate: "2023-02-10", leaseEndDate: "2024-02-10", rentAmount: 1200, isSigned: true },
    { key: 8, tenantName: "Malik Johnson", apartment: "C299", leaseStartDate: "2024-07-01", leaseEndDate: "2024-10-01", rentAmount: 1400, isSigned: true },
    { key: 9, tenantName: "Carree Brown", apartment: "B155", leaseStartDate: "2024-05-01", leaseEndDate: "2024-07-01", rentAmount: 1750, isSigned: false },
    { key: 10, tenantName: "John Doe", apartment: "A101", leaseStartDate: "2024-04-20", leaseEndDate: "2024-10-20", rentAmount: 2000, isSigned: false },
    { key: 11, tenantName: "Jane Smith", apartment: "B222", leaseStartDate: "2024-06-25", leaseEndDate: "2024-07-25", rentAmount: 2100, isSigned: true },
    { key: 12, tenantName: "Jill Hall", apartment: "D450", leaseStartDate: "2024-01-10", leaseEndDate: "2024-01-10", rentAmount: 1300, isSigned: false },
    { key: 13, tenantName: "Emily Wildaughter", apartment: "C310", leaseStartDate: "2024-09-10", leaseEndDate: "2025-09-10", rentAmount: 1900, isSigned: true },
    { key: 14, tenantName: "Charlie Chill", apartment: "A450", leaseStartDate: "2024-03-01", leaseEndDate: "2024-03-01", rentAmount: 1600, isSigned: false },
    { key: 15, tenantName: "Planter Lewis", apartment: "D180", leaseStartDate: "2024-12-01", leaseEndDate: "2025-06-01", rentAmount: 1700, isSigned: true },
    { key: 16, tenantName: "Unfrank Thomas", apartment: "B222", leaseStartDate: "2024-10-10", leaseEndDate: "2024-10-10", rentAmount: 2200, isSigned: true },
    { key: 17, tenantName: "Henry Clark", apartment: "C199", leaseStartDate: "2024-07-15", leaseEndDate: "2025-01-15", rentAmount: 1450, isSigned: false },
    { key: 18, tenantName: "Danny Thompson", apartment: "A205", leaseStartDate: "2024-11-05", leaseEndDate: "2025-05-05", rentAmount: 1800, isSigned: false },
    { key: 19, tenantName: "Dennis Garcia", apartment: "D299", leaseStartDate: "2024-08-20", leaseEndDate: "2024-09-20", rentAmount: 1550, isSigned: true },
    { key: 20, tenantName: "Yoon Soon", apartment: "B305", leaseStartDate: "2024-09-15", leaseEndDate: "2025-09-15", rentAmount: 2000, isSigned: true },
];


const generateTreeData = (leaseData: LeaseData[]) => {
    const apartments = [...new Set(leaseData.map((lease) => lease.apartment))];
    const tenants = [...new Set(leaseData.map((lease) => lease.tenantName))];

    // Function to group dates by Year -> Month -> Day
    const groupByDateHierarchy = (dates: string[], type: "startDate" | "endDate") => {
        const dateMap = new Map();

        dates.forEach((date) => {
            const parsedDate = dayjs(date);
            const year = parsedDate.format("YYYY");
            const month = parsedDate.format("MMMM"); // "January", "February", etc.
            const day = parsedDate.format("DD"); // "01", "02", etc.

            if (!dateMap.has(year)) dateMap.set(year, new Map());
            if (!dateMap.get(year).has(month)) dateMap.get(year).set(month, new Set());

            dateMap.get(year).get(month).add(day);
        });

        // Convert map structure to tree nodes
        return [...dateMap.entries()].map(([year, months]) => ({
            title: year,
            key: `${type}-${year}`, //"[startdate|enddate]-year"
            children: [...months.entries()].map(([month, days]) => ({
                title: month,
                key: `${type}-${year}-${month}`, //"[startdate|enddate]-year-month"
                children: [...days].map((day) => ({
                    title: day,
                    key: `${type}-${year}-${month}-${day}`,
                })),
            })),
        }));
    };

    // Extract and group lease start & end dates
    const startDates = leaseData.map((lease) => lease.leaseStartDate);
    const endDates = leaseData.map((lease) => lease.leaseEndDate);

    return [
        {
            title: "Apartments",
            key: "apartments",
            children: apartments.map((apartment) => ({
                title: apartment,
                key: `apartment-${apartment}`,
            })),
        },
        {
            title: "Tenants",
            key: "tenants",
            children: tenants.map((tenant) => ({
                title: tenant,
                key: `tenant-${tenant}`,
            })),
        },
        {
            title: "Lease Status",
            key: "status",
            children: [
                { title: "Signed", key: "signed" },
                { title: "Unsigned", key: "unsigned" },
            ],
        },
        {
            title: "Lease Start Dates",
            key: "leaseStartDates",
            children: groupByDateHierarchy(startDates, "startDate"), // Grouped by year -> month -> day
        },
        {
            title: "Lease End Dates",
            key: "leaseEndDates",
            children: groupByDateHierarchy(endDates, "endDate"), // Grouped by year -> month -> day
        },
    ];
};


export default function AdminViewEditLeases() {
    const [searchText, setSearchText] = useState("");
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

    const treeData = generateTreeData(leaseDataRaw);

    const filteredData = leaseDataRaw.filter((record) => {
        const searchTerm = searchText.toLowerCase();
        const matchesSearch = record.tenantName.toLowerCase().includes(searchTerm) ||
            record.apartment.toLowerCase().includes(searchTerm) ||
            record.leaseEndDate.includes(searchTerm) ||
            record.leaseStartDate.includes(searchTerm);

        const matchesTreeSelection =
            selectedKeys.length === 0 ||
            selectedKeys.some((key) => {
                if (key.startsWith("apartment-")) return record.apartment === key.replace("apartment-", "");
                if (key.startsWith("tenant-")) return record.tenantName === key.replace("tenant-", "");
                if (key === "signed") return record.isSigned === true;
                if (key === "unsigned") return record.isSigned === false;
                const [type, year, month, day] = key.split("-");

                if (type === "startDate") {
                    const leaseDate = dayjs(record.leaseStartDate);
                    return (
                        (year && leaseDate.format("YYYY") === year) ||
                        (month && leaseDate.format("MMMM") === month) ||
                        (day && leaseDate.format("DD") === day)
                    );
                }

                if (type === "endDate") {
                    const leaseDate = dayjs(record.leaseEndDate);
                    return (
                        (year && leaseDate.format("YYYY") === year) ||
                        (month && leaseDate.format("MMMM") === month) ||
                        (day && leaseDate.format("DD") === day)
                    );
                }
                return false;
            });

        return matchesSearch && matchesTreeSelection;
    });

    const leaseColumns: ColumnsType<LeaseData> = [
        {
            title: "Tenant Name",
            dataIndex: "tenantName",
            className: "text-primary",
            sorter: (a, b) => a.tenantName.localeCompare(b.tenantName),
        },
        { title: "Apartment", dataIndex: "apartment" },
        {
            title: "Lease Start",
            dataIndex: "leaseStartDate",
            sorter: (a, b) => dayjs(a.leaseStartDate).unix() - dayjs(b.leaseStartDate).unix(),
            render: (text) => {
                const isExpired = dayjs(text).isAfter(dayjs());
                return <span style={{ color: isExpired ? "gray" : "black" }}>{text}</span>;
            },
        },
        {
            title: "Lease End",
            dataIndex: "leaseEndDate",
            sorter: (a, b) => dayjs(a.leaseEndDate).unix() - dayjs(b.leaseEndDate).unix(),
            render: (text) => {
                const isExpired = dayjs(text).isBefore(dayjs());
                return <span style={{ color: isExpired ? "gray" : "black" }}>{text}</span>;
            },
        },
        {
            title: "Status",
            dataIndex: "isSigned",
            sorter: (a, b) => dayjs(a.leaseEndDate).unix() - dayjs(b.leaseEndDate).unix(),
            render: (isSigned) => (
                <Tag className={isSigned ? "bg-success text-white" : "bg-danger text-white"}>
                    {isSigned ? "Signed" : "Unsigned"}
                </Tag>
            ),
        },
        {
            title: "Rent ($)", dataIndex: "rentAmount",
            sorter: (a, b) => a.rentAmount - b.rentAmount,
        },
        {
            title: "Actions",
            key: "actions",
            className: "fw-bold",
            render: (_, record) => {
                const isSigned = record.isSigned;
                const daysUntilExpiration = dayjs(record.leaseEndDate).diff(dayjs(), "days");
                // A lease can only be renewed if a lease is within 60 days of expiring. 
                // If the lease is already signed and the date is before 60 days, the renew button is disabled.
                const isRenewable = isSigned && daysUntilExpiration <= 60 && daysUntilExpiration >= 0;

                return (
                    <Space size="middle">
                        {!isSigned && (
                            <Button type="primary" className="btn btn-primary" onClick={() => console.log("Initiate Lease", record)}>
                                Initiate Lease
                            </Button>
                        )}
                        {isSigned && (
                            <Button type="primary" className="btn btn-primary" disabled={!isRenewable} onClick={() => console.log("Renew Lease", record)}>
                                Renew Lease
                            </Button>
                        )}
                        <Button type="primary" className="btn btn-secondary" danger onClick={() => console.log("Archive", record)}>
                            Archive
                        </Button>
                    </Space>
                );
            },
        },
    ];

    return (
        <div className="container">
            <h1 className="mb-4 text-primary">Admin View & Edit Leases</h1>

            <div style={{ display: "flex", gap: "20px" }}>

                <div style={{ width: "250px" }}>
                    <Search
                        placeholder="Search leases..."
                        allowClear
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ marginBottom: 16, width: "100%" }}
                    />
                    <Tree
                        treeData={treeData}
                        checkable
                        onCheck={(keys) => setSelectedKeys(keys as string[])}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <TableComponent columns={leaseColumns} dataSource={filteredData} />
                </div >
            </div >
        </div >
    );
}
