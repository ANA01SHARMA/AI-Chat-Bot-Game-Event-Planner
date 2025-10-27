🎲 AI Chat Bot Game Event Planner

This project is a full-stack application for generating detailed and creative game event plans using the Gemini AI models. It consists of a modern React/Vite frontend and a robust Python FastAPI backend, integrated to provide a comprehensive planning tool.

✨ Features (FastAPI Backend)

The backend is built with FastAPI and features efficient interaction with the Google Gemini API.

  * Dedicated AI Agent: Uses a constrained system prompt to ensure the AI's sole focus is on planning structured game events, using a required Markdown format starting with Event: [Generated Event Name].
  * Model Selection & Configuration: Defaults to the gemini-1.5-flash model but supports gemini-1.5-pro and gemini-2.0-flash.
  * Streaming Responses: Supports real-time text generation via StreamingResponse for chunks.
  * Context Management: Automatically prunes the oldest chat messages to keep the conversation within the model's maximum input token limit.
  * Request Caching (for supported models): Implements system prompt caching for the persistent system instruction to reduce latency and token usage, particularly for models like gemini-1.5-flash. The minimum size for a cacheable prompt is 32,768 tokens.
  * Rate Limiting: Enforces a default limit of 15 requests per minute using slowapi.
  * CORS Configuration: Allows specified origins (e.g., http://localhost:5173) to access the API.
  * Local Development Proxy: The Vite configuration includes a proxy to redirect /plan-event requests to the FastAPI server running on http://localhost:8000.

💻 Frontend Technology Stack

The user interface is a modern single-page application built with the following technologies:
  * Framework: React (version 19.1.0).
  * Build Tool: Vite (version 6.3.2).
  * Styling: Tailwind CSS (version 4.1.4).
  * Router: react-router-dom (version 7.5.1).
  * UI Components: lucide-react (icons) and swiper (sliders).
  * Markdown Rendering: react-markdown with remark-gfm and remark-breaks for enhanced GFM support.
  * Linting: ESLint configured with recommended rules for JavaScript, React Hooks, and React Refresh.

🛠️ Setup and Installation

Backend (API) Setup
1.  Dependencies: Ensure you have Python installed (the virtual environment uses Python 3.13.1).
2.  Install Packages: Install the required Python dependencies:
    bash
    pip install -r requirements.txt
    (Dependencies include fastapi, uvicorn, google-generativeai, pydantic, slowapi, and tenacity.)
3.  API Key Configuration: Create a file named .env and set your Gemini API Key and allowed frontend origins:
    env
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
    ALLOWED_ORIGINS="http://localhost:5173,https://ad5c-2405-201-a40c-7a94-d83-29fb-94cf-8347.ngrok-free.app"
4.  Run Backend (Development):
    bash
    python main.py
    The API runs on http://0.0.0.0:8000 with auto-reload.

Frontend (UI) Setup

1.  Install npm Packages: Navigate to the UI root directory and install dependencies:
    bash
    npm install
    (Development dependencies include @vitejs/plugin-react, tailwindcss, and eslint.)
2.  Run Frontend (Development):
    bash
    npm run dev
    The Vite development server runs on port 5173.
