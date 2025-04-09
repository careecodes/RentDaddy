import { useState } from "react";
import { Alert, Typography } from "antd";

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

    // Function to format description with proper line breaks
    const formatDescription = (text: string) => {
        // Split text by newline sequences and convert to paragraphs
        return text.split('\n\n').map((paragraph, i) => (
            <Typography.Paragraph key={i} style={{ marginBottom: i < text.split('\n\n').length - 1 ? '1em' : 0 }}>
                {paragraph}
            </Typography.Paragraph>
        ));
    };

    return (
        <>
            <Alert
                className="flex text-left"
                message={props.title}
                description={formatDescription(props.description)}
                type={props.type}
                showIcon
                closable
                onClose={() => setVisible(false)}
            />
        </>
    );
};

export default AlertComponent;
