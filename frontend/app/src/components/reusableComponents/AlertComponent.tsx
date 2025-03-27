import { useState } from "react";
import { Alert } from "antd";

interface AlertProps {
    title: string;
    message: string;
    description: string;
    type: "success" | "info" | "warning" | "error";
}

const AlertComponent = (props: AlertProps) => {
    const [visible, setVisible] = useState(true);

    if (!visible) {
        return null;
    }

    return (
        <>
            <Alert
                className="flex text-left"
                message={props.title}
                description={props.description}
                type={props.type}
                showIcon
                closable
                onClose={() => setVisible(false)}
            />
        </>
    );
};

export default AlertComponent;
