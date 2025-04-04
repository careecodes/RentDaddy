import React, { useEffect, useState } from "react";
import { Button, Modal, Form, Input } from "antd";
import { CheckOutlined, CloseCircleOutlined } from "@ant-design/icons";

interface TourFormSchema {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
}

interface Notification {
    show: boolean;
    message: string;
    type: "default" | "success" | "error";
}

const HeroBanner: React.FC = () => {
    const [notificationStatus, setNotificationStatus] = useState<Notification>({
        show: false,
        message: "",
        type: "default",
    });
    const heroContent = {
        title: "Welcome to EZRA Apartments",
        subtitle: "Get ahead in life with your own place!",
        buttonText: "Schedual a tour",
        imageSrc: "https://felixwong.com/gallery/images/a/amsterdam0813-017.jpg",
    };

    const [open, setOpen] = useState(false);
    const [form] = Form.useForm<TourFormSchema>();

    const showModal = () => {
        setOpen(true);
    };

    const handleOk = async () => {
        try {
            setNotificationStatus({
                show: true,
                message: "Successfully sent",
                type: "success",
            });
            // tenantInviteForm.resetFields();
            // queryClient.invalidateQueries({
            //     queryKey: ["tenants"],
            // });
            const values = await form.validateFields();
            console.log("Prospective Tenant Info:", values);
        } catch (error) {
            throw new Error(`[HERO_BANNER] Error schedual tour form valiation failed: ${error}`);
        }
    };

    const handleCancel = () => {
        setOpen(false);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setNotificationStatus((prev) => ({ ...prev, show: false }));
        }, 3000);

        return () => clearTimeout(timer);
    }, [notificationStatus.show]);

    return (
        <div
            style={{ position: "relative", minHeight: "50vh" }}
            className="my-5">
            <div
                className="rounded"
                style={{ position: "absolute", inset: 0, zIndex: 3, background: "black", opacity: 0.4 }}></div>
            <div
                className="hero-banner rounded img-fluid"
                style={{
                    position: "relative",
                    zIndex: 2,
                    backgroundImage: `url(${heroContent.imageSrc})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    minHeight: "50vh",
                }}></div>
            <div
                className="col-10 col-lg-7 text-white flex flex-column justify-content-center align-items-center position-absolute top-50 start-50 translate-middle"
                style={{ zIndex: 3, maxWidth: "80%", textAlign: "center" }}>
                <h1
                    style={{
                        fontSize: "45px",
                        fontWeight: "bold",
                        textShadow: "2px 2px 8px rgba(0, 0, 0, 0.9)",
                        hyphens: "auto",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                    }}>
                    Ezra Apartments Your New Home, Your New Beginning
                </h1>
                <Button
                    type="primary"
                    className="mt-5 fs-6 p-3 d-flex justify-content-center align-items-center"
                    onClick={showModal}>
                    Request Tour
                    <span className="mb-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            className="lucide lucide-arrow-up-right-icon lucide-arrow-up-right">
                            <path d="M7 7h10v10" />
                            <path d="M7 17 17 7" />
                        </svg>
                    </span>
                </Button>
                <Modal
                    open={open}
                    onOk={handleOk}
                    onCancel={handleCancel}
                    footer={[
                        <Button
                            key="back"
                            onClick={handleCancel}>
                            Return
                        </Button>,
                        <Button
                            key="submit"
                            type="primary"
                            loading={notificationStatus.show}
                            onClick={handleOk}>
                            Submit
                        </Button>,
                    ]}>
                    <span>
                        <h3 style={{ fontWeight: "bold" }}>Contact Info</h3>
                        <p>Thanks for your intrest in EZRA Apartments, Please enter the info below to help us schedule a tour for you</p>
                    </span>
                    <Form
                        form={form}
                        layout="vertical">
                        <div className="flex justify-content-between align-items-center gap-3">
                            <Form.Item
                                className="w-50"
                                name="firstName"
                                rules={[{ required: true, message: "Please enter your first name" }]}>
                                <p
                                    style={{ fontWeight: "bold" }}
                                    className="mx-1">
                                    First Name
                                </p>
                                <Input />
                            </Form.Item>
                            <Form.Item
                                className="w-50"
                                name="lastName"
                                rules={[{ required: true, message: "Please enter your last name" }]}>
                                <p
                                    style={{ fontWeight: "bold" }}
                                    className="mx-1">
                                    Last Name
                                </p>
                                <Input />
                            </Form.Item>
                        </div>
                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: "Please enter your email" },
                                { type: "email", message: "Enter a valid email" },
                            ]}>
                            <p
                                style={{ fontWeight: "bold" }}
                                className="mx-1">
                                Email
                            </p>
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="phone"
                            rules={[{ required: true, message: "Please enter your phone number" }]}>
                            <p
                                style={{ fontWeight: "bold" }}
                                className="mx-1">
                                Phone
                            </p>
                            <Input />
                        </Form.Item>
                        {notificationStatus.show ? (
                            <div className="d-flex align-items-center">
                                {notificationStatus.type === "success" ? <CheckOutlined className="text-success fs-6 mb-3 mx-1" /> : <CloseCircleOutlined className="text-danger fs-6 mb-3 mx-1" />}
                                <p className={`fs-6 ${notificationStatus.type === "success" ? "text-success" : "text-danger"}`}>{notificationStatus.message}</p>
                            </div>
                        ) : (
                            <p style={{ minHeight: "16px" }}></p>
                        )}
                    </Form>
                </Modal>
            </div>
        </div>
    );
};

export default HeroBanner;
