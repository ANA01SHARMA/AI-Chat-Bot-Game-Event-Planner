// src/pages/LandingPage.jsx
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Swiper from 'swiper/bundle';
// Import Swiper styles directly
import 'swiper/css/bundle';
// Import component-specific styles
import '../css/LandingPage.css'; // Uses the version you specified

/**
 * LandingPage Component
 * Displays the main landing page content including a Navbar, hero section,
 * an image carousel (Swiper with reduced width), feature highlights, and a footer.
 * Using direct paths for images in public/images/.
 */

// --- Configuration ---
// MODIFIED: Assuming image is in public/assets/image-1.png
const heroBgImage = '/assets/image-6.webp'; // <-- Changed this line

// --- Feature Icons (Inline SVG Components) ---
const ClockIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6"> <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /> </svg> );
const SparklesIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6"> <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L24 5.25l-.813 2.846a4.5 4.5 0 0 0-3.09 3.09L18.25 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09L12 18.75l.813-2.846a4.5 4.5 0 0 0 3.09-3.09L18.25 12Z" /> </svg> );
const CogIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6"> <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15.045-4.122-.738-1.107M19.5 16.122l.738 1.107M12 21v-1.5m0-15V3m-5.955 5.122-.738 1.107M13.5 7.878l.738-1.107m2.303 8.486.738 1.107M7.5 16.122l-.738 1.107M12 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /> </svg> );
const UsersIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6"> <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.94-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.06 2.772m0 0a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /> </svg> );

// --- Navbar Component ---
function Navbar() {
    return (
        <nav className="relative z-20 flex items-center justify-between py-4 px-2 sm:px-0 border-b border-white/10 mb-6">
            {/* Site Title/Logo */}
            <Link to="/" className="text-xl sm:text-2xl font-bold text-cyan-300 hover:text-cyan-200 transition-colors font-zen-dots">
                EVENT PLANNER
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center space-x-4 sm:space-x-6 text-sm sm:text-base">
                <a href="#features" className="text-gray-300 hover:text-cyan-400 transition-colors font-oxanium">
                    Features
                </a>
                <a href="#examples" className="text-gray-300 hover:text-cyan-400 transition-colors font-oxanium">
                    Examples
                </a>
                <Link to="/login" className="text-gray-300 hover:text-cyan-400 transition-colors font-oxanium">
                    Login
                </Link>
                {/* Sign up button styled differently */}
                <Link
                    to="/signup"
                    className="bg-white/10 hover:bg-white/20 border border-transparent text-cyan-300 font-semibold py-2 px-4 rounded-md shadow-sm transition-all duration-300 ease-in-out text-xs sm:text-sm font-oxanium"
                >
                    Sign Up
                </Link>
            </div>
        </nav>
    );
}


