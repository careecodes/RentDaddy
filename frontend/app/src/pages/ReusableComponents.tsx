import { Avatar, Button, Card, Col, ConfigProvider, Divider, Input, Row } from "antd";
import TableComponent from "../components/reusableComponents/TableComponent";
import { LockOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons";
import TextArea from "antd/es/input/TextArea";
import { useState } from "react";
import UniversalSidebar from "../components/UniversalSidebar";
import { Link } from "react-router";
import RegistrationFormExample from "../components/reusableComponents/FormExample";
import TimeRelatedFormExample from "../components/reusableComponents/TimeRelatedFormExamples";
import AlertComponent from "../components/reusableComponents/AlertComponent";
import { CardComponent } from "../components/reusableComponents/CardComponent";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import ModalComponent from "../components/ModalComponent";
import type { ColumnsType, TableProps } from "antd/es/table";
import type { DataType } from "../types/types";

const ReusableComponents = () => {
    const [value, setValue] = useState("");

    const columns: ColumnsType<DataType> = [
        {
            title: "Name",
            dataIndex: "name",
            filters: [
                { text: "Joe", value: "Joe" },
                { text: "Category 1", value: "Category 1" },
                { text: "Category 2", value: "Category 2" },
            ],
            filterMode: "tree",
            filterSearch: true,
            onFilter: (value, record) => record.name.startsWith(value as string),
            width: "30%",
        },
        {
            title: "Age",
            dataIndex: "age",
            sorter: (a, b) => a.age - b.age,
        },
        {
            title: "Address",
            dataIndex: "address",
            filters: [
                { text: "London", value: "London" },
                { text: "New York", value: "New York" },
            ],
            onFilter: (value, record) => record.address.startsWith(value as string),
            filterSearch: true,
            width: "40%",
        },
    ];

    const data: DataType[] = [
        { key: "1", name: "John Brown", age: 32, address: "New York No. 1 Lake Park" },
        { key: "2", name: "Jim Green", age: 42, address: "London No. 1 Lake Park" },
        { key: "3", name: "Joe Black", age: 32, address: "Sydney No. 1 Lake Park" },
        { key: "4", name: "Jim Red", age: 32, address: "London No. 2 Lake Park" },
    ];

    const onChange: TableProps<DataType>["onChange"] = (pagination, filters, sorter, extra) => {
        console.log("params", pagination, filters, sorter, extra);
    };

    return (
        <>
            <div className="reusable-components">
                <div className="title text-center fs-1">ReusableComponents</div>
                <h4 className="text-center mt-3 fst-italic fw-bold">
                    ***There is not much styling on this yet, kinda stock, <br /> just so we can get the components up and running.***
                </h4>

                {/* Back to Home Button */}
                <Link
                    to="/"
                    className="d-flex justify-content-center">
                    <Button
                        type="primary"
                        className="mt-3 btn btn-primary">
                        Back to Home
                    </Button>
                </Link>

                <Divider />

                {/* User Avatar */}
                <div className="user-avatar m-5 flex flex-column align-items-center">
                    <h2 className="fs-2">User Avatar</h2>
                    <Avatar
                        size={64}
                        icon={<UserOutlined />}
                    />
                </div>

                <Divider />

                <div className="flex flex-column align-items-center m-5 gap-2">
                    <h2 className="fs-2">Modal</h2>
                    {/* Documentation for ModalComponent.tsx */}
                    There are 3 types of modals:
                    <ul>
                        <li>Default</li>
                        <li>Smart Locker</li>
                        <li>Guest Parking</li>
                    </ul>
                    <ModalComponent
                        type="default"
                        buttonType="default"
                        buttonTitle="Confirmation Model"
                        content="This is a confirmation model"
                        handleOkay={() => {}}
                    />
                    <ModalComponent
                        type="Smart Locker"
                        buttonType="primary"
                        buttonTitle="Smart Locker"
                        content="This is a smart locker model"
                        handleOkay={() => {}}
                    />
                    <ModalComponent
                        type="Guest Parking"
                        buttonType="primary"
                        buttonTitle="Guest Parking"
                        content="To register someone in Guest Parking, please fill out the form below."
                        handleOkay={() => {}}
                    />
                </div>

                <Divider />

                {/* alerts */}
                <AlertComponent
                    title={"Success Example"}
                    description={"Success Description"}
                    type={"success"}
                />
                <AlertComponent
                    title={"Error Example"}
                    description={"Error Description"}
                    type={"error"}
                />
                <AlertComponent
                    title={"Warning Example"}
                    description={"Warning Description"}
                    type={"warning"}
                />

                {/* Sider (Sidebar) */}
                <div className="sider m-5">
                    <h2 className="fs-2 text-center">Layout: Sider (Sidebar) & Footer</h2>
                    <p className="text-center">The sidebar falls under the Layout Component of Ant Design.</p>
                    <h1 className="text-center">MAKE SURE WE TALK ABOUT THIS IN THE NEXT MEETING OR IF SOMEONE KNOWS WHAT THE BEST WAY OF SETTING UP THE LAYOUT / SIDEBAR FEEL FREE TO CHANGE IT</h1>
                    <UniversalSidebar />
                </div>

                <Divider />

                {/* Tables */}
                <div className="table m-5">
                    <h2>Table</h2>
                    <TableComponent
                        columns={columns}
                        dataSource={data}
                        onChange={onChange}
                    />
                </div>

                <Divider />

                {/* Cards */}
                <div className="cards m-5">
                    <h2 className="fs-2 text-center">Cards</h2>
                    <Row gutter={16}>
                        <Col span={8}>
                            <CardComponent
                                hoverable={false}
                                title="Card"
                                description="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Esse quam blanditiis, ratione cumque, repudiandae mollitia ex tempora natus rem sint sapiente? Enim
                                recusandae, similique voluptatibus facilis voluptatem non reprehenderit harum, unde fuga quos omnis molestias voluptate ducimus! Cupiditate eligendi distinctio eaque
                                nulla soluta ab commodi nihil. Itaque cumque voluptatem a."
                            />
                        </Col>
                        <Col span={8}>
                            <CardComponent
                                hoverable={false}
                                title="Card With Button"
                                description="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Esse quam blanditiis, ratione cumque, repudiandae mollitia ex tempora natus rem sint sapiente? Enim
                                recusandae, similique voluptatibus facilis voluptatem non reprehenderit harum, unde fuga quos omnis molestias voluptate ducimus! Cupiditate eligendi distinctio eaque
                                nulla soluta ab commodi nihil. Itaque cumque voluptatem a."
                                button={
                                    <ButtonComponent
                                        title="Primary"
                                        type="primary"
                                    />
                                }
                            />
                        </Col>
                        <Col span={8}>
                            <CardComponent
                                hoverable={false}
                                title="Card With Kitchen Sink"
                                description="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Esse quam blanditiis, ratione cumque, repudiandae mollitia ex tempora natus rem sint sapiente? Enim
                                recusandae, similique voluptatibus facilis voluptatem non reprehenderit harum, unde fuga quos omnis molestias voluptate ducimus! Cupiditate eligendi distinctio eaque
                                nulla soluta ab commodi nihil. Itaque cumque voluptatem a."
                                button={
                                    <ButtonComponent
                                        title="Secondary"
                                        type="secondary"
                                    />
                                }
                                icon={<LockOutlined className="fs-2 text-primary mb-3" />}
                            />
                        </Col>
                    </Row>
                </div>

                <Divider />

                {/* Buttons */}
                <div className="buttons-examples m-5">
                    <h2 className="fs-2 text-center">Buttons</h2>
                    <div className="buttons-container flex flex-column align-items-center gap-2">
                        {/* Primary Button */}
                        <div className="my-2">
                            <h2>Primary Button</h2>
                            <Button
                                type="primary"
                                className="flex mx-auto btn btn-primary">
                                Click me
                            </Button>
                        </div>

                        {/* Confirm Button */}
                        <div className="my-2">
                            <h2>Confirm Button</h2>
                            <Button className="bg-success flex mx-auto"> Click me</Button>
                        </div>

                        {/* Decline Button */}
                        <div className="my-2">
                            <h2>Decline Button</h2>
                            <Button className="bg-danger flex mx-auto">Click me</Button>
                        </div>

                        {/* Loading Button */}
                        <div className="my-2">
                            <h2>Loading Button</h2>
                            <Button
                                className="bg-primary flex mx-auto"
                                loading>
                                Click me
                            </Button>
                        </div>

                        {/* Disabled Button */}
                        <div className="my-2">
                            <h2>Disabled Button</h2>
                            <Button
                                className="bg-secondary flex mx-auto"
                                disabled>
                                Click me
                            </Button>
                        </div>

                        {/* Any other buttons? */}
                    </div>
                </div>

                <Divider />

                {/* Text Area Examples*/}
                <div className="text-area-examples m-5">
                    <h2 className="fs-2 text-center">Text Area Examples</h2>

                    {/* Basic Input */}
                    <div className="my-2">
                        <h2>Basic Input</h2>
                        <Input
                            className="my-2"
                            placeholder="Basic usage"
                        />
                    </div>

                    {/* Search Input */}
                    <div className="my-2">
                        <h2>Search Input</h2>
                        <Input
                            className="my-2"
                            addonAfter={<SettingOutlined />}
                            defaultValue="mysite"
                        />
                        <Input
                            className="my-2"
                            addonBefore="http://"
                            suffix=".com"
                            defaultValue="mysite"
                        />
                    </div>

                    {/* Controlled Expanding Text Area */}
                    <div className="my-2">
                        <h2>Controlled Expanding Text Area</h2>
                        <TextArea
                            className="my-2"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="Controlled autosize"
                            autoSize={{ minRows: 3, maxRows: 5 }}
                        />
                    </div>

                    <Divider />

                    <div className="form-examples m-5 p-4 border rounded shadow-sm bg-light">
                        <h2 className="fs-2 text-center mb-4 text-primary">Form Examples</h2>
                        <div className="bg-white p-3 rounded">
                            <h2 className="fs-3 text-center mb-4 text-primary">Registration Form</h2>
                            <RegistrationFormExample />
                        </div>
                        <Divider />
                        <div className="bg-white p-3 rounded">
                            <h2 className="fs-3 text-center mb-4 text-primary">Time Related Form Examples</h2>
                            <TimeRelatedFormExample />
                        </div>
                    </div>

                    {/* Any other text area examples? */}
                </div>

                <Divider />
            </div>
        </>
    );
};

export default ReusableComponents;
