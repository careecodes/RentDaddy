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

//pass in button like this
// button={
//  index === 0 ? (
//  <ButtonComponent
//  title="Primary"
//   type="primary"
//           />
//       ) : undefined
//   }

export const CardComponent = (props: CardComponentProps) => {
    return (
        <>
            <Card
                //TODO: JJ make these styles better
                title={props.title}
                hoverable={props.hoverable}
                className="h-100 text-center"
                style={{ minHeight: "280px", minWidth: "280px" }}>
                <div className="flex flex-column align-items-center">
                    <span>{props.icon}</span>

                    <p className="text-muted">{props.description}</p>

                    <p className="text-muted fs-1">{props.value}</p>

                    {props.button}
                </div>
            </Card>
        </>
    );
};
