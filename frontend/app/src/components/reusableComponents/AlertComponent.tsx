import { Alert } from "antd";

interface AlertProps {
    title: string;
    message: string;
    description: string;
    type: "success" | "info" | "warning" | "error";
}

const AlertComponent = (props: AlertProps) => {
    return (
        <>
            <Alert
                className="flex text-left"
                message={props.title}
                description={props.description}
                type={props.type}
                showIcon></Alert>
        </>
    );
};

export default AlertComponent;
