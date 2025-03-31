import { Table } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table/interface";
import type { TableProps } from "antd";
import { createStyles } from "antd-style";

interface TableComponentProps<T> {
    columns: ColumnsType<T>;
    dataSource?: T[];
    onChange?: TableProps<T>["onChange"];
    icon?: React.ReactNode;
    style?: string; // Changed back to string to support class names
    inlineStyle?: React.CSSProperties; // Added separate prop for inline styles
    className?: string;
    pagination?: TablePaginationConfig | false;
    onRow?: (record: T) => { onClick: () => void };
    disabled?: boolean | undefined;
    loading?: boolean | undefined;
    scroll?: TableProps<T>["scroll"];
}

const useStyle = createStyles(({ css, token }) => {
    const prefixCls = (token as any).prefixCls || 'ant';

    return {
        customTable: css`
            .${prefixCls}-table {
                .${prefixCls}-table-container {
                    .${prefixCls}-table-body,
                    .${prefixCls}-table-content {
                        scrollbar-width: thin;
                        scrollbar-color: #eaeaea transparent;
                        scrollbar-gutter: stable;
                    }
                    .${prefixCls}-table-thead {
                        max-height: 100px;
                    }
                }
            }
        `,
    };
});

const TableComponent = <T,>({
    columns,
    dataSource = [],
    onChange,
    icon,
    pagination,
    onRow,
    style,
    inlineStyle,
    className,
    loading,
    scroll: scrollProp
}: TableComponentProps<T>) => {

    const { styles } = useStyle();

    // Combine all classes: custom styles, provided className, and style (if it starts with a dot)
    const combinedClassName = `${styles.customTable} ${className || ''} ${style?.startsWith('.') ? style.substring(1) : style || ''}`;

    return (
        <>
            {icon && <div className="table-icon">{icon}</div>}
            <Table<T>
                className={combinedClassName}
                columns={columns}
                dataSource={dataSource}
                pagination={pagination}
                onChange={onChange}
                onRow={onRow}
                loading={loading}
                style={inlineStyle} // Use the inlineStyle prop for React.CSSProperties
                scroll={scrollProp ?? { x: "max-content" }}
                rowKey={(record) => (record as any).key || JSON.stringify(record)}
            />
        </>
    );
};

export default TableComponent;