import { Table } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table/interface";
import type { TableProps } from "antd";
import { createStyles } from "antd-style";

interface TableComponentProps<T> {
    columns: ColumnsType<T>;
    dataSource?: T[];
    onChange?: TableProps<T>["onChange"];
    icon?: React.ReactNode;
    style?: string;
    pagination?: TablePaginationConfig;
    onRow?: (record: T) => { onClick: () => void };
    loading?: boolean;
}
const useStyle = createStyles(({ css, token }) => {
    const { antCls } = token; //ignore the warning
    return {
        customTable: css`
            ${antCls}-table {
                ${antCls}-table-container {
                    ${antCls}-table-body,
                    ${antCls}-table-content {
                        scrollbar-width: thin;
                        scrollbar-color: #eaeaea transparent;
                        scrollbar-gutter: stable;
                    }
                    ${antCls}-table-thead {
                        max-height: 100px;
                    }
                }
            }
        `,
    };
});

const TableComponent = <T,>({ columns, dataSource = [], onChange, icon, pagination, onRow, style, loading }: TableComponentProps<T>) => {
    const { styles } = useStyle();

    return (
        <>
            {icon && <div className="table-icon">{icon}</div>}
            <Table<T>
                className={styles.customTable}
                columns={columns}
                dataSource={dataSource}
                pagination={pagination}
                onChange={onChange}
                onRow={onRow}
                loading={loading}
                scroll={{ x: "max-content" }}
                rowKey={(record) => (record as any).key || JSON.stringify(record)}
            />
        </>
    );
};

export default TableComponent;
