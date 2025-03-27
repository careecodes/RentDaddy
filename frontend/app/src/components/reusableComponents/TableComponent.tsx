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
    pagination?: TablePaginationConfig | false;
    onRow?: (record: T) => { onClick: () => void };
    disabled?: boolean | undefined;
    loading?: boolean | undefined;
    scroll?: TableProps<T>["scroll"];
}
const useStyle = createStyles(({ css, token }) => {
    const antCls = token.antCls || ""; // Ensure compatibility if antCls is undefined
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

const TableComponent = <T,>({ columns, dataSource = [], onChange, icon, pagination, onRow, style, loading, scroll: scrollProp }: TableComponentProps<T>) => {

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
                scroll={scrollProp ?? { x: "max-content" }}
                rowKey={(record) => (record as any).key || JSON.stringify(record)}
            />
        </>
    );
};

export default TableComponent;
