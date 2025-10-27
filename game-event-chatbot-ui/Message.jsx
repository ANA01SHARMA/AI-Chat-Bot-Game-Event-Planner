// src/components/Message.jsx
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Plugin for GitHub Flavored Markdown (tables, strikethrough, etc.)
import remarkBreaks from 'remark-breaks'; // Plugin to treat single line breaks as <br>
// No CSS import needed here - styles are in src/css/PlannerPage.css

/**
 * Message Component
 * Renders a single chat message, distinguishing between user and model roles.
 * Uses ReactMarkdown to format message content.
 */
export default function Message({ msg }) {
    // Determine the icon based on the message role
    const Icon = msg.role === 'model' ? Bot : User;
    // Determine the main CSS class based on the role
    const messageClass = msg.role === 'user' ? 'message-user' : 'message-model';
    // Determine the icon CSS class based on the role
    const iconClass = msg.role === 'model' ? 'icon-model' : 'icon-user';

    return (
        // Apply base 'message' class and role-specific class ('message-user' or 'message-model')
        <div className={`message ${messageClass}`}>
            {/* Icon container */}
            <div className="message-icon">
                {/* Render the appropriate icon with its specific class */}
                <Icon className={`${iconClass}`} />
            </div>
            {/* Message content container */}
            {/* min-w-0 prevents flex items from overflowing their container */}
            <div className="message-content min-w-0">
                {/* Use ReactMarkdown to render content */}
                <ReactMarkdown
                    // Enable GFM features and line breaks
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    // Customize rendering of specific HTML elements
                    components={{
                        // Use base styles defined in PlannerPage.css for these elements
                        // ReactMarkdown will apply the necessary Tailwind classes based on the CSS file
                        pre: ({ node, ...props }) => <pre className="whitespace-pre-wrap" {...props} />, // Ensure pre wraps
                        code: ({ node, inline, className, children, ...props }) => {
                            // Basic code styling, potentially enhance with syntax highlighting library later
                            return <code className={`${className || ''}`} {...props}>{children}</code>;
                        },
                        ul: ({ node, ...props }) => <ul {...props} />,
                        ol: ({ node, ...props }) => <ol {...props} />,
                        li: ({ node, ...props }) => <li {...props} />,
                        p: ({ node, ...props }) => <p {...props} />,
                        h1: ({ node, ...props }) => <h1 {...props} />,
                        h2: ({ node, ...props }) => <h2 {...props} />,
                        h3: ({ node, ...props }) => <h3 {...props} />,
                        strong: ({ node, ...props }) => <strong {...props} />,

                        // --- Table Styling ---
                        // Wrap table in a div with a specific class for horizontal scrolling
                        table: ({ node, ...props }) => (
                            <div className="table-scroll-wrapper"> {/* Class defined in PlannerPage.css */}
                                <table {...props} />
                            </div>
                        ),
                        // Use base styles from PlannerPage.css for table elements
                        thead: ({ node, ...props }) => <thead {...props} />,
                        tbody: ({ node, ...props }) => <tbody {...props} />,
                        tr: ({ node, ...props }) => <tr {...props} />,
                        th: ({ node, ...props }) => <th {...props} />,
                        td: ({ node, ...props }) => <td {...props} />,
                    }}
                >
                    {/* The actual message content string */}
                    {msg.content}
                </ReactMarkdown>
            </div>
        </div>
    );
}
