import { Button, ConfigProvider } from "antd";
import { SizeType } from "antd/es/config-provider/SizeContext";

// Props
export interface ButtonComponentProps {
    title: string;
    type: "default" | "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "danger";
    disabled?: boolean;
    icon?: React.ReactNode;
    size?: string; // default, small, large
    onClick?: () => void; //should just be able to post the reference to the function so for example onClick={myFunc} NOT onClick={myFunc()}
    loading?: boolean; // Added loading prop
}


const ButtonComponent = (props: ButtonComponentProps) => {
    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimaryHover: "#000000",
                },
                components: {
                    Button: {
                        colorInfoBg: "#00674f",
                        colorInfoText: "#fff",
                    },
                },
            }}>
            <Button
                size={props.size as SizeType}
                disabled={props.disabled}
                className={`btn btn-${props.type}`}
                onClick={props.onClick}>
                {props.icon && <span className="mr-2">{props.icon}</span>}
                {props.title}
            </Button>
        </ConfigProvider>
    );
};
export default ButtonComponent;
