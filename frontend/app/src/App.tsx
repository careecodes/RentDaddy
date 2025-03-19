import HeroBanner from "./components/HeroBanner";
import HomePageFAQs from "./components/HomePageFAQs";
import HomePageFeaturesComponent from "./components/HomePageFeaturesComponent";

function App() {
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
