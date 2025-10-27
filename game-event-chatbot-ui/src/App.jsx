// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import PlannerPage from './pages/PlannerPage.jsx';
import LoginPage from './pages/LoginPage.jsx'; // Import LoginPage
import SignupPage from './pages/SignupPage.jsx'; // Import SignupPage
// No CSS imports here - handled by main.jsx (global) and page components

/**
 * Root application component.
 * Sets up the main routing structure using React Router.
 * - '/' route maps to the LandingPage.
 * - '/planner' route maps to the PlannerPage.
 * - '/login' route maps to the LoginPage.
 * - '/signup' route maps to the SignupPage.
 */
function App() {
    return (
        <Routes>
            {/* Route for the landing page */}
            <Route path="/" element={<LandingPage />} />
            {/* Route for the main planner interface */}
            <Route path="/planner" element={<PlannerPage />} />
            {/* Route for the login page */}
            <Route path="/login" element={<LoginPage />} />
            {/* Route for the signup page */}
            <Route path="/signup" element={<SignupPage />} />
            {/* Optional: Catch-all route for 404 Not Found pages */}
            {/* <Route path="*" element={<div>404 Not Found</div>} /> */}
        </Routes>
    );
}

export default App;