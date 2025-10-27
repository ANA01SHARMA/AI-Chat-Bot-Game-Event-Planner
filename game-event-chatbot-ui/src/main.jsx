import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css'; // <-- Import minimal global styles + Tailwind directives

/**
 * Main entry point for the React application.
 * Sets up StrictMode and BrowserRouter.
 * Renders the root App component into the DOM.
 * Imports the main global CSS file (index.css).
 */
createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
);