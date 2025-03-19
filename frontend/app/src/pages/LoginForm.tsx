import "../styles/styles.scss";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { SignIn } from "@clerk/react-router";

export default function LoginForm() {
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    // Dummy data
    const isAdmin = false;
    const doesUserExists = { userName: "bobby123", password: "password" };

    return (
        <div style={{ position: "relative" }}>
            <div
                className="container mt-3 pt-md-0 d-flex flex-column gap-5 gap-lg-0 justify-content-start align-items-lg-center justify-content-lg-center flex-lg-row"
                style={{ minHeight: "calc(100vh - 3rem)" }}>
                <div className="d-none d-md-flex justify-content-end mx-lg-2">
                    <img
                        src="https://images.pexels.com/photos/7688073/pexels-photo-7688073.jpeg?auto=compress&cs=tinysrgb"
                        className="img-fluid rounded-2"
                        alt="Custom Placeholder"
                        style={{
                            maxWidth: "700px",
                            minHeight: isMobile ? "300px" : "600px",
                            margin: "0  auto",
                        }}
                    />
                </div>
                {/* Clerk SignIn Component */}
                <div
                    className="w-100 w-lg-70 mt-5 mt-lg-0 mx-auto d-flex justify-content-center align-items-center"
                    style={{ height: "100%" }}>
                    <SignIn />
                </div>
            </div>
        </div>
    );
}

function useIsMobile(breakpoint = 768): boolean {
    const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < breakpoint : false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [breakpoint]);

    return isMobile;
}
