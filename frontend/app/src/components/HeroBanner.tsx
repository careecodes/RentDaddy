import React, { useState } from "react";
import { Button, Modal, Form, Input } from "antd";

const HeroBanner: React.FC = () => {
    const heroContent = {
        title: "Welcome to EZRA Apartments",
        subtitle: "Get ahead in life with your own place!",
        buttonText: "Contact us for a tour!",
        imageSrc: "https://felixwong.com/gallery/images/a/amsterdam0813-017.jpg",
    };

    const [open, setOpen] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [form] = Form.useForm();

    const showModal = () => {
        setOpen(true);
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            console.log("Prospective Tenant Info:", values);
            setConfirmLoading(true);
            setTimeout(() => {
                setOpen(false);
                setConfirmLoading(false);
                form.resetFields();
            }, 2000);
        } catch (error) {}
    };

    const handleCancel = () => {
        setOpen(false);
    };

    return (
        <div
            className="hero-banner text-white img-fluid flex flex-column justify-content-center align-items-center text-center py-5"
            style={{
                backgroundImage: `url(${heroContent.imageSrc})`,
                minHeight: "50vh",
            }}>
            <h1 className="bg-dark p-3 my-2">{heroContent.title}</h1>
            <p className="bg-dark p-3 my-3">{heroContent.subtitle}</p>

            <Button
                type="primary"
                onClick={showModal}>
                {heroContent.buttonText}
            </Button>
            <Modal
                title="Contact Info"
                open={open}
                onOk={handleOk}
                confirmLoading={confirmLoading}
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
                        loading={confirmLoading}
                        onClick={handleOk}>
                        Submit
                    </Button>,
                ]}>
                <p>Thanks for your intrest in EZRA Apartments! </p>
                <p>Please enter the info below to help us schedule a tour for you!</p>
                <Form
                    form={form}
                    layout="vertical">
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: "Please enter your name" }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: "Please enter your email" },
                            { type: "email", message: "Enter a valid email" },
                        ]}>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="phone"
                        label="Phone"
                        rules={[{ required: true, message: "Please enter your phone number" }]}>
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default HeroBanner;
