// src/components/Chat.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
// Import icons from lucide-react
import { Loader2, Trash2, MoreVertical, ArrowUp, AlertTriangle, Zap, RotateCw, Home } from 'lucide-react'; // Added Home icon
import { Link } from 'react-router-dom'; // Added Link import
// Import the Message component
import Message from './Message.jsx';
// No CSS import needed here - styles are in src/css/PlannerPage.css

/**
 * Chat Component
 * Handles the main chat interface, including sending messages,
 * displaying conversation history, loading states, errors, and prompt starters.
 */

// --- Constants ---
// Example prompts to help users get started
const PROMPT_STARTERS = [
    "A state-level Taekwondo competition featuring sparring and forms for all skill levels.",
    "Plan a cooperative gaming session at LPU Punjab for freshers tomorrow night.",
    "Outline a schedule for a one-day live stream featuring multiple cricket-based events.",
    "Organize a birthday party with indoor games and activities, under a 5k INR budget."
];

export default function Chat({ model }) {
    // --- State Variables ---
    const [prompt, setPrompt] = useState(''); // Current user input
    const [messages, setMessages] = useState(() => { // Chat history
        const stored = localStorage.getItem('chat_messages'); // Load from localStorage
        try { return stored ? JSON.parse(stored) : []; } catch (e) { console.error("Failed to parse messages from localStorage", e); return []; }
    });
    const [loading, setLoading] = useState(false); // API loading state
    const [error, setError] = useState(null); // API error message
    const [eventName, setEventName] = useState(() => localStorage.getItem('event_name') || null); // Extracted event name
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for options dropdown

    // --- Refs ---
    const messagesEndRef = useRef(null); // Ref to scroll to bottom of messages
    const scrollContainerRef = useRef(null); // Ref to the scrollable message area
    const dropdownRef = useRef(null); // Ref for the options dropdown menu
    const textareaRef = useRef(null); // Ref for the input textarea

    // --- Effects ---

    // Scroll to the bottom when new messages are added
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messages]); // Dependency: messages array

    // Save messages to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('chat_messages', JSON.stringify(messages));
    }, [messages]); // Dependency: messages array

    // Save event name to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('event_name', eventName || '');
    }, [eventName]); // Dependency: eventName

    // Handle clicking outside the dropdown menu to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        // Add event listener on mount
        document.addEventListener('mousedown', handleClickOutside);
        // Remove event listener on unmount
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []); // Empty dependency array: runs only on mount/unmount

    // Callback hook for handling textarea auto-resizing
    const handleInput = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height to calculate scrollHeight correctly
            const style = getComputedStyle(textarea);
            const paddingTop = parseFloat(style.paddingTop);
            const paddingBottom = parseFloat(style.paddingBottom);
            const verticalPadding = paddingTop + paddingBottom;
            // Use a reasonable default line height or calculate dynamically if needed
            const lineHeight = parseFloat(style.lineHeight) || 20; // Adjust line height if necessary
            const maxHeight = 6 * lineHeight + verticalPadding; // Max height for approx 6 lines
            const scrollHeight = textarea.scrollHeight;

            // Calculate new height, constrained by maxHeight
            const newHeight = Math.min(scrollHeight, maxHeight);
            textarea.style.height = `${newHeight}px`;

            // Show scrollbar only if content exceeds max height
            textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
        }
    }, []); // No dependencies, the function itself doesn't change

    // Adjust textarea height on initial load and when prompt changes
    useEffect(() => {
        handleInput();
    }, [prompt, handleInput]); // Dependencies: prompt, handleInput callback

    // --- Core API Call Logic ---
    /**
     * Sends the user prompt and conversation history to the backend API.
     * Handles streaming responses and updates the message state.
     * Manages loading and error states.
     * @param {string} promptToSubmit - The user prompt to send.
     * @param {Array} messagesBeforeSubmit - The message history before this submission.
     */
    const triggerSubmit = async (promptToSubmit, messagesBeforeSubmit) => {
        setLoading(true);
        setError(null); // Clear previous errors

        // Add user message optimistically
        const newUserMessage = { role: 'user', content: promptToSubmit };
        setMessages(prev => [...prev, newUserMessage]);

        // Prepare message history for API payload
        const messagesForAPI = [...messagesBeforeSubmit, newUserMessage];

        let assistantContent = ''; // Accumulate streamed content
        let currentModelResponse = { role: 'model', content: '' }; // Placeholder for model response
        let modelMessageIndex = -1; // Index to update the streaming message
        let fetchError = null; // Variable to store error within the try block

        try {
            // Make POST request to the backend endpoint
            // Use relative path '/plan-event' if using Vite proxy, otherwise full URL
            const response = await fetch('/plan-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messagesForAPI,
                    model: model || 'gemini-1.5-flash', // Send selected model
                    stream: true, // Request streaming response
                }),
            });

            // Handle HTTP errors
            if (!response.ok) {
                let errorDetail = `HTTP error! Status: ${response.status}`;
                try {
                    // Try to parse JSON error detail from response body
                    const errorData = await response.json();
                    errorDetail = errorData.detail || JSON.stringify(errorData);
                } catch (jsonError) {
                    try {
                        // Fallback to parsing plain text error detail
                        const errorText = await response.text();
                        if (errorText) errorDetail = errorText;
                    } catch (textError) { /* Ignore secondary error */ }
                }
                throw new Error(errorDetail); // Throw error to be caught below
            }

            // Check if response body exists
            if (!response.body) {
                throw new Error('Response body is missing.');
            }

            // Get reader and decoder for streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            // Add the initial empty model message placeholder and get its index
            setMessages(prev => {
                modelMessageIndex = prev.length;
                return [...prev, currentModelResponse];
            });

            // Process the stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) break; // Exit loop when stream is finished

                // Decode chunk and append to accumulated content
                const chunk = decoder.decode(value, { stream: true });
                assistantContent += chunk;
                currentModelResponse.content = assistantContent; // Update content object

                // Update the specific model message in the state by its index
                setMessages(prev => {
                    const updated = [...prev];
                    if (modelMessageIndex >= 0 && modelMessageIndex < updated.length) {
                        // Update the content of the message at the tracked index
                        updated[modelMessageIndex] = { ...updated[modelMessageIndex], content: assistantContent };
                    } else {
                        // Log a warning if the index is somehow invalid
                        console.warn("Model message index out of bounds during stream update.");
                    }
                    return updated;
                });

                // --- Event Name Extraction ---
                // Attempt to extract event name from the streamed content (simple regex example)
                // This regex looks for lines starting like "## Event: Event Name" or "# Event Name: Name"
                const eventNameMatch = assistantContent.match(/^(?:#+\s*Event(?: Name)?[:\s]*)(.+)/im);
                if (eventNameMatch && eventNameMatch[1]) {
                    // Trim whitespace and remove potential markdown bolding (**)
                    const newName = eventNameMatch[1].trim().replace(/\*+/g, '');
                    // Update state only if a valid name is found and it's different
                    if (newName && newName !== eventName) {
                        setEventName(newName);
                    }
                }
            }
            setError(null); // Clear error state on successful completion

        } catch (error) {
            fetchError = error; // Store error
            console.error("API Error in triggerSubmit:", fetchError);
            const errorMsg = fetchError.message || 'Something went wrong fetching the plan.';
            setError(errorMsg); // Set component error state

            // Remove the placeholder model message if it was added
            if (modelMessageIndex !== -1) {
                setMessages(prev => prev.filter((_, i) => i !== modelMessageIndex));
            }
            // Add a specific error message object to the chat history
            setMessages(prev => [...prev, { role: 'error', content: errorMsg }]);

        } finally {
            setLoading(false); // Stop loading indicator
            // Focus input only if the submission process completed without errors
            if (!fetchError) {
                // Use setTimeout to ensure focus happens after potential state updates
                setTimeout(() => textareaRef.current?.focus(), 0);
            }
        }
    };

    // --- Event Handlers ---

    /** Handles form submission (sending the prompt) */
    const handleSubmit = async (e) => {
        if (e) e.preventDefault(); // Prevent default form submission
        if (loading) return; // Don't submit if already loading
        const trimmedPrompt = prompt.trim();
        if (!trimmedPrompt) return; // Don't submit empty prompts

        setPrompt(''); // Clear input field immediately
        // Reset textarea height after submission
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.overflowY = 'hidden';
        }

        // Call the API function, passing the current message history
        await triggerSubmit(trimmedPrompt, messages);
    };

    /** Handles resending a message that previously resulted in an error */
    const handleResend = (errorIndex) => {
        // Find the user message that came before the error message
        const userMessageIndex = errorIndex - 1;
        if (userMessageIndex >= 0 && messages[userMessageIndex]?.role === 'user') {
            const userPromptToResend = messages[userMessageIndex].content;
            // Get the message history *before* the failed attempt
            const messagesBeforeFailedAttempt = messages.slice(0, userMessageIndex);

            // Update state to remove the failed user message and the error message
            setMessages(messagesBeforeFailedAttempt);

            // Trigger the submission again with the correct history
            triggerSubmit(userPromptToResend, messagesBeforeFailedAttempt);
        } else {
            console.error("Could not find the user message preceding the error to resend.");
            // Optionally show a user-facing error message here
            alert("Error: Could not identify the message to resend.");
        }
    };

    /** Handles clearing the entire chat history and resetting state */
    const handleClearChat = () => {
        // Confirm with the user before clearing
        if (window.confirm('Are you sure you want to clear the chat history? This cannot be undone.')) {
            // Clear localStorage
            localStorage.removeItem('chat_messages');
            localStorage.removeItem('event_name');
            // Reset component state
            setMessages([]);
            setEventName(null);
            setError(null);
            setPrompt('');
            setIsDropdownOpen(false); // Close dropdown
            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.overflowY = 'hidden';
            }
            // Focus the input field
            textareaRef.current?.focus();
        }
    };

    /** Handles clicking on a prompt starter button */
    const handlePromptStarterClick = (starterText) => {
        setPrompt(starterText); // Set input value
        textareaRef.current?.focus(); // Focus input
        // Adjust textarea height after state update and focus
        setTimeout(handleInput, 0);
    };

    /** Handles key down events in the textarea (for Enter submission) */
    const handleKeyDown = (e) => {
        // Submit on Enter key press unless Shift key is also held
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent newline insertion
            handleSubmit(); // Trigger form submission
        }
    };

    // --- Rendering ---
    return (
        // Main chat container - uses 'chat-container' class from PlannerPage.css
        <main className="chat-container">
            {/* Chat Header */}
            {/* Updated chat-header to include space-between and items-center */}
            <header className="chat-header">
                {/* Back to Home Link */}
                <Link to="/" className="chat-home-link" aria-label="Back to Home">
                    <Home /> {/* Home icon */}
                </Link>
                {/* Chat Title - uses explicit 'font-oxanium' class */}
                <h2 className="chat-title font-oxanium">
                    {eventName || <span className="chat-title-placeholder">New Event Plan</span>}
                </h2>
                {/* Options Dropdown */}
                <div className="chat-dropdown-wrapper" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="chat-menu-button"
                        aria-label="Options menu" aria-haspopup="true" aria-expanded={isDropdownOpen}
                    >
                        <MoreVertical /> {/* Options icon */}
                    </button>
                    {/* Dropdown Menu (conditionally rendered) */}
                    {isDropdownOpen && (
                        <div className="chat-dropdown-menu" role="menu" aria-orientation="vertical">
                            {/* Clear Chat Button */}
                            <button onClick={handleClearChat} className="chat-dropdown-item" role="menuitem">
                                <Trash2 className="chat-dropdown-item-icon"/> Clear Chat
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Scrollable Message Area */}
            <div className="chat-scroll-area" ref={scrollContainerRef}>
                {/* Inner container for centering content */}
                <div className="chat-content-container">
                    {/* Prompt Starters (shown only if no messages and not loading) */}
                    {!loading && messages.length === 0 && (
                        <div className="prompt-starters-container">
                            <h3 className="prompt-starters-title">
                                <Zap className="w-5 h-5 mr-2 text-yellow-400" /> Get Started
                            </h3>
                            <div className="prompt-starters-grid">
                                {PROMPT_STARTERS.map((text, index) => (
                                    <button
                                        key={index}
                                        className="prompt-starter-button"
                                        onClick={() => handlePromptStarterClick(text)}
                                    >
                                        {text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Render Chat Messages */}
                    {messages.map((msg, idx) => (
                        // Conditionally render error message component or standard message component
                        msg.role === 'error' ? (
                            <div key={`${idx}-error`} className="message-error-wrapper">
                                {/* Error message structure */}
                                <div className="message-error" role="alert">
                                    <div className="message-icon"><AlertTriangle className="icon-error"/></div>
                                    <div className="message-content">{msg.content}</div>
                                </div>
                                {/* Show Resend button only for the *last* message if it's an error and not currently loading */}
                                {idx === messages.length - 1 && !loading && (
                                    <button
                                        onClick={() => handleResend(idx)}
                                        className="message-error-resend-button"
                                        aria-label="Resend message"
                                    >
                                        <RotateCw className="w-3.5 h-3.5" /> Resend
                                    </button>
                                )}
                            </div>
                        ) : (
                            // Standard message component - use a more robust key
                            <Message key={`${idx}-${msg.role}-${msg.content.slice(0, 20)}`} msg={msg}/>
                        )
                    ))}

                    {/* Loading Indicators */}
                    {/* Show loading indicator when fetching the very first response */}
                    {loading && messages.length === 0 && (
                        <div className="message-loading"> <Loader2 /> <span>Generating plan...</span> </div>
                    )}
                    {/* Show loading indicator below messages during streaming, but NOT if the last message is just an empty placeholder */}
                    {loading && messages.length > 0 && !(messages[messages.length - 1]?.role === 'model' && messages[messages.length - 1]?.content === '') && (
                        <div className="message-loading"> <Loader2 /> <span>Generating plan...</span> </div>
                    )}

                    {/* Empty div at the end used as a scroll anchor */}
                    <div ref={messagesEndRef} style={{ height: '1px' }} />
                </div>
            </div>

            {/* Chat Input Area */}
            <div className="chat-input-wrapper">
                {/* Input Form */}
                <form onSubmit={handleSubmit} className="chat-input-form">
                    {/* Textarea for user input */}
                    <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onInput={handleInput} // Handle auto-resize while typing
                        onKeyDown={handleKeyDown} // Handle Enter key submission
                        placeholder="Describe your game event..."
                        className="chat-input" // Apply styles from PlannerPage.css
                        disabled={loading} // Disable input while loading
                        required // Make input required
                        rows={1} // Start with a single row
                        aria-label="Chat message input"
                        style={{ overflowY: 'hidden' }} // Initially hide scrollbar
                    />
                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !prompt.trim()} // Disable if loading or input is empty/whitespace
                        className="chat-submit" // Apply styles from PlannerPage.css
                        aria-label="Send message"
                    >
                        {/* Show loading spinner or send icon */}
                        {loading ? <Loader2 className="chat-submit-loading-icon"/> : <ArrowUp />}
                    </button>
                </form>
            </div>
        </main>
    );
}
