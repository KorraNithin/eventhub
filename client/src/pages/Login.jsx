import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthForm.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === "admin" ? "/admin/events" : "/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-icon">🎟️</div>
          <span className="auth-brand-name">EventHub</span>
        </div>

        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account to continue</p>

        {error && (
          <p className="auth-error" role="alert">
            ⚠️ {error}
          </p>
        )}

        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <div className="auth-input-wrap">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
            <span className="auth-input-icon">✉️</span>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <div className="auth-input-wrap">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
            <span className="auth-input-icon">🔒</span>
          </div>
        </div>

        <button type="submit" disabled={submitting}>
          {submitting && <span className="auth-spinner" />}
          {submitting ? "Signing in…" : "Sign In"}
        </button>

        <p className="auth-switch">
          Don&apos;t have an account?{" "}
          <Link to="/register">Create one free</Link>
        </p>
      </form>
    </div>
  );
}
