import { Table } from "antd";
import type { TableColumnType, TableProps } from "antd";

interface TableComponentProps {
    columns: TableColumnType[];
    dataSource: any[];
    onChange: (pagination: any, filters: any, sorter: any, extra: any) => void;
    icon?: any;
}

export const TableComponent = (props: TableComponentProps) => {
    return (
        <Table
            columns={props.columns}
            dataSource={props.dataSource}
            onChange={props.onChange}
            className="table"
        />
    );
};
