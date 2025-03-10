import React from "react";
import { Table, Button } from "antd";
import type { TableColumnsType } from "antd";
import AntDesignTableComponent from "../components/AntDesignTableComponent";

interface DataType {
    key: React.Key;
    name: string;
    age: number;
    address: string;
}

const columns: TableColumnsType<DataType> = [
    {
        title: "Name",
        dataIndex: "name",
    },
    {
        title: "Age",
        dataIndex: "age",
        sorter: (a, b) => a.age - b.age,
    },
    {
        title: "Address",
        dataIndex: "address",
    },
    {
        title: "Actions",
        key: "actions",
        render: (_, record) => (
            <>
                <Button type="link" onClick={() => console.log("Edit", record)}>Edit</Button>
                <Button type="link" danger onClick={() => console.log("Delete", record)}>Delete</Button>
            </>
        ),
    },
];

const AdminLeasesTable: React.FC = () => (
    <Table columns={columns} dataSource={AntDesignTableComponent.defaultProps?.dataSource} />
);

export default AdminLeasesTable;
