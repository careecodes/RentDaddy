import { Button, ConfigProvider } from "antd";

// Props
interface ButtonProps {
    title: string; // Displays the text on the button
    type: string; // default, primary, secondary, tertiary (if needed), cancel, info, loading, disabled
    disabled: boolean; // Optional, if true, the button will be disabled
    icon: React.ReactNode; // Optional icon to display on the button
    size: string; // default, small, large
    onClick: () => void;
}

const ButtonComponent = (props: ButtonProps) => {

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
            }}
        >
            <Button size={props.size} disabled={props.disabled} className={`btn btn-${props.type} flex text-center items-center p-3`} onClick={props.onClick}>
                {props.icon &&
                    (
                        <span className="mr-2">
                            {props.icon}
                        </span>
                    )
                }
                {props.title}
            </Button>
        </ConfigProvider>
    )
}
export default ButtonComponent
