import { Button, Form, Input, Select, Table } from "antd";
import React, { useState } from "react";
import TableComponent from "../components/reusableComponents/TableComponent";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import ModalComponent from "../components/ModalComponent";
import { useMutation } from "@tanstack/react-query";

const DOMAIN_URL = import.meta.env.DOMAIN_URL;
const PORT = import.meta.env.PORT;
const API_URL = `${DOMAIN_URL}:${PORT}`.replace(/\/$/, ""); // :white_check_mark: Remove trailing slashes

// Make the Add Locations a Modal that adds a building, floor, and room number
// The user can add multiple locations

type Building = {
    buildingNumber: number;
    floorNumbers: number;
    numberOfRooms: number;
};

const AdminApartmentSetupAndDetailsManagement = () => {
    // State that holds the locations (building #, floor #s in that building, room numbers in that building)
    // TODO: When no longer needed for development, delete the clear locations button and mock data
    const [locations, setLocations] = React.useState<{ building: number; floors: number[]; rooms: number[] }[]>([]);

    // State the holds the location that is currently being located
    const [editBuildingObj, setEditBuildingObj] = useState<Building>({
        buildingNumber: 0,
        floorNumbers: 0,
        numberOfRooms: 0,
    });

    console.log(editBuildingObj);

    // tanstack for editing locations that were put in
    const { mutate: editLocations } = useMutation({
        mutationFn: async (buildingData: Building) => {
            console.log(editBuildingObj, "editBuildingObj in tanstack mutation");
            // TODO: James, when you finish the backend route, change the variable endpoint to the right one.
            const res = await fetch(`${API_URL}/admins/apartment/edit/{id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(buildingData),
            });

            if (!res.ok) {
                throw new Error("Failed to update location");
            }

            return res;
        },
        onSuccess: () => {
            // Invalidate and refetch
            console.log("success");
        },
        onError: (e: any) => {
            console.log("error ", e);
        },
    });

    const handleEditLocation = () => {
        console.log("starting edit location");
        editLocations(editBuildingObj);
    };

    const columns = [
        {
            title: "Building",
            dataIndex: "building",
            key: "building",
        },
        {
            title: "Floors",
            dataIndex: "floors",
            key: "floors",
            render: (floors: number[]) => floors.join(", "),
        },
        {
            title: "Rooms",
            dataIndex: "rooms",
            key: "rooms",
            render: (rooms: number[]) => rooms.join(", "),
        },
        {
            title: "Action",
            key: "action",
            render: (text: string, record: { building: number; floors: number[]; rooms: number[] }) => (
                <div className="flex gap-2">
                    <ButtonComponent
                        title="Delete"
                        type="danger"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                            setLocations(locations.filter((location) => location.building !== record.building));
                        }}
                    />
                    <ModalComponent
                        buttonType="default"
                        buttonTitle="Edit"
                        modalTitle="Edit Apartment Building"
                        content=""
                        type="Edit Apartment Building"
                        apartmentBuildingSetEditBuildingState={setEditBuildingObj}
                        apartmentBuildingEditProps={editBuildingObj}
                        handleOkay={() => handleEditLocation()}
                    />
                </div>
            ),
        },
    ];

    return (
        <div className="container">
            <h1 className="mb-3">Admin Apartment Setup And Details Management</h1>
            <Form
                className="admin-apartment-setup-form-container"
                layout="vertical">
                {/* Table */}
                {locations.length > 0 && (
                    <TableComponent
                        dataSource={locations}
                        columns={columns}
                    />
                )}
                {/* Add Location */}
                <Form.Item
                    name="location"
                    label="Add Location"
                    rules={[
                        {
                            required: true,
                            message: "Please select a location",
                        },
                    ]}>
                    <div className="flex flex-row gap-3 mt-3">
                        <Input
                            placeholder="Building #"
                            type="number"
                        />
                        <Input
                            placeholder="# of Floors"
                            type="number"
                        />
                        <Input
                            placeholder="# of Room"
                            type="number"
                        />
                    </div>
                </Form.Item>
                {/* Clear Button */}
                <div className="flex gap-2 mb-3">
                    <ButtonComponent
                        title="Clear Locations"
                        type="danger"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                            setLocations([]);
                        }}
                    />
                    {/* Add Location Button */}
                    <ButtonComponent
                        title="Add Location"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            const buildingInput = document.querySelector('input[placeholder="Building #"]') as HTMLInputElement;
                            const building = parseInt(buildingInput?.value || "0");
                            const floors = document.querySelector('input[placeholder="# of Floors"]') as HTMLInputElement;
                            const rooms = document.querySelector('input[placeholder="# of Room"]') as HTMLInputElement;
                            setLocations([...locations, { building, floors: [parseInt(floors?.value || "0")], rooms: [parseInt(rooms?.value || "0")] }]);
                        }}
                    />
                </div>
                <Form.Item
                    name="parking-settings"
                    label="Parking Settings"
                    rules={[{ required: true, message: "Please enter parking settings" }]}>
                    {/* Available Spots */}
                    <div className="flex flex-column gap-3">
                        <Input
                            placeholder="Available Spots"
                            type="number"
                        />
                        {/* Max Spots Per User */}
                        <Input
                            placeholder="Max Spots Per User"
                            type="number"
                        />
                    </div>
                </Form.Item>
                <Form.Item
                    name="mail-locker-settings"
                    label="Mail Locker Settings"
                    rules={[{ required: true, message: "Please enter mail locker settings" }]}>
                    <Input
                        placeholder="Available Lockers"
                        type="number"
                    />
                </Form.Item>
                <Form.Item
                    name="smtp-settings"
                    label="SMTP Settings"
                    rules={[{ required: true, message: "Please enter SMTP settings" }]}>
                    <div className="flex flex-column gap-3">
                        {/* Url / Domain */}
                        <Input placeholder="Url/Domain" />
                        {/* Port */}
                        <Input
                            placeholder="Port"
                            type="number"
                        />
                        {/* Username */}
                        <Input placeholder="Username" />
                        {/* Password */}
                        <Input placeholder="Password" />
                    </div>
                </Form.Item>
                <Form.Item
                    name="apartment-manager-contact-information"
                    label="Apartment Manager Contact Information"
                    rules={[
                        {
                            required: true,
                            message: "Please enter apartment manager contact information",
                        },
                    ]}>
                    <div className="flex flex-column gap-3">
                        {/* Phone Number */}
                        <Input
                            placeholder="Phone Number"
                            type="number"
                        />
                        {/* Email */}
                        <Input placeholder="Email" />
                    </div>
                </Form.Item>
                <div className="flex justify-content-end gap-2">
                    {/* Cancel button */}
                    <Form.Item name="cancel">
                        <Button
                            type="default"
                            onClick={() => {
                                console.log("Cancel");
                            }}>
                            Cancel
                        </Button>
                    </Form.Item>
                    {/* Submit Button */}
                    <Form.Item name="submit">
                        <Button
                            type="primary"
                            htmlType="submit">
                            Submit
                        </Button>
                    </Form.Item>
                </div>
            </Form>
        </div>
    );
};

export default AdminApartmentSetupAndDetailsManagement;
