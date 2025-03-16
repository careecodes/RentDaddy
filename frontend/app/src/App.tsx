import HeroBanner from "./components/HeroBanner";
import HomePageFAQs from "./components/HomePageFAQs";
import HomePageFeaturesComponent from "./components/HomePageFeaturesComponent";
import ClerkAuthDemo from "./components/ClerkAuthDemo";
import DemoTestingComponent from "./components/DemoTestingComponent";
import ButtonComponent from "./components/reusableComponents/ButtonComponent";
import { InfoCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { useSession } from "@clerk/clerk-react";
import { useEffect } from "react";

function App() {
    const { getToken, isSignedIn } = useSession();

    useEffect(() => {
        const fetchToken = async () => {
            if (isSignedIn) {
                const sessionToken = await getToken();
                console.log("Session Token:", sessionToken, "\n");
            } else {
                console.log("User is not signed in");
            }
        };

        fetchToken();
    }, [isSignedIn, getToken]);

    useEffect(() => {
        const fetchToken = async () => {
            if (isSignedIn) {
                const sessionToken = await getToken();

                // For direct bearer token use
                if (typeof sessionToken === "string") {
                    console.log("Bearer Token:", sessionToken);
                }
                // If it's an object with a token property
                else if (sessionToken && sessionToken.token) {
                    console.log("Bearer Token:", sessionToken.token);
                }
                // If it's an object with different structure
                else {
                    console.log("Full token object:", sessionToken);
                    // Try to identify the bearer token
                    console.log("Potential bearer token candidates:");
                    Object.entries(sessionToken).forEach(([key, value]) => {
                        if (typeof value === "string" && (key.includes("token") || key.includes("access") || key.includes("bearer"))) {
                            console.log(`${key}:`, value);
                        }
                    });
                }
            } else {
                console.log("User is not signed in");
            }
        };
        fetchToken();
    }, [isSignedIn, getToken]);

    return (
        <>
            <HeroBanner />
            <HomePageFeaturesComponent />
            <HomePageFAQs />
            {/* Button Component */}
            <div>
                <h1 className="text-center text-2xl font-bold">Button Component</h1>
                <div className="flex flex-col gap-4 justify-content-center">
                    <ButtonComponent
                        title="Default"
                        type="default"
                    />
                    <ButtonComponent
                        title="Primary"
                        type="primary"
                    />
                    <ButtonComponent
                        title="Secondary"
                        type="secondary"
                    />

                    {/* Tertiary / Accent */}
                    <ButtonComponent
                        title="Tertiary / Accent"
                        type="warning"
                    />

                    {/* Danger / Cancel */}
                    <ButtonComponent
                        title="Danger / Cancel"
                        type="danger"
                    />

                    {/* Info */}
                    <ButtonComponent
                        title="Info"
                        type="info"
                        icon={<InfoCircleOutlined />}
                    />

                    {/* Loading */}
                    <ButtonComponent
                        title="Loading"
                        type="loading"
                        icon={<LoadingOutlined />}
                    />

                    {/* Disabled */}
                    <ButtonComponent
                        title="Disabled"
                        type="disabled"
                        disabled={true}
                    />
                </div>
                {/* Different Sizes */}
                <div className="flex flex-row gap-4 justify-content-center mt-4">
                    <ButtonComponent
                        title="Default"
                        type="primary"
                    />
                    <ButtonComponent
                        title="Large"
                        type="primary"
                        size="large"
                    />
                </div>
            </div>

            {/* Let's completely remove this component once we are done testing */}
            {/* Or when everyone is confident they understand the code and how to use it themselves moving forward */}
            <DemoTestingComponent />

            {/* Let's completely remove this component once we are done testing */}
            {/* Or when everyone is confident they understand the code and how to use it themselves moving forward */}
            <ClerkAuthDemo />
        </>
    );
}

export default App;
