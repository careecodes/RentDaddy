import { SignedIn, UserButton, SignOutButton, SignedOut, SignInButton, useUser } from "@clerk/react-router";
import { Button } from "antd";
import { Link } from "react-router";

const ClerkAuthDemo = () => {
    const { user } = useUser();

    return (
        <div className="d-flex flex-column gap-2 w-50 mx-auto my-5 border border-1 border-dark p-5 rounded-3 bg-light">
            {/* Clerk Auth Demo */}
            <h4 className="text-center">Clerk Auth Demo</h4>
            <div className="d-flex flex-column justify-content-center align-items-center bg-light p-5 rounded-3">
                {/* Title */}
                <SignedIn>
                    <div className="d-flex flex-column justify-content-center align-items-center my-5">
                        <p className="fs-2 text-center text-danger">NOTICE!</p>
                        <p className="fs-2 text-center">We are routed back to this page after authentication, but we can also route to the dashboard pages based off the user's role.</p>
                    </div>
                    <div className="d-flex gap-4 align-items-center mb-4">
                        <UserButton size="lg" />
                    </div>
                    <div className="d-flex gap-4 align-items-center mb-4">
                        <Link to="test-go-backend">
                            <Button
                                type="primary"
                                size="large"
                                className="my-3">
                                Test Go Backend
                            </Button>
                        </Link>
                        <SignOutButton>
                            <Button
                                danger
                                size="large"
                                className="my-3">
                                Sign Out
                            </Button>
                        </SignOutButton>
                    </div>
                    <div className="d-flex flex-column gap-3 text-center">
                        <p className="text-muted mb-2 fs-3">Name: {user?.fullName}</p>
                        <p className="text-muted mb-2 fs-3">Email: {user?.emailAddresses[0].emailAddress}</p>
                        <p className="text-muted fs-3">Role: {user?.publicMetadata.role}</p>
                    </div>
                </SignedIn>
                <SignedOut>
                    <div className="d-flex gap-4 justify-content-center">
                        <Link to="/auth/login">
                            <Button
                                type="primary"
                                size="large"
                                className="my-3">
                                Our Sign In
                            </Button>
                        </Link>
                        <SignInButton>
                            <Button
                                size="large"
                                className="my-3">
                                Clerk Sign In
                            </Button>
                        </SignInButton>
                        <SignInButton mode="modal">
                            <Button
                                size="large"
                                className="my-3">
                                Clerk Sign In (Modal)
                            </Button>
                        </SignInButton>
                    </div>
                </SignedOut>
            </div>
        </div>
    );
};
export default ClerkAuthDemo;
