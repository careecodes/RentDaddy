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
            <div className="container">
                <HeroBanner />

                <div className="my-2 flex-container">
                    <HomePageFeaturesComponent />
                </div>

                <HomePageFAQs />
            </div>
        </>
    );
}

export default App;
