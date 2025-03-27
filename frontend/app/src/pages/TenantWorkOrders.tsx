import { useAuth } from "@clerk/react-router";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import Table, { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { GetApartment, WorkOrderData, WorkOrderEntry, WorkStatus } from "../types/types";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import { Button, Divider, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";

const serverUrl = import.meta.env.VITE_SERVER_URL;
const absoluteServerUrl = `${serverUrl}`;

export default function WorkOrders() {
    const { getToken } = useAuth();
    const [workOrders, apartment] = useQueries({
        queries: [
            {
                queryKey: [`work-orders-query`],
                queryFn: async () => {
                    const authToken = await getToken();
                    if (!authToken) {
                        throw new Error("[TENANT_DASHBOARD] Error unauthorized");
                    }
                    const res = await fetch(`${absoluteServerUrl}/tenant/work_orders`, {
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
            {
                queryKey: [`apartment`],
                staleTime: 0,
                queryFn: async () => {
                    const authToken = await getToken();
                    if (!authToken) {
                        throw new Error("[TENANT_DASHBOARD] Error unauthorized");
                    }
                    const res = await fetch(`${absoluteServerUrl}/tenant/apartment`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${authToken}`,
                        },
                    });

                    if (!res.ok) {
                        throw new Error("[TENANT_DASHBOARD] Error tenant Work_orders request failed");
                    }
                    return (await res.json()) as GetApartment;
                },
            },
        ],
    });
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
            render: (status: WorkStatus) => {
                if (status !== "resolved") {
                    return <p>{status}</p>;
                }

                return <p className="text-success">{status}</p>;
            },
        },
        {
            title: "Created At",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (date) => dayjs(date).format("MMM D, YYYY h:mm A"),
        },
    ];
    return (
        <div className="container">
            {/* Title */}
            {/* <h1 className="mb-4">Complaints and Work Orders</h1> */}
            <PageTitleComponent title="Work Orders" />
            {/* Recent Complaints & Work Orders */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded border">
                    <TenantCreateWorkOrderModal TenantUnitNumber={apartment.data?.id ?? 0} />
                    <Table
                        columns={workOrderColumns}
                        dataSource={workOrders.data}
                        loading={workOrders.isPending}
                        pagination={{ pageSize: 25 }}
                    />
                </div>
            </div>
        </div>
    );
}
interface CreateWorkOrderModalProps {
    TenantUnitNumber: number;
}

function TenantCreateWorkOrderModal(props: CreateWorkOrderModalProps) {
    const queryClient = useQueryClient();
    const { getToken } = useAuth();
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
        mutationKey: [`work-orders-mutation`],
        mutationFn: async () => {
            workOrderForm.setFieldValue("UnitNumber", props.TenantUnitNumber);
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_DASHBOARD] Error unauthorized");
            }
            console.log(`NEW WORK_ORDER ENTRY FORM VALUES: ${JSON.stringify(workOrderForm.getFieldsValue())}`);
            const res = await fetch(`${absoluteServerUrl}/tenant/work_orders`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(workOrderForm.getFieldsValue()),
            });

            if (!res.ok) {
                console.log(`Endpoint failed work order`);
                throw new Error("[TENANT_DASHBOARD] Error creating work_order");
            }
            console.log(`Endpoint success work order`);
            return;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["work-orders-query"],
            });
            workOrderForm.resetFields();
            handleCancel();
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
                <Form form={workOrderForm}>
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