export default function LandingPage() {
    // Ref for the Swiper container element
    const swiperRef = useRef(null);

    // Effect hook to initialize and destroy the Swiper instance
    useEffect(() => {
        // Ensure Swiper container ref is available
        if (!swiperRef.current) return;

        // Initialize Swiper
        const swiperInstance = new Swiper(swiperRef.current, {
            loop: true,
            slidesPerView: 1,
            spaceBetween: 20,
            autoplay: { delay: 4000, disableOnInteraction: false },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        });

        // Cleanup function
        return () => {
            swiperInstance.destroy(true, true);
        };
    }, []);

    return (
        // Original main container allows natural content flow and scrolling
        <div className="container mx-auto px-4 pt-6 pb-10 sm:pb-16">

            <Navbar />

            {/* Hero Section */}
            <div
                className="hero-bg mb-16" // Uses styles from LandingPage.css
                style={{ backgroundImage: `url('${heroBgImage}')` }} // Applies the image using inline style
            >
                {/* Overlay Div */}
                <div className="absolute inset-0 bg-opacity-60 z-0 backdrop-blur-sm"></div>
                {/* Content Div */}
                <div className="relative z-10 flex flex-col items-center text-center px-4 py-8">
                    <h1 className="font-zen-dots text-4xl sm:text-5xl md:text-6xl font-bold text-cyan-300 drop-shadow-lg">
                        One-Stop Event Planner
                    </h1>
                    <p className="mt-4 text-lg sm:text-xl text-gray-300 max-w-xl md:max-w-2xl">
                        Use our AI chatbot to instantly design unique and engaging game events, from tournaments to community nights. Get tailored plans, schedules, and ideas in minutes.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-4 items-center">
                        <Link
                            to="/#"
                            className="font-oxanium w-45 bg-cyan-500 border-3 border-double hover:bg-cyan-400 text-[#111827] font-semibold py-3 px-8 rounded-md shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#16213e] focus:ring-cyan-400"
                        >
                            Book Events
                        </Link>
                    </div>
                    <br/>
                    <Link
                        to="/planner"
                        className="font-oxanium bg-cyan-500 hover:bg-cyan-400 text-[#111827] font-semibold py-3 px-8 rounded-md shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#16213e] focus:ring-cyan-400"
                    >
                        Start Planning with AI
                    </Link>
                </div>
            </div>

            {/* Example Concepts Swiper Section */}
            <div id="examples" className="mb-12 sm:mb-16">
                <h2 className="font-oxanium text-3xl font-semibold text-center text-cyan-400 mb-8">
                    Example Event Concepts
                </h2>

                {/* --- Wrapper Div to constrain Swiper width --- */}
                <div className="max-w-5xl mx-auto">
                    {/* Swiper container */}
                    <div ref={swiperRef} className="swiper themed-swiper rounded-lg overflow-hidden border border-white/10 shadow-lg">
                        <div className="swiper-wrapper">
                            {/* Swiper Slides - NOTE: These image paths might also need correction */}
                            {/* If images are in public/assets/, paths should be /assets/image-X.png */}
                            <div className="swiper-slide bg-black/20"><img src="/assets/image-5.png"
                                                                           alt="AI Generated Event Schedule Concept"
                                                                           className="w-full h-64 sm:h-80 md:h-96 object-fill"/>
                            </div>
                            <div className="swiper-slide bg-black/20"><img src="/assets/image-1.png"
                                                                           alt="Game Tournament Concept Art"
                                                                           className="w-full h-64 sm:h-80 md:h-96 object-cover"/>
                            </div>
                            <div className="swiper-slide bg-black/20"><img src="/assets/image-2.png"
                                                                           alt="Community Game Night Setup"
                                                                           className="w-full h-64 sm:h-80 md:h-96 object-cover"/>
                            </div>
                            <div className="swiper-slide bg-black/20"><img src="/assets/image-3.png"
                                                                           alt="Esports Arena Lighting"
                                                                           className="w-full h-64 sm:h-80 md:h-96 object-cover"/>
                            </div>
                        </div>
                        <div className="swiper-pagination"></div>
                        <div className="swiper-button-prev"></div>
                        <div className="swiper-button-next"></div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div id="features" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-12 sm:mb-16">
                {/* Feature Card 1 */}
                <div className="flex flex-col items-center bg-gradient-to-br from-[rgba(30,41,59,0.7)] to-[rgba(15,23,42,0.7)] backdrop-blur-sm border border-white/10 rounded-lg p-6 sm:p-8 shadow-lg transform hover:scale-[1.03] hover:shadow-cyan-500/10 transition-all duration-300 ease-in-out text-center">
                    <div className="w-12 h-12 mb-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400"><ClockIcon /></div>
                    <h3 className="font-oxanium text-xl font-semibold mb-2 text-gray-100">Instant Event Blueprints</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">Get complete game event plans generated by AI in seconds, tailored to your game and audience.</p>
                    <Link to="/planner" className="font-oxanium mt-auto text-cyan-400 hover:text-cyan-300 font-medium transition-colors duration-200">Try the AI Planner &rarr;</Link>
                </div>
                {/* Feature Card 2 */}
                <div className="flex flex-col items-center bg-gradient-to-br from-[rgba(30,41,59,0.7)] to-[rgba(15,23,42,0.7)] backdrop-blur-sm border border-white/10 rounded-lg p-6 sm:p-8 shadow-lg transform hover:scale-[1.03] hover:shadow-cyan-500/10 transition-all duration-300 ease-in-out text-center">
                    <div className="w-12 h-12 mb-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400"><SparklesIcon /></div>
                    <h3 className="font-oxanium text-xl font-semibold mb-2 text-gray-100">Unique Game Concepts</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">Discover fresh ideas for tournament formats, community challenges, and themed game nights suggested by our AI.</p>
                    <a href="#examples" className="font-oxanium mt-auto text-cyan-400 hover:text-cyan-300 font-medium transition-colors duration-200">See Example Events &rarr;</a>
                </div>
                {/* Feature Card 3 */}
                <div id="how-it-works" className="flex flex-col items-center bg-gradient-to-br from-[rgba(30,41,59,0.7)] to-[rgba(15,23,42,0.7)] backdrop-blur-sm border border-white/10 rounded-lg p-6 sm:p-8 shadow-lg transform hover:scale-[1.03] hover:shadow-cyan-500/10 transition-all duration-300 ease-in-out text-center">
                    <div className="w-12 h-12 mb-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400"><CogIcon /></div>
                    <h3 className="font-oxanium text-xl font-semibold mb-2 text-gray-100">Tailored for Your Game</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">Our AI understands different game genres and communities. Fine-tune plans for your specific needs.</p>
                    <a href="#features" className="font-oxanium mt-auto text-cyan-400 hover:text-cyan-300 font-medium transition-colors duration-200">How It Works &rarr;</a>
                </div>
                {/* Feature Card 4 */}
                <div id="community" className="flex flex-col items-center bg-gradient-to-br from-[rgba(30,41,59,0.7)] to-[rgba(15,23,42,0.7)] backdrop-blur-sm border border-white/10 rounded-lg p-6 sm:p-8 shadow-lg transform hover:scale-[1.03] hover:shadow-cyan-500/10 transition-all duration-300 ease-in-out text-center">
                    <div className="w-12 h-12 mb-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400"><UsersIcon /></div>
                    <h3 className="font-oxanium text-xl font-semibold mb-2 text-gray-100">Engage Your Players</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">Design events that boost player engagement, build community, and create memorable gaming experiences.</p>
                    <a href="#features" className="font-oxanium mt-auto text-cyan-400 hover:text-cyan-300 font-medium transition-colors duration-200">Community Features &rarr;</a>
                </div>
            </div>

            {/* Footer Section */}
            <footer className="text-center text-gray-400 py-6 border-t border-white/10">
                <p className="text-sm">&copy; 2025 Futura AI Game Events. All Rights Reserved.</p>
            </footer>
        </div>
    );
}