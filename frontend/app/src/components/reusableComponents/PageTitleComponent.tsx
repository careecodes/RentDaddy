import { Divider } from "antd";
import React from "react";

interface PageTitleProps {
    title: string;
}

const PageTitleComponent: React.FC<PageTitleProps> = (props) => {
    return (
        <>
            <h1 className="text-center mt-4 mb-1 fw-bold">{props.title}</h1>
            <div className="flex px-5">
                <Divider />
            </div>
        </>
    );
};

export default PageTitleComponent;
