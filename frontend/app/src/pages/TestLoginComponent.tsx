import { SignIn } from "@clerk/clerk-react"

const TestLoginComponent = () => {
    return (
        <div className="container py-5 my-5">
            <h2 className="text-center mb-4">
                Welcome Back
            </h2>

            <div className="row justify-content-center">
                <p className="text-center text-muted mb-5 fs-5">
                    Sign in to your account
                </p>

                <div className="row align-items-center justify-content-center">
                    {/* Left side image */}
                    <div className="col-md-6 d-flex justify-content-center align-items-center">
                        <img
                            src="/logo.png"
                            alt="login"
                            className="img-fluid"
                            style={{ maxWidth: '350px', height: '400px' }}
                        />
                    </div>

                    {/* Right Side Sign In Component */}
                    <div className="col-md-6 d-flex justify-content-center align-items-center">
                        <SignIn />
                    </div>
                </div>
            </div>
        </div>
    )
}
export default TestLoginComponent