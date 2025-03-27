import { Button, Divider, Form, Input, Modal, Select } from "antd";
import { useState } from "react";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react-router";
import { ComplaintStatus, ComplaintEntry, ComplaintsData, GetApartment } from "../types/types";
import Table, { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const serverUrl = import.meta.env.VITE_SERVER_URL;
const absoluteServerUrl = `${serverUrl}`;

const TenantComplaintsAndWorkOrders = () => {
    const { getToken } = useAuth();
    const [complaints, apartment] = useQueries({
        queries: [
            {
                queryKey: [`complaints`],
                queryFn: async () => {
                    const authToken = await getToken();
                    if (!authToken) {
                        throw new Error("[TENANT_DASHBOARD] Error unauthorized");
                    }
                    const res = await fetch(`${absoluteServerUrl}/tenant/complaints`, {
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

    // console.log(`COMPLAINTS ${JSON.stringify(complaints.data)}\n`);
    // console.log(`COMPLAINTS ${complaints.data?.length}\n`);

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
            render: (status: ComplaintStatus) => {
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
            <PageTitleComponent title="Complaints" />
            {/* Recent Complaints & Work Orders */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded border">
                    <TenantCreateComplaintsModal TenantUnitNumber={apartment.data?.id ?? 0} />
                    <Table
                        columns={complaintColumns}
                        dataSource={complaints.data}
                        loading={complaints.isPending}
                        pagination={{ pageSize: 25 }}
                    />
                </div>
            </div>
        </div>
    );
};

export default TenantComplaintsAndWorkOrders;

interface CreateComplaintModalProps {
    TenantUnitNumber: number;
}

function TenantCreateComplaintsModal(props: CreateComplaintModalProps) {
    const queryClient = useQueryClient();
    const { getToken } = useAuth();
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

    // console.log(`SERVER_URL ${absoluteServerUrl}/tenant/complaints`);
    const { mutate: createComplaint, isPending: isPendingComplaint } = useMutation({
        mutationKey: [`tenant-complaints`],
        mutationFn: async () => {
            complaintForm.setFieldValue("unit_number", props.TenantUnitNumber);
            const authToken = await getToken();
            if (!authToken) {
                throw new Error("[TENANT_DASHBOARD] Error unauthorized");
            }
            console.log(`NEW COMPLAINT ENTRY FORM VALUES: ${JSON.stringify(complaintForm.getFieldsValue())}`);
            const res = await fetch(`${absoluteServerUrl}/tenant/complaints`, {
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
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [`complaints`],
            });
            complaintForm.resetFields();
            handleCancel();
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
                                <Select.Option key={c}>{c}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
