import HeroBanner from "./components/HeroBanner";
import HomePageFAQs from "./components/HomePageFAQs";
import HomePageFeaturesComponent from "./components/HomePageFeaturesComponent";
import ClerkAuthDemo from "./components/ClerkAuthDemo";
import DemoTestingComponent from "./components/DemoTestingComponent";
import ButtonComponent from "./components/reusableComponents/ButtonComponent";
import { InfoCircleOutlined, LoadingOutlined } from "@ant-design/icons";

function App() {
    return (
        <>
            <div>
                <HeroBanner />
            </div>

            <div className="my-2 flex-container">
                <HomePageFeaturesComponent />
            </div>

            <div>
                <HomePageFAQs />
            </div>

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
        </>
    );
}

export default App;
