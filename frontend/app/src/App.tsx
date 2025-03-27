import { useAuth } from "@clerk/react-router";
import HeroBanner from "./components/HeroBanner";
import HomePageFAQs from "./components/HomePageFAQs";
import HomePageFeaturesComponent from "./components/HomePageFeaturesComponent";
import { useEffect } from "react";
import MyChatBot from "./components/ChatBot";

function App() {
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const token = await getToken();
        console.log(token);
      } catch (error) {
        console.error("Error fetching session token:", error);
      }
    };

    fetchSession();
  }, [getToken]);

  return (
    <>
      <div className="container">
        <HeroBanner />
        <div className="my-2 flex-container">
          <HomePageFeaturesComponent />
        </div>

        <HomePageFAQs />
        <MyChatBot />
      </div>
    </>
  );
}

export default App;
