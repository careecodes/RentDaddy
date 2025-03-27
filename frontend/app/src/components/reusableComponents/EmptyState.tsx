import { Empty } from "antd";

interface EmptyStateProps {
    description: string;
}

const EmptyState = ({ description }: EmptyStateProps) => (
    <div className="empty-state">
        <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={description}
        />
    </div>
);

export default EmptyState;