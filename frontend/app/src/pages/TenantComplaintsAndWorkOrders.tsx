//TODO: Connect Backend whenever that is ready (Get Recent Complaints or Work Orders, and Submit the Form)
import { Badge, Button, Form, Input, Radio, Space, Switch } from "antd";
import { useState } from "react";

const TenantComplaintsAndWorkOrders = () => {
    const [requestType, setRequestType] = useState("complaint");
    const [form] = Form.useForm();

    const complaints = [
        {
            id: 1,
            type: "Complaint",
            title: "Complaint 1 Title",
            description: "Complaint 1 Description",
            votes: 10,
        },
        {
            id: 2,
            type: "Complaint",
            title: "Complaint 2 Title",
            description: "Complaint 2 Description",
            votes: 5,
        },
    ];

    const workOrders = [
        {
            id: 1,
            type: "Work Order",
            title: "Work Order 1 Title",
            description: "Work Order 1 Description",
            votes: 10,
            importance: (
                <Badge
                    status="error"
                    text="High"
                />
            ),
        },
        {
            id: 2,
            type: "Work Order",
            title: "Work Order 2 Title",
            description: "Work Order 2 Description",
            votes: 5,
            importance: (
                <Badge
                    status="warning"
                    text="Medium"
                />
            ),
        },
        {
            id: 3,
            type: "Work Order",
            title: "Work Order 3 Title",
            description: "Work Order 3 Description",
            votes: 3,
            importance: (
                <Badge
                    status="default"
                    text="Low"
                />
            ),
        },
    ];

    const onSubmit = (values: any) => {
        console.log("Form values:", values);
        //need to post these to the db
    };

    return (
        <div className="container">
            {/* Title */}
            <h1 className="mb-4">Complaints and Work Orders</h1>

            {/* Start of Form */}
            <Form
                form={form}
                layout="vertical"
                onFinish={onSubmit}>
                {/* Request Type (Complaint or Work Order) with radio buttons */}
                <Form.Item
                    name="requestType"
                    label="Type of Request"
                    rules={[{ required: true, message: "Please select a request type" }]}>
                    <Switch
                        checkedChildren="Work Orders"
                        unCheckedChildren="Complaints"
                        onChange={(checked) => setRequestType(checked ? "workOrder" : "complaint")}
                        className="flex"
                    />
                </Form.Item>

                {/* Recent Complaints & Work Orders */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Recent Complaints */}
                    {requestType === "complaint" && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-medium mb-4">Recent Complaints</h3>
                            <div className="space-y-3 mb-4">
                                {complaints.map((complaint) => (
                                    <div className="flex flex-row items-center p-3 bg-white rounded shadow-sm mb-3 border border-gray-200 justify-content-evenly">
                                        <p>{complaint.title}</p>
                                        <p>{complaint.description}</p>
                                        <p>Type: {complaint.type}</p>
                                        <p>{complaint.votes}</p>
                                    </div>
                                ))}
                                {complaints.length === 0 && <div className="text-gray-500 italic">No complaints found</div>}
                            </div>
                        </div>
                    )}

                    {/* Recent Work Orders */}
                    {requestType === "workOrder" && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-medium mb-4">Recent Work Orders</h3>
                            <div className="space-y-3 mb-4">
                                {workOrders.map((workOrder) => (
                                    <div className="flex flex-row items-center p-3 bg-white rounded shadow-sm mb-3 border border-gray-200 justify-content-evenly">
                                        <p>{workOrder.title}</p>
                                        <p>{workOrder.description}</p>
                                        <p>Type: {workOrder.type}</p>
                                        <p>{workOrder.votes}</p>
                                        <p>{workOrder.importance}</p>
                                    </div>
                                ))}
                                {workOrders.length === 0 && <div className="text-gray-500 italic">No work orders found</div>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Only show if it's a work order */}
                {/* Importance (High, Medium, Low) with radio buttons */}
                {requestType === "workOrder" && (
                    <Form.Item
                        name="importance"
                        label="Importance"
                        rules={[{ required: true, message: "Please select importance level" }]}>
                        <Radio.Group className="w-full flex gap-4">
                            <Space
                                direction="horizontal"
                                className="w-full justify-between">
                                <Radio.Button
                                    value="high"
                                    className="w-1/3 text-center"
                                    style={{ color: "#d86364" }}>
                                    High Priority
                                </Radio.Button>
                                <Radio.Button
                                    value="medium"
                                    className="w-1/3 text-center"
                                    style={{ color: "#f0a500" }}>
                                    Medium Priority
                                </Radio.Button>
                                <Radio.Button
                                    value="low"
                                    className="w-1/3 text-center"
                                    style={{ color: "#00674f" }}>
                                    Low Priority
                                </Radio.Button>
                            </Space>
                        </Radio.Group>
                    </Form.Item>
                )}

                {/* Image Upload */}
                <Form.Item
                    name="image"
                    label="Upload an Image">
                    <Input type="file" />
                </Form.Item>

                {/* Description with text area */}
                <Form.Item
                    name="description"
                    label="Description"
                    rules={[{ required: true, message: "Please enter a description" }]}>
                    <Input.TextArea rows={4} />
                </Form.Item>

                {/* Submit button */}
                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit">
                        Submit
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default TenantComplaintsAndWorkOrders;
