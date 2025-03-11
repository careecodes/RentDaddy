import React from "react";
import { ButtonComponentProps } from "./ButtonComponent";
import Card from "antd/es/card/Card";

interface CardComponentProps {
    title: string;
    description: string;
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
                hoverable={props.hoverable}
                className="h-100 text-center"
                style={{ minHeight: "280px", minWidth: "280px" }}>
                <div className="d-flex flex-column align-items-center">
                    {props.icon}

                    <h4 className="mb-3">{props.title}</h4>

                    <p className="text-muted">{props.description}</p>

                    <p className="text-muted fs-1">{props.value}</p>

                    {props.button}
                </div>
            </Card>
        </>
    );
};
