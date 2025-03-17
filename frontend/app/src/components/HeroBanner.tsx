import React from "react";
import { Link } from "react-router";

const HeroBanner: React.FC = () => {
    const heroContent = {
        title: "Welcome to RENT DADDY ",
        subtitle: "Win by getting your own appartment!",
        buttonText: "Make Dad Proud",
        buttonLink: "/get-started",
        imageSrc: "https://felixwong.com/gallery/images/a/amsterdam0813-017.jpg",
    };

    return (
        <div
            className="hero-banner text-white img-fluid flex flex-column justify-content-center align-items-center text-center py-5"
            style={{
                backgroundImage: `url(${heroContent.imageSrc})`,
                minHeight: "50vh",
            }}>
            <h1 className="bg-dark p-3 my-5">{heroContent.title}</h1>
            <p className="bg-dark p-3 my-5">{heroContent.subtitle}</p>
            <Link
                to={heroContent.buttonLink}
                className="btn btn-primary">
                {heroContent.buttonText}
            </Link>
        </div>
    );
};

export default HeroBanner;
