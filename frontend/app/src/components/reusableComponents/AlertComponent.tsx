import React from "react"
import { Alert } from "antd"

const AlertComponent = (props: any) => {
  return (
    <>
      <Alert
        message={props.title}
        description={props.description}
        type={props.type}
        showIcon
      ></Alert>
    </>
  )
}

export default AlertComponent
