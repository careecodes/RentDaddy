import React from "react";
import { ButtonComponentProps } from "./ButtonComponent";
import Card from "antd/es/card/Card";

interface CardComponentProps {
    title: string;
    description: any;
    icon?: any;
    button?: any;
    hoverable: boolean;
    value?: number;
}

export const CardComponent = (props: CardComponentProps) => {
    return (
        <>
            <Card
                title={
                    <>
                        <div className="flex flex-column align-items-center">
                            <span className="me-2 mt-2">{props.icon}</span>
                            <span>{props.title}</span>
                        </div>
                    </>
                }
                hoverable={props.hoverable}
                className="card pb-2"
                actions={[props.button]}>
                <div className="flex flex-column">
                    {props.value && <span className="text-muted fs-1">{props.value}</span>}
                    {props.description && <span className="text-muted ">{props.description}</span>}
                </div>
            </Card>
        </>
    );
};
