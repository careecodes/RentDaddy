import { Link } from "react-router";

const SuccessRoute = () => {
    return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="text-center mb-4">
                <img
                    src="/sad_logo.png"
                    className="mb-4"
                />
                <h1 className="mb-4">Hooooray! Daddy can pay rent!</h1>
                <Link
                    to="/"
                    className="mb-4">
                    Go back to Home
                </Link>
            </div>
        </div>
    );
};

export default SuccessRoute;
