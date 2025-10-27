// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
    /**
     * Specifies the files where Tailwind should look for class names.
     * Includes the root HTML file and all JS/JSX files within the src directory.
     */
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    /**
     * Theme customization section.
     * 'extend' allows adding custom values without overriding defaults.
     */
    theme: {
        extend: {
            // Fonts are handled via explicit CSS classes in .css files
            // No fontFamily extensions needed here for this setup
        },
    },
    /**
     * Plugins section.
     * Includes plugins provided by the user.
     */
    plugins: [
        require('@tailwindcss/typography'), // Adds prose classes for typography styling
        require('tailwind-scrollbar')      // Adds scrollbar styling utilities
    ],
};
