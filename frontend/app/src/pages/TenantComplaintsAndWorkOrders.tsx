//TODO: Connect Backend whenever that is ready (Get Recent Complaints or Work Orders, and Submit the Form)
import { Button, Divider, Form, Input, Modal, Select, Tabs } from "antd";
import type { TabsProps } from "antd";
import { useState } from "react";
import TableComponent from "../components/reusableComponents/TableComponent";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import { useMutation, useQueries } from "@tanstack/react-query";
import { useAuth } from "@clerk/react-router";
import { ComplaintEntry, ComplaintsData, WorkOrderData, WorkOrderEntry } from "../types/types";
import { ColumnsType } from "antd/es/table";
import { absoluteServerUrl } from "../lib/utils";

//TODO: Test all connections and double check absoluteServerUrl is working correctly
const TenantComplaintsAndWorkOrders = () => {
    const { getToken, userId } = useAuth();
    const [activeKey, setActiveKey] = useState("1");

    const [complaints, workOrders] = useQueries({
        queries: [
            {
                queryKey: [`${userId}-complaints`],
                queryFn: async () => {
                    const authToken = await getToken();
                    if (!authToken) {
                        throw new Error("[TENANT_DASHBOARD] Error unauthorized");
                    }
                    const res = await fetch(absoluteServerUrl("/tenant/complaints"), {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${authToken}`,
                        },
                    });

                    if (!res.ok) {
                        throw new Error("[TENANT_DASHBOARD] Error complaints request failed");
                    }
                    return (await res.json()) as ComplaintsData[];
                },
            },
            {
                queryKey: [`${userId}-work-orders`],
                queryFn: async () => {
                    const authToken = await getToken();
                    if (!authToken) {
                        throw new Error("[TENANT_DASHBOARD] Error unauthorized");
                    }
                    const res = await fetch(absoluteServerUrl("/tenant/work_orders"), {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${authToken}`,
                        },
                    });

                    if (!res.ok) {
                        throw new Error("[TENANT_DASHBOARD] Error tenant Work_orders request failed");
                    }
                    return (await res.json()) as WorkOrderData[];
                },
            },
        ],
    });

    const complaintColumns: ColumnsType<ComplaintsData> = [
        {
            title: "Id",
            dataIndex: "id",
            key: "id",
        },
        {
            title: "Title",
            dataIndex: "title",
            key: "title",
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
        },
        {
            title: "Category",
            dataIndex: "category",
            key: "category",
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
        },
        {
            title: "Created At",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (createdAt: string) =>
                new Date(createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                }),
        },
    ];

    const workOrderColumns: ColumnsType<WorkOrderData> = [
        {
            title: "Id",
            dataIndex: "id",
            key: "id",
        },
        {
            title: "Title",
            dataIndex: "title",
            key: "title",
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
        },
        {
            title: "Category",
            dataIndex: "category",
            key: "category",
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
        },
        {
            title: "Created At",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (createdAt: string) =>
                new Date(createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                }),
        },
    ];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [items, setItems] = useState<TabsProps["items"]>([
        {
            label: "Complaints",
            key: "1",
            children: (
                <div className="bg-gray-50 p-4 rounded border">
                    <TenantCreateComplaintsModal />
                    <TableComponent
                        columns={complaintColumns}
                        dataSource={complaints.data}
                    />
                </div>
            ),
        },
        {
            label: "Work Orders",
            key: "2",
            children: (
                <div className="bg-gray-50 p-4 rounded border">
                    <TenantCreateWorkOrderModal />
                    <TableComponent
                        columns={workOrderColumns}
                        dataSource={workOrders.data}
                    />
                </div>
            ),
        },
    ]);

    return (
        <div className="container">
            {/* Title */}
            {/* <h1 className="mb-4">Complaints and Work Orders</h1> */}
            <PageTitleComponent title="Complaints and Work Orders" />

            {/* Recent Complaints & Work Orders */}
            <div className="grid grid-cols-2 gap-6">
                <Tabs
                    defaultActiveKey="1"
                    type="card"
                    activeKey={activeKey}
                    onChange={setActiveKey}
                    items={items}
                />
            </div>
        </div>
    );
};

export default TenantComplaintsAndWorkOrders;

