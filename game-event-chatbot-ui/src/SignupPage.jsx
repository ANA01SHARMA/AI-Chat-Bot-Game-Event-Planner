// src/pages/SignupPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        // --- Dummy Signup Logic ---
        // Replace this with your actual user creation logic
        console.log('Signup attempt:', { email, password });
        alert('Signup Successful! (Placeholder) Please login.');
        // Redirect to the login page after successful signup
        navigate('/login');
        // --- End Dummy Logic ---
    };

    return (
        // Full page container
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Form container with themed styling */}
            <div className="w-full max-w-md bg-gradient-to-br from-[rgba(30,41,59,0.8)] to-[rgba(15,23,42,0.8)] backdrop-blur-sm border border-white/10 rounded-lg shadow-xl p-8">
                {/* Page Title */}
                <h1 className="text-3xl font-bold text-center text-cyan-300 mb-8 font-oxanium">
                    Create Account
                </h1>

                {/* Signup Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Email Input */}
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/10 p-3 rounded-md text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#16213e] focus:ring-cyan-400 placeholder-gray-500"
                            placeholder="you@example.com"
                        />
                    </div>

                    {/* Password Input */}
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength="8" // Example validation
                            className="w-full bg-white/5 border border-white/10 p-3 rounded-md text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#16213e] focus:ring-cyan-400 placeholder-gray-500"
                            placeholder="•••••••• (min. 8 characters)"
                        />
                    </div>

                    {/* Confirm Password Input */}
                    <div>
                        <label
                            htmlFor="confirmPassword"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/10 p-3 rounded-md text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#16213e] focus:ring-cyan-400 placeholder-gray-500"
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Error Message Display */}
                    {error && (
                        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-md">
                            {error}
                        </p>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full font-oxanium bg-cyan-500 hover:bg-cyan-400 text-[#111827] font-semibold py-3 px-8 rounded-md shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#16213e] focus:ring-cyan-400"
                    >
                        Sign Up
                    </button>
                </form>

                {/* Link to Login */}
                <p className="mt-8 text-center text-sm text-gray-400">
                    Already have an account?{' '}
                    <Link
                        to="/login"
                        className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
                    >
                        Login here
                    </Link>
                </p>
                {/* Optional: Link back to Home */}
                <p className="mt-4 text-center text-sm text-gray-500">
                    <Link to="/" className="hover:text-gray-300 transition-colors duration-200">
                        &larr; Back to Home
                    </Link>
                </p>
            </div>
        </div>
    );
}