import React from "react";
import { Link } from "react-router";

const HeroBanner: React.FC = () => {
    const heroContent = {
        title: "Welcome to EZRA Apartments",
        subtitle: "Get ahead in life with your own place!",
        buttonText: "Contact us for a tour!",
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
            <h1 className="bg-dark p-3 my-2">{heroContent.title}</h1>
            <p className="bg-dark p-3 my-3">{heroContent.subtitle}</p>
            <Link
                to={heroContent.buttonLink}
                className="btn btn-primary">
                {heroContent.buttonText}
            </Link>
        </div>
    );
};

export default HeroBanner;
