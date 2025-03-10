import React from "react";
import { Table } from "antd";
import type { TableColumnsType, TableProps } from "antd";

// This is more dynamic/can be used in multiple pages as a component with dynamic source data in other pages.
interface TableComponentProps<T> {
  columns: TableColumnsType<T>;
  dataSource?: T[];
}

const TableComponent = <T,>({ columns, dataSource = [] }: TableComponentProps<T>) => {
  const onChange: TableProps<T>["onChange"] = (pagination, filters, sorter, extra) => {
    console.log("Table params:", pagination, filters, sorter, extra);
  };

  return (
    <Table<T>
      columns={columns}
      dataSource={dataSource}
      onChange={onChange}
      className="table"
      rowKey={(record) => (record as any).key || JSON.stringify(record)}
    />
  );
};

export default TableComponent;
