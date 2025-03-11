import { Table } from "antd";
import type { ColumnsType } from "antd/es/table/interface";
import type { TableProps } from "antd";

interface TableComponentProps<T> {
    columns: ColumnsType<T>;
    dataSource?: T[];
    onChange?: TableProps<T>["onChange"];
    icon?: React.ReactNode;
    style: string
}

const TableComponent = <T,>({ columns, dataSource = [], onChange, icon, style }: TableComponentProps<T>) => {
    return (
        <div className={`${style}`}>
            {icon && <div className="table-icon">{icon}</div>}
            <Table<T>
                columns={columns}
                dataSource={dataSource}
                onChange={onChange}
                className="table"
                rowKey={(record) => (record as any).key || JSON.stringify(record)}
            />
        </div>
    );
};

export default TableComponent;