function TenantCreateComplaintsModal() {
    const { getToken, userId } = useAuth();
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const [complaintForm] = Form.useForm<ComplaintEntry>();
    const showModal = () => {
        setInternalModalOpen(true);
    };
    const handleCancel = () => {
        if (internalModalOpen) {
            setInternalModalOpen(false);
        }
        if (internalModalOpen === undefined) {
            setInternalModalOpen(false);
        }
    };

    const { mutate: createComplaint, isPending: isPendingComplaint } = useMutation({
        mutationKey: [`${userId}-create-complaint`],
        mutationFn: async () => {
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_DASHBOARD] Error unauthorized");
            }
            // console.log(`NEW COMPLAINT ENTRY FORM VALUES: ${JSON.stringify(complaintForm.getFieldsValue())}`);
            const res = await fetch(absoluteServerUrl("/tenant/complaints"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(complaintForm.getFieldsValue()),
            });

            if (!res.ok) {
                throw new Error("[TENANT_DASHBOARD] Error creating parking_permit");
            }
            return;
        },
    });
    return (
        <>
            <Button
                type="primary"
                className="mb-3"
                onClick={showModal}>
                Create Complaint
            </Button>
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3>Complaints</h3>}
                open={internalModalOpen}
                onOk={() => {
                    createComplaint();
                }}
                okText={"Create"}
                onCancel={handleCancel}
                okButtonProps={{ disabled: isPendingComplaint ? true : false }}
                cancelButtonProps={{ disabled: isPendingComplaint ? true : false }}>
                <p>Enter information about a complaint that you're having here.</p>
                <Divider />
                <Form form={complaintForm}>
                    <p className="fs-7">Title</p>
                    <Form.Item
                        name="title"
                        required={true}>
                        <Input
                            placeholder="Enter a title"
                            type="text"
                            minLength={3}
                            maxLength={50}
                        />
                    </Form.Item>
                    <p className="fs-7">Description</p>
                    <Form.Item
                        name="description"
                        required={true}>
                        <Input.TextArea
                            placeholder="Enter a breif description for complaint"
                            rows={4}
                        />
                    </Form.Item>
                    <p className="fs-7">Category</p>
                    <Form.Item
                        name="category"
                        required={true}>
                        <Select placeholder={"Select a category"}>
                            {Object.values({
                                maintenance: "maintenance",
                                noise: "noise",
                                security: "security",
                                parking: "parking",
                                neighbor: "neighbor",
                                trash: "trash",
                                internet: "internet",
                                lease: "lease",
                                natural_disaster: "natural_disaster",
                                other: "other",
                            }).map((c) => (
                                <Select.Option>{c}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}

function TenantCreateWorkOrderModal() {
    const { getToken, userId } = useAuth();
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const [workOrderForm] = Form.useForm<WorkOrderEntry>();
    const showModal = () => {
        setInternalModalOpen(true);
    };
    const handleCancel = () => {
        if (internalModalOpen) {
            setInternalModalOpen(false);
        }
        if (internalModalOpen === undefined) {
            setInternalModalOpen(false);
        }
    };

    const { mutate: createWorkOrder, isPending: isPendingWorkOrder } = useMutation({
        mutationKey: [`${userId}-create-work-order`],
        mutationFn: async () => {
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_DASHBOARD] Error unauthorized");
            }
            // console.log(`NEW WORK_ORDER ENTRY FORM VALUES: ${JSON.stringify(workOrderForm.getFieldsValue())}`);
            const res = await fetch(absoluteServerUrl("/tenant/work_orders"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(workOrderForm.getFieldsValue()),
            });

            if (!res.ok) {
                throw new Error("[TENANT_DASHBOARD] Error creating work_order");
            }
            return;
        },
    });
    return (
        <>
            <Button
                type="primary"
                className="mb-3"
                onClick={showModal}>
                Create Work Order
            </Button>
            <Modal
                className="p-3 flex-wrap-row"
                title={<h3>Work Order</h3>}
                open={internalModalOpen}
                onOk={() => {
                    createWorkOrder();
                }}
                okText={"Create"}
                onCancel={handleCancel}
                okButtonProps={{ disabled: isPendingWorkOrder ? true : false }}
                cancelButtonProps={{ disabled: isPendingWorkOrder ? true : false }}>
                <p>Fill out your request for a work order here.</p>
                <Divider />
                <Form>
                    <p className="fs-7">Title</p>
                    <Form.Item
                        name="title"
                        required={true}>
                        <Input
                            placeholder="Enter a title"
                            type="text"
                            minLength={3}
                            maxLength={50}
                        />
                    </Form.Item>
                    <p className="fs-7">Description</p>
                    <Form.Item
                        name="description"
                        required={true}>
                        <Input.TextArea
                            placeholder="Enter a breif description for complaint"
                            rows={4}
                        />
                    </Form.Item>
                    <p className="fs-7">Category</p>
                    <Form.Item
                        name="category"
                        required={true}>
                        <Select placeholder={"Select a category"}>
                            {Object.values({
                                plumbing: "plumbing",
                                electric: "electric",
                                carpentry: "carpentry",
                                hvac: "hvac",
                                other: "other",
                            }).map((c) => (
                                <Select.Option
                                    key={c}
                                    value={c}>
                                    {c}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
