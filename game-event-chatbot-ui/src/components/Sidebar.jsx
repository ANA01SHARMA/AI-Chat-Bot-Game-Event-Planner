// src/components/Sidebar.jsx
import React from 'react';
// No CSS import needed here - styles are in src/css/PlannerPage.css

/**
 * Sidebar Component
 * Displays the application title, description, and AI model selection controls.
 */

// --- Constants ---
// Options for the AI model selection dropdown
const MODEL_OPTIONS = [
    { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
    { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
    { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' }, // Example model
];

export default function Sidebar({ model, setModel }) {
    return (
        // Sidebar container - uses 'sidebar' class from PlannerPage.css
        <aside className="sidebar">
            {/* Header section */}
            <header className="sidebar-header">
                {/* Title - uses 'sidebar-title' and explicit 'font-zen-dots' class */}
                <h1 className="sidebar-title font-zen-dots">
                    GAME EVENT PLANNER
                </h1>
                {/* Subtitle */}
                <p className="sidebar-subtitle">Craft Epic Gaming Moments</p>
            </header>

            {/* Description section */}
            <div className="sidebar-description">
                <p className="mb-3">
                    Initiate planning protocol. Define your <span className="highlight-keyword">objective</span>: game type, desired <span className="highlight-keyword">theme</span>, player count, and crucial <span className="code-style font-oxanium">{"// directives"}</span>. {/* Explicit font class */}
                </p>
                <p>
                    The <span className="highlight-cyan">AI Architect</span> processes the data, generating a strategic <span className="code-style font-oxanium">{"[Event_Plan]"}</span> with timelines & creative modules. {/* Explicit font class */}
                </p>
            </div>

            {/* Controls section */}
            <div className="sidebar-controls">
                {/* Label for the dropdown */}
                <label htmlFor="model-select" className="sidebar-label">
                    Select AI Model:
                </label>
                {/* Model selection dropdown */}
                <select
                    id="model-select"
                    value={model} // Controlled component value
                    onChange={(e) => setModel(e.target.value)} // Update state on change
                    className="model-select" // Apply styles from PlannerPage.css
                    aria-label="Select AI Model"
                >
                    {/* Map through options to create <option> elements */}
                    {MODEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {/* Helper text below the dropdown */}
                <p className="sidebar-help-text">
                    Flash models are faster; Pro may offer higher quality. Choose based on your needs.
                </p>
            </div>
        </aside>
    );
}

