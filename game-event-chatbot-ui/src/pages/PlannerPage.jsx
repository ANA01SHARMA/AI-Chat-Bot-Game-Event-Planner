// src/pages/PlannerPage.jsx
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar.jsx'; // Import Sidebar component
import Chat from '../components/Chat.jsx';       // Import Chat component
// Import component-specific styles for the planner page
import '../css/PlannerPage.css';

/**
 * PlannerPage Component
 * Serves as the main container for the AI event planning interface.
 * It includes the Sidebar and Chat components.
 * Manages the state for the selected AI model.
 */
export default function PlannerPage() {
    // State hook for managing the selected AI model
    // Default model is set here
    const [model, setModel] = useState('gemini-2.0-flash'); // Default to a valid model

    return (
        // Main container for the planner layout
        // Uses 'app-container' class defined in PlannerPage.css for flex layout
        <div className="app-container">
            {/* Sidebar component - receives model state and setter function */}
            <Sidebar model={model} setModel={setModel} />

            {/* Container for the Chat component */}
            {/* flex-1 makes it take up remaining horizontal space */}
            {/* flex flex-col ensures internal elements stack vertically */}
            {/* overflow-hidden prevents this container from scrolling, chat area handles internal scroll */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Chat component - receives the currently selected model */}
                <Chat model={model} />
            </div>
        </div>
    );
}
