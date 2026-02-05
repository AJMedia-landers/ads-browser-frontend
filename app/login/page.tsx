"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [isSignup, setIsSignup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Login form
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Signup form
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.success) {
                router.push("/");
                router.refresh();
            } else {
                setError(data.message || "Login failed");
            }
        } catch {
            setError("Login failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (signupPassword !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    email: signupEmail,
                    password: signupPassword,
                }),
            });

            const data = await response.json();

            if (data.success) {
                router.push("/");
                router.refresh();
            } else {
                setError(data.message || "Signup failed");
            }
        } catch {
            setError("Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-branding">
                <div className="branding-content">
                    <h1>AJ Media</h1>
                    <h2>URL Mapping Admin</h2>
                </div>
            </div>
            <div className="login-form-section">
                <div className="login-card">
                    <h2>Welcome back</h2>
                    <p className="login-subtitle">Sign in to your account to continue</p>

                    <div className="auth-tabs">
                        <button
                            className={`auth-tab ${!isSignup ? "active" : ""}`}
                            onClick={() => {
                                setIsSignup(false);
                                setError(null);
                            }}
                        >
                            Login
                        </button>
                        <button
                            className={`auth-tab ${isSignup ? "active" : ""}`}
                            onClick={() => {
                                setIsSignup(true);
                                setError(null);
                            }}
                        >
                            Sign Up
                        </button>
                    </div>

                    {error && (
                        <div className="auth-error">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {!isSignup ? (
                        <form onSubmit={handleLogin} className="auth-form">
                            <div className="form-group">
                                <label htmlFor="email">Email:</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Password:</label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? "Logging in..." : "Login"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSignup} className="auth-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="firstName">First Name:</label>
                                    <input
                                        id="firstName"
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        autoComplete="given-name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="lastName">Last Name:</label>
                                    <input
                                        id="lastName"
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        autoComplete="family-name"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="signupEmail">Email:</label>
                                <input
                                    id="signupEmail"
                                    type="email"
                                    value={signupEmail}
                                    onChange={(e) => setSignupEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="signupPassword">Password:</label>
                                <input
                                    id="signupPassword"
                                    type="password"
                                    value={signupPassword}
                                    onChange={(e) => setSignupPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm Password:</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? "Creating account..." : "Sign Up"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
