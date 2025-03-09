import React from "react";
import { Table } from "antd";
import type { TableColumnType, TableProps } from "antd";

interface TableComponentProps {
    columns: TableColumnType[];
    data: any[];
    onChange: (pagination: any, filters: any, sorter: any, extra: any) => void;
}

export const TableComponent = (props: TableComponentProps) => {
    return (
        <Table
            columns={props.columns}
            dataSource={props.data}
            onChange={props.onChange}
            className="table"
        />
    );
};
