import { useState } from 'react';
import { Button, Divider, Form, Input, Modal } from 'antd';

interface ModalComponentProps {
    buttonTitle: string;
    content: string;
    type: "default" | "Smart Locker" | "Guest Parking";
    handleOkay: () => void;
}

const ModalComponent = (props: ModalComponentProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    const titles = {
        "default": "Default Modal",
        "Smart Locker": "Smart Locker Modal",
        "Guest Parking": "Register someone in Guest Parking"
    }

    return (
        <>
            {props.type === "default" && (
                <>
                    <Button type="primary" onClick={showModal}>
                        {props.buttonTitle}
                    </Button>
                    <Modal
                        title={titles[props.type]}
                        open={isModalOpen}
                        onOk={props.handleOkay}
                        onCancel={handleCancel}
                        okButtonProps={{ hidden: true, disabled: true }}
                        cancelButtonProps={{ hidden: true, disabled: true }}
                    >
                        <p>{props.content}</p>
                        <div className="flex justify-content-end gap-2">
                            <Button type="default" onClick={handleCancel}>
                                Cancel
                            </Button>
                            {/* Change to ButtonComponent.tsx once JJ's merge is completed with the Config Provider and Components */}
                            <Button type="primary" onClick={props.handleOkay}>
                                Confirm
                            </Button>
                        </div>
                    </Modal>
                </>
            )}
            {props.type === "Smart Locker" && (
                <>
                    <Button type="primary" onClick={showModal}>
                        {props.buttonTitle}
                    </Button>
                    <Modal
                        className='p-3 flex-wrap-row'
                        title={titles[props.type]}
                        open={isModalOpen}
                        onOk={props.handleOkay}
                        onCancel={handleCancel}
                        okButtonProps={{ hidden: true, disabled: true }}
                        cancelButtonProps={{ hidden: true, disabled: true }}
                    >
                        <Form>
                            <Form.Item name="search">
                                <Input placeholder='Search for a Tenant' />
                            </Form.Item>
                            <Form.Item name="locker-number">
                                <Input placeholder='Locker Number' type='number' />
                            </Form.Item>
                            <Divider />
                            <div className="flex justify-content-end gap-2">
                                {/* Cancel button */}
                                <Form.Item name="cancel">
                                    <Button type="default" onClick={() => {
                                        setIsModalOpen(false)
                                    }}>
                                        Cancel
                                    </Button>
                                </Form.Item>
                                <Form.Item name="submit">
                                    <Button type="primary" htmlType="submit">
                                        Submit
                                    </Button>
                                </Form.Item>
                            </div>
                        </Form>
                    </Modal>
                </>
            )}
            {props.type === "Guest Parking" && (
                <>
                    <Button type="primary" onClick={showModal}>
                        {props.buttonTitle}
                    </Button>
                    <Modal
                        className='p-3 flex-wrap-row'
                        title={titles[props.type]}
                        open={isModalOpen}
                        onOk={props.handleOkay}
                        onCancel={handleCancel}
                        okButtonProps={{ hidden: true, disabled: true }}
                        cancelButtonProps={{ hidden: true, disabled: true }}
                    >
                        <Form>
                            <Form.Item name="tenant-name">
                                <Input placeholder='Tenant Name' />
                            </Form.Item>
                            <Form.Item name="license-plate-number">
                                <Input placeholder='License Plate Number' />
                            </Form.Item>
                            <Form.Item name="car-color">
                                <Input placeholder='Car Color' type='number' />
                            </Form.Item>
                            <Form.Item name="car-make">
                                <Input placeholder='Car Make' />
                            </Form.Item>
                            <Form.Item name="duration-of-stay">
                                <Input placeholder='Duration of Stay' type='number' />
                            </Form.Item>
                            <Divider />
                            <div className="flex justify-content-end gap-2">
                                {/* Cancel button */}
                                <Form.Item name="cancel">
                                    <Button type="default" onClick={() => {
                                        setIsModalOpen(false)
                                    }}>
                                        Cancel
                                    </Button>
                                </Form.Item>
                                <Form.Item name="submit">
                                    <Button type="primary" htmlType="submit">
                                        Submit
                                    </Button>
                                </Form.Item>
                            </div>
                        </Form>
                    </Modal>
                </>
            )}

        </>
    );
};

export default ModalComponent;