import { Form, Input, message, Space } from "antd";
import React, { useState } from "react";
import TableComponent from "../components/reusableComponents/TableComponent";
import ButtonComponent from "../components/reusableComponents/ButtonComponent";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import ModalComponent from "../components/ModalComponent";
import { useMutation } from "@tanstack/react-query";
import PageTitleComponent from "../components/reusableComponents/PageTitleComponent";
import { useAuth } from "@clerk/clerk-react";
import { SERVER_API_URL } from "../utils/apiConfig";

const absoluteServerUrl = SERVER_API_URL;

// Make the Add Locations a Modal that adds a building, floor, and room number
// The user can add multiple locations

type Building = {
    buildingNumber: number;
    floorNumbers: number;
    numberOfRooms: number;
};

type AdminSetup = {
    parkingTotal: number;
    perUserParking: number;
    lockerCount: number;
    buildings: Building[];
};

const AdminApartmentSetupAndDetailsManagement = () => {
    // State that holds the locations (building #, floor #s in that building, room numbers in that building)
    const [locations, setLocations] = React.useState<{ building: number; floors: number; rooms: number }[]>([]);
    const { getToken } = useAuth();

    console.log("locations on load", locations);

    const [editBuildingObj, setEditBuildingObj] = useState<Building>({} as Building);

    const [adminSetupObject, setAdminSetupObject] = useState<AdminSetup>({
        parkingTotal: 0,
        perUserParking: 0,
        lockerCount: 0,
        buildings: [],
    });

    const [submitLoading, setSubmitLoading] = useState(false);

    console.log("adminSetupObject", adminSetupObject);

    console.log(editBuildingObj);

    const { mutate: adminApartmentSetup } = useMutation({
        mutationFn: async (adminSetupObject: AdminSetup) => {
            console.log("Starting admin apartment setup admin");
            const token = await getToken();

            console.log("adminSetupObject", adminSetupObject);

            const res = await fetch(`${absoluteServerUrl}/admin/setup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(adminSetupObject),
            });

            console.log(res);

            if (!res.ok) {
                throw new Error("Failed to setup apartment");
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


    // console.log("Testing for Ryan, this is the adminApartmentSetup return from the Tanstack useMutation", adminApartmentSetup);

    const handleSendAdminSetup = () => {
        console.log("starting admin setup");
        setSubmitLoading(true);

        try {
            adminApartmentSetup(adminSetupObject, {
                onSuccess: () => {
                    message.success('Apartment setup completed successfully!');

                    // Reset the apartment setup state
                    setAdminSetupObject({
                        parkingTotal: 0,
                        perUserParking: 0,
                        lockerCount: 0,
                        buildings: [],
                    });

                    setLocations([]);
                },
                onError: (error: Error) => {
                    message.error('Failed to complete apartment setup. Please try again.');
                    console.error("Error in apartment setup:", error);
                },
                onSettled: () => {
                    setSubmitLoading(false);
                }
            });
        } catch (err) {
            message.error('Failed to complete apartment setup. Please try again.');
            console.error("Error in apartment setup:", err);
            setSubmitLoading(false);
        }

        console.log("adminSetupObject", adminSetupObject);
    };

    // tanstack for editing locations that were put in
    const { mutate: editLocations } = useMutation({
        mutationFn: async (buildingData: Building) => {
            console.log(editBuildingObj, "editBuildingObj in tanstack mutation");
            // Use the admin/setup endpoint since there's no dedicated building endpoint
            const token = await getToken();

            // Format request to use the existing admin/setup endpoint
            // We don't know the actual parking values, so use values from the building object if available
            const setupData = {
                buildings: [buildingData],
                parkingTotal: adminSetupObject.parkingTotal || 0,
                perUserParking: adminSetupObject.perUserParking || 0,
                lockerCount: 0  // No new lockers needed for an update
            };

            const res = await fetch(`${absoluteServerUrl}/admin/setup`, {
                method: "POST",  // Admin setup uses POST method
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(setupData),
            });

            /* 
            const res = await fetch(`${absoluteServerUrl}/admin/buildings/{id}`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await getToken()}`,
                },
                body: JSON.stringify(buildingData),
            });
            */

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

    const handleFormValuesChange = (_: any, allValues: any) => {
        // Update apartment setup object
        setAdminSetupObject((prev) => ({
            ...prev,
            parkingTotal: Number(allValues["parking-settings"][0]) || 0,
            perUserParking: Number(allValues["parking-settings"][1]) || 0,
            lockerCount: Number(allValues["mail-locker-settings"]) || 0,
            buildings: prev.buildings,
        }));
    };

    // Handles adding the building to the locations state
    const handleAddLocation = () => {
        const buildingInput = document.querySelector('input[placeholder="Building #"]') as HTMLInputElement;
        const floorsInput = document.querySelector('input[placeholder="# of Floors"]') as HTMLInputElement;
        const roomsInput = document.querySelector('input[placeholder="# of Room"]') as HTMLInputElement;

        const newBuilding = {
            building: parseInt(buildingInput?.value || "0"),
            floors: parseInt(floorsInput?.value || "0"),
            rooms: parseInt(roomsInput?.value || "0"),
        };

        // Update locations state
        setLocations((prev) => [...prev, newBuilding]);

        // Update adminSetupObject with the new building
        setAdminSetupObject((prev) => ({
            ...prev,
            buildings: [
                ...prev.buildings,
                {
                    buildingNumber: newBuilding.building,
                    floorNumbers: newBuilding.floors,
                    numberOfRooms: newBuilding.rooms,
                },
            ],
        }));

        // Reset the inputs
        if (buildingInput) buildingInput.value = "";
        if (floorsInput) floorsInput.value = "";
        if (roomsInput) roomsInput.value = "";
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
            render: (floors: number) => floors,
        },
        {
            title: "Rooms",
            dataIndex: "rooms",
            key: "rooms",
            render: (rooms: number) => rooms,
        },
        {
            title: "Action",
            key: "action",
            render: (_: any, record: { building: number; floors: number; rooms: number }) => (
                <div className="flex gap-2">
                    <ButtonComponent
                        title="Delete"
                        type="danger"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                            setLocations(locations.filter((location) => location.building !== record.building));
                            setAdminSetupObject((prev) => ({
                                ...prev,
                                buildings: prev.buildings.filter((b) => b.buildingNumber !== record.building),
                            }));
                        }}
                    />
                    <ModalComponent
                        buttonType="default"
                        buttonTitle="Edit"
                        modalTitle="Edit Apartment Building"
                        content=""
                        type="Edit Apartment Building"
                        apartmentBuildingSetEditBuildingState={setEditBuildingObj}
                        apartmentBuildingEditProps={{
                            buildingNumber: record.building,
                            floorNumbers: record.floors,
                            numberOfRooms: record.rooms,
                        }}
                        handleOkay={() => {
                            handleEditLocation();
                            return Promise.resolve();
                        }}
                        setUserId={() => { }}
                        setAccessCode={() => { }}
                        selectedUserId=""
                        accessCode=""
                    />
                </div>
            ),
        },
    ];

    return (
        <div className="container">
            {/* <h1 className="mb-3">Admin Apartment Setup And Details Management</h1> */}
            <PageTitleComponent title="Admin Apartment Setup and Details Management" />


            <Form
                onFinish={handleSendAdminSetup}
                onValuesChange={handleFormValuesChange}
                className="admin-apartment-setup-form-container"
                layout="vertical"
                initialValues={{
                    "parking-settings": [adminSetupObject.parkingTotal, adminSetupObject.perUserParking],
                    "mail-locker-settings": adminSetupObject.lockerCount,
                }}>
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
                            min={0}
                        />
                        <Input
                            placeholder="# of Floors"
                            type="number"
                            min={0}
                        />
                        <Input
                            placeholder="# of Room"
                            type="number"
                            min={0}
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
                            setAdminSetupObject(prev => ({
                                ...prev,
                                buildings: []
                            }));
                        }}
                    />
                    {/* Add Location Button */}
                    <ButtonComponent
                        title="Add Location"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddLocation}
                    />
                </div>
                <Form.Item
                    name={["parking-settings", 0]}
                    label="Available Parking Spots"
                    rules={[{ required: true, message: "Please enter available parking spots" }]}>
                    <Input
                        placeholder="Available Spots"
                        type="number"
                        min={0}
                    />
                </Form.Item>
                <Form.Item
                    name={["parking-settings", 1]}
                    label="Max Parking Spots Per User"
                    rules={[{ required: true, message: "Please enter max spots per user" }]}>
                    <Input
                        placeholder="Max Spots Per User"
                        type="number"
                        min={0}
                    />
                </Form.Item>
                <Form.Item
                    name="mail-locker-settings"
                    label="Mail Locker Settings"
                    rules={[{ required: true, message: "Please enter mail locker settings" }]}>
                    <Input
                        placeholder="Available Lockers"
                        type="number"
                        min={0}
                    />
                </Form.Item>

                {/* Submit button for Apartment Setup */}
                <Space className="flex justify-end mt-4 mb-8">
                    <ButtonComponent
                        type="default"
                        title="Cancel"
                        onClick={() => {
                            console.log("Cancel Apartment Setup");
                            // Reset the apartment setup form
                            setAdminSetupObject({
                                parkingTotal: 0,
                                perUserParking: 0,
                                lockerCount: 0,
                                buildings: [],
                            });
                            setLocations([]);
                        }}
                    />
                    <ButtonComponent
                        type="primary"
                        title="Submit Apartment Setup"
                        onClick={handleSendAdminSetup}
                        loading={submitLoading}
                    />
                </Space>


                {/* <Form.Item
                    name="smtp-settings"
                    label="SMTP Settings"
                    rules={[{ required: true, message: "Please enter SMTP settings" }]}>
                    <div className="flex flex-column gap-3">
                        <Input placeholder="Url/Domain" />
                        <Input
                            placeholder="Port"
                            type="number"
                        />
                        <Input placeholder="Username" />
                        <Input placeholder="Password" />
                    </div>
                </Form.Item> */}
            </Form>
        </div>
    );
};

export default AdminApartmentSetupAndDetailsManagement;
