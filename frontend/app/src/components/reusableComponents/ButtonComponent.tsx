import { Button } from "antd";
import { SizeType } from "antd/es/config-provider/SizeContext";

// Props
export interface ButtonComponentProps {
    title: string;
    type: "default" | "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "danger";
    disabled?: boolean;
    icon?: React.ReactNode;
    size?: SizeType;
    onClick?: () => void;
    loading?: boolean;
    className?: string;
}

const ButtonComponent = (props: ButtonComponentProps) => {
    // Create button class based on type
    const getButtonClass = () => {
        // Map our custom button types to CSS classes
        const typeClass = `btn-${props.type}`;
        return `btn ${typeClass} ${props.className || ''}`;
    };

    // Map to Ant Design's button types when possible
    const getAntButtonType = () => {
        switch (props.type) {
            case "primary": return "primary";
            case "default": return "default";
            case "danger": return "default"; // Use "default" type and rely on the danger prop
            // Others will be styled via CSS classes
            default: return "default";
        }
    };

    return (
        <Button
            type={getAntButtonType()}
            danger={props.type === "danger"}
            size={props.size}
            disabled={props.disabled}
            className={getButtonClass()}
            onClick={props.onClick}
            loading={props.loading}
        >
            {props.icon && <span className="me-2">{props.icon}</span>}
            {props.title}
        </Button>
    );
};

export default ButtonComponent;