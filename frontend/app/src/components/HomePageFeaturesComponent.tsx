import { LockOutlined, InboxOutlined, CarOutlined, MobileOutlined } from "@ant-design/icons";
import { CardComponent } from "./reusableComponents/CardComponent";


/**
 * HomePageFeaturesComponent - Displays a grid of feature cards highlighting smart living amenities
 * Uses Ant Design's Card, Row, and Col components for responsive layout
 * Is used on the Home Page under the Hero Section
 */
const HomePageFeaturesComponent = () => {
    // Array of features with properties for title, icon, and description
    // TODO: Should we add more features? Like images or something
    const features = [
        {
            title: "Smart Door Locks",
            icon: <LockOutlined className="fs-2 text-primary mb-3" />,
            description: "Access your apartment securely through our mobile app. Grant temporary access to guests or maintenance with just a tap.",
        },
        {
            title: "Smart Package Lockers",
            icon: <InboxOutlined className="fs-2 text-success mb-3" />,
            description: "Never miss a delivery with our secure smart lockers. Receive instant notifications when packages arrive.",
        },
        {
            title: "Guest Parking Management",
            icon: <CarOutlined className="fs-2 text-warning mb-3" />,
            description: "Easily register guest vehicles and manage parking permits through our convenient digital system.",
        },
        {
            title: "Resident Portal",
            icon: <MobileOutlined className="fs-2 text-info mb-3" />,
            description: "Manage your entire resident experience from our website - pay rent, submit maintenance requests, and control smart home features.",
        },
    ];

    return (
        <>
            <div className="container mb-3">
                {/* Title */}
                <h2 className="my-3 fw-bold">Smart Living</h2>
                <div className="flex-container">
                    {/* Grid of feature cards */}
                    {features.map((feature) => (
                        <CardComponent
                            hoverable
                            icon={feature.icon}
                            title={feature.title}
                            description={feature.description}
                        />
                    ))}
                </div>
            </div>
        </>
    );
};

export default HomePageFeaturesComponent;
